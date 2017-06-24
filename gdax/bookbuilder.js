/**
 * gdax/quotes.js
 *
 * Grabs the orderbook from GDAX on every relevant message and records them here.
 */

const db = require('../db_connect');
const gdax_clients = require('./connection');
const gdax = require('gdax');
const ds = require('datastructures-js');
const asynclock = require('async-lock');

const ASYNCKEY = 'ASYNCKEY';

/**
 * ORDERBOOKS
 *
 * sequence: the sequence number of the last update applied.
 * bids: a hashtable of bids where the keys are order ids.
 * asks: a hashtable of asks where the keys are order ids.
 */

/**
 * Returns an orderbook object from a gdax level 3 book.
 *
 * @param   raw_book  the orderbook in gdax api format.
 */
function create_orderbook(raw_book) {
  var orderbook = new Object();
  orderbook.sequence  = raw_book.sequence;
  orderbook.bids = ds.hashtable();
  orderbook.asks = ds.hashtable();
  for (var i in raw_book.bids) {
    var key = raw_book.bids[i][2];
    var value = [raw_book.bids[i][0], raw_book.bids[i][1]];
    orderbook.bids.put(key, value);
  }
  for (var i in raw_book.asks) {
    var key = raw_book.asks[i][2];
    var value = [raw_book.asks[i][0], raw_book.asks[i][1]];
    orderbook.asks.put(key, value);
  }
  return orderbook;
};


/**
 * Returns the updated orderbook.
 *
 * @param   orderbook the previous orderbook.
 * @param   message   the message to apply.
 */
function apply_message(orderbook, message) {
  if (message.sequence < orderbook.sequence) {
    return orderbook;
  }
  if (message.type == 'open') {
    // add the order to the book.
    var entry = [message.price, message.remaining_size];
    if (message.side == 'sell') {
      orderbook.asks.put(message.order_id, entry);
    } else {
      orderbook.bids.put(message.order_id, entry);
    }
  } else if (message.type == 'done') {
    // delete the order from the book.
    orderbook.bids.remove(message.order_id);
    orderbook.asks.remove(message.order_id);
  } else if (message.type == 'change') {
    // change the order in the book.
    if (orderbook.bids.contains(message.order_id)) {
      var entry = [message.price, message.new_size];
      orderbook.bids.puts(message.order_id, entry);
    } else if (orderbook.asks.contains(message.order_id)) {
      var entry = [message.price, message.new_size];
      orderbook.asks.puts(message.order_id, entry);
    }
  } else if (message.type == 'match') {
    // do whatever a trade needs you to do.
    if (message.side == 'buy') {
      var order = orderbook.bids.get(message.maker_order_id);
      var new_size = order[1] - message.size;
      if (new_size > 0) {
        var entry = [order[0], new_size];
      } else {
        orderbook.bids.remove(message.maker_order_id);
      }
    } else {
      var order = orderbook.asks.get(message.maker_order_id);
      var new_size = order[1] - message.size;
      if (new_size > 0) {
        var entry = [order[0], new_size];
      } else {
        orderbook.asks.remove(message.maker_order_id);
      }
    }
  }
  orderbook.sequence = message.sequence;
  return orderbook;
};


/**
 * Returns a function to connect to the client and call the callback.
 *
 * @param   product   the product for which to get the orderbook.
 * @param   callback  the callback function to call after execution.
 */
function orderbook_ws_open (product, callback) {
  var client = gdax.PublicClient(product);
  function ws_open_callback (data) {
    client.getProductOrderbook({'level': 3}, function (err, resp, data) {
      if (err) console.error(err);
      var orderbook = create_orderbook(data);
      callback(orderbook);
    });
  };
  return ws_open_callback;
};


/**
 * Plays back messages onto the orderbook.
 *
 * @param   orderbook       the orderbook onto which to play the messages.
 * @param   message_queue   a queue in which the messages are being played.
 * @param   sync            an object which holds a lock and an indicator
 *                          of whether or not the orderbook is initialized.
 */
function playback_messages(orderbook, message_queue, sync) {
  sync.lock.acquire(ASYNCKEY, function (done) {
    var msg = message_queue.dequeue();
    while (msg != null) {
      apply_message(orderbook, msg);
      msg = message_queue.dequeue();
    }
    sync.init = true;
    done();
  });
};


/**
 * Continually updates the product orderbook and puts it through to the
 * callback function.
 *
 * @param   product   the product id
 * @param   callback  the callback function (1 argument)
 */
function get_orderbook_stream(product, callback) {
  var client = gdax.PublicClient(product);
  var message_queue = ds.queue();
  var ws = new gdax.WebsocketClient([product]);
  var sync = {
    'lock': new asynclock(),
    'init': false,
  };
  function playback_cb(orderbook) {
    playback_messages(orderbook, message_queue, sync);
  };
  var open_callback = orderbook_ws_open(product, playback_cb); 
  ws.on('open', open_callback);
  ws.on('message', function (data) {
    sync.lock.acquire(ASYNCKEY, function (done) {
      if (sync.init) {
        apply_message(orderbook, data);
      } else {
        message_queue.enqueue(data);
      }
      done();
    });
  });
  ws.on('close', function (data) {
  });
  ws.on('error', function (err) {
    if (err) console.error(err);
  }
};




/**
 * Quotes:
 *
 * This section will write all quotes into the table 'rawdata.quotes'.
 * This takes all the messages that could potentially change the order book and records
 * the level 1 book into the database.
 */

/** 
 * Dummy placeholder function.
 *
 * @param  data   callback argument
 */
function init_ws(data) {
  console.log('websocket initiated', data);
};


/**
 * Filters for everything that can possibly change the orderbook. If a message
 * like this is seen, then makes a get_orderbook call to the exchange. This 
 * function then calls a database insert query and adds the orderbook for that
 * timestamp.
 *
 * @param  data   callback argument
 */
function parse_message(data) {
  var update_book = false;
  if (data.type == 'open') {

  }
  if (data.type == 'open' || data.type == 'match' || data.type == 'done'
      || data.type == 'change') {
    gdax_clients.publicClient.getProductOrderBook({'level': 1}, function (err, resp, book) {
      try {
      var insert_values = [
        book.sequence,
        data.time,
        book.bids[0][0],
        book.bids[0][1],
        book.bids[0][2],
        book.asks[0][0],
        book.asks[0][1],
        book.asks[0][2],
        data.product_id,
        'GDAX',
      ];
      }
      catch (err) {
        console.log(book);
        console.log(book.bids);
        console.log(book.asks);
        throw err;
      }
      db.query('INSERT INTO rawdata.quotes ('
                  + 'sequence, '
                  + 'time, '
                  + 'bid_price, '
                  + 'bid_size, '
                  + 'bid_orders, '
                  + 'ask_price, '
                  + 'ask_size, '
                  + 'ask_orders, '
                  + 'product_id, '
                  + 'exchange) '
              + 'VALUES ('
                  + '$1::bigint, '
                  + '$2::timestamp, '
                  + '$3::float, '
                  + '$4::float, '
                  + '$5::int, '
                  + '$6::float, '
                  + '$7::float, '
                  + '$8::int, '
                  + '$9::text, '
                  + '$10::text);',
          insert_values,
          function(err, result) {
            if (err) console.error('error',err);
          }
      );
    });
  }
};


/**
 * Error handler function.
 *
 * @param  error  callback argument
 */
function trades_error(error) {
  console.error(error);
};

/**
 * Starts the quotes table websocket connection.
 *
 * @param  products   a list of products for which you want data.
 */
function start_ws(products) {
  var trades_websocket = new gdax.WebsocketClient(products);
  trades_websocket.on('open', init_ws);
  trades_websocket.on('message', parse_message);
  trades_websocket.on('close', function (data) {
    console.log('websocket closed, reinitializing...', data);
    start_ws(products);
  });
  trades_websocket.on('error', trades_error);
};


// Gets the product list and then starts a websocket client.
gdax_clients.publicClient.getProducts(function (err, resp, data) {
  if (err) console.error(err);
  var products = data.map(function (d) {
    return d.id;
  });

  start_ws(products);
});
