/**
 * gdax/quotes.js
 *
 * Grabs the orderbook from GDAX on every relevant message and records them here.
 */

const db = require('../db_connect');
const gdax_clients = require('./connection');
const gdax = require('gdax');
const ds = require('datastructures');
const asynclock = require('async-lock');

const ASYNCKEY = 'ASYNCKEY';

/**
 * ORDERBOOKS
 *
 * sequence: the sequence number of the last update applied.
 * bids: a hashtable of bids where the keys are order ids.
 * asks: a hashtable of asks where the keys are order ids.
 */

function Orderbook(raw_book) {
  this.sequence = raw_book.sequence;
  this.bids = new ds.heap();
  this.asks = new ds.heap();
  this.dict = new Object();

  for (var i in raw_book.bids) {
    var order = raw_book.bids[i];
    this.insert_order(order[2], order[0], order[1], 'bid');
  }
  for (var i in raw_book.asks) {
    var order = raw_book.bids[i];
    this.insert_order(order[2], order[0], order[1], 'ask');
  }
};


/**
 * Inserts an order into the book, but more taken apart.
 *
 * @param   id      the order id
 * @param   price   the price of the order
 * @param   size    the size of the order
 * @param   side    'bid' or 'ask'
 */
Orderbook.prototype.insert_order = function(id, price, size, side) {
  var entry = {
    id: id,
    price: price,
    size: size,
    side: side,
  };
  this.dict[id] = entry;
  if (side == 'bid') {
    this.bids.enqueue(entry, -price);
  } else if (side == 'ask') {
    this.asks.enqueue(entry, price);
  } else {
    throw 'unexpected order side: ' + side;
  }
};

/**
 * Inserts an order into the orderbook.
 *
 * @param   order   the message in which the order came.
 */
Orderbook.prototype.add_order = function(order) {
  var price = parseFloat(order.price);
  var size = parseFloat(order.remaining_size);
  var id = order.order_id;
  var side = order.side == 'sell' ? 'ask' : 'bid';
  this.insert_order(id, price, size, side);
};


/**
 * Removes an order-id and its associated order from the book.
 *
 * @param   id      the order id of the order to remove.
 */
Orderbook.prototype.remove_order = function(id) {
  this.dict[id].size = 0.0;
  delete this.dict[id];
  var side = this[this.dict[id].side + 's'];
  var tmp = side.peek();
  while (tmp.size == 0.0) {
    side.dequeue();
    tmp = side.peek();
  }
};


/**
 * Changes an existing order in the book.
 *
 * @param   order   the message in which the order came.
 */
Orderbook.prototype.change_order = function(order) {
  var entry = this.dict[order.order_id];
  entry.size = order.new_size;
};


/**
 * Handler for orderbook matches.
 *
 * @param   message   the match message being played.
 */
Orderbook.prototype.handle_match = function(message) {
  // What happens if I just return
  // I think we don't handle these because we will get a remove
  // or change every time we get one of these.
  //
  // var id = message.maker_order_id;
  // if (!(id in this.dict)) return;
  // var match_size = parseFloat(message.size);
  // var entry = this.dict[id];
  // if (entry.size == match_size) {
  //   this.remove_order(id);
  // } else if (entry.size > match_size) {
  //   entry.size -= match_size;
  // } else {
  //   throw 'Match size larger than order size.';
  // }
};

/**
 * Uses the information of the message to change the orderbook
 * accordingly.
 *
 * @param   message   the message being played.
 */
Orderbook.prototype.play_message = function(message) {
  if (parseInt(message.sequence) < parseInt(this.sequence)) return;
  if (message.type == 'open') {
    this.add_order(message);
  } else if (message.type == 'done') {
    if (!(message.order_id in this.dict)) return;
    this.remove_order(message.order_id);
  } else if (message.type == 'match') {
    this.handle_match(message);
  } else if (message.type == 'change') {
    if (!(message.order_id in this.dict)) return;
    this.change_order(message);
  } else if (message.type == 'received') {
    // do nothing
  } else {
    console.log('Unexpected message type: ' + message.type);
  }
  this.sequence = message.sequence;
};


/**
 * Returns the inside market of the orderbook.
 */
Orderbook.prototype.get_inside = function() {
  var best_bids = new ds.queue();
  best_bids.enqueue(this.bids.better_dequeue());
  var next_bb = this.bids.peek();
  while (next_bb.price == best_bid.price) {
    best_bids.enqueue(this.bids.better_dequeue());
    next_bb = this.bids.peek();
  }
  var best_bid_price = best_bids.peek()[0].price;
  var best_bid_size = 0.0;
  while (best_bids.size > 0) {
    var bid = best_bids.dequeue();
    best_bid_size += bid[0].size;
    this.bids.enqueue(bid[0], bid[1]);
  }
  var best_ask = this.asks.dequeue();
  while (best_bid.size == 0.0) best_bid = this.bids.dequeue();
  while (best_ask.size == 0.0) best_ask = this.asks.dequeue();
  this.bids.enqueue(best_bid, -best_bid.price);
  this.asks.enqueue(best_ask, best_ask.price);
};


// This is the old orderbook datastructure that has been deemed old and inefficient.
//
// /**
//  * Returns an orderbook object from a gdax level 3 book.
//  *
//  * @param   raw_book  the orderbook in gdax api format.
//  */
// function create_orderbook(raw_book) {
//   var orderbook = new Object();
//   orderbook.sequence  = raw_book.sequence;
//   orderbook.bids = new Object();
//   orderbook.asks = new Object();
//   for (var i in raw_book.bids) {
//     var key = raw_book.bids[i][2];
//     var value = [parseFloat(raw_book.bids[i][0]), parseFloat(raw_book.bids[i][1])];
//     orderbook.bids[key] = value;
//   }
//   for (var i in raw_book.asks) {
//     var key = raw_book.asks[i][2];
//     var value = [parseFloat(raw_book.asks[i][0]), parseFloat(raw_book.asks[i][1])];
//     orderbook.asks[key] = value;
//   }
//   return orderbook;
// };
// 
// 
// /**
//  * Returns the updated orderbook.
//  *
//  * @param   orderbook the previous orderbook.
//  * @param   message   the message to apply.
//  */
// function apply_message(orderbook, message) {
//   if (parseInt(message.sequence) < parseInt(orderbook.sequence)) {
//     return orderbook;
//   }
//   if (message.type == 'open') {
//     // add the order to the book.
//     var entry = [parseFloat(message.price), parseFloat(message.remaining_size)];
//     if (message.side == 'sell') {
//       orderbook.asks[message.order_id] = entry;
//     } else {
//       orderbook.bids[message.order_id] = entry;
//     }
//   } else if (message.type == 'done') {
//     // delete the order from the book.
//     if (message.order_id in orderbook.bids) {
//       delete orderbook.bids[message.order_id];
//     }
//     if (message.order_id in orderbook.asks) {
//       delete orderbook.asks[message.order_id];
//     }
//   } else if (message.type == 'change') {
//     // change the order in the book.
//     var entry = [parseFloat(message.price), parseFloat(message.new_size)];
//     if (message.order_id in orderbook.bids) {
//       orderbook.bids[message.order_id] = entry;
//     } else if (message.order_id in orderbook.asks) {
//       orderbook.asks[message.order_id] = entry;
//     }
//   } else if (message.type == 'match') {
//     // do whatever a trade needs you to do.
//     if (message.side == 'buy') {
//       var order = orderbook.bids[message.maker_order_id];
//       var new_size = order[1] - parseFloat(message.size);
//       if (new_size > 0) {
//         var entry = [order[0], new_size];
//         orderbook.bids[message.maker_order_id] = entry;
//       } else {
//         delete orderbook.bids[message.maker_order_id];
//       }
//     } else {
//       var order = orderbook.asks[message.maker_order_id];
//       var new_size = order[1] - parseFloat(message.size);
//       if (new_size > 0) {
//         var entry = [order[0], new_size];
//         orderbook.asks[message.maker_order_id] = entry;
//       } else {
//         delete orderbook.asks[message.maker_order_id];
//       }
//     }
//   }
//   orderbook.sequence = message.sequence;
//   return orderbook;
// };


/**
 * Returns a function to connect to the client and call the callback.
 *
 * @param   product   the product for which to get the orderbook.
 * @param   callback  the callback function to call after execution.
 */
function orderbook_ws_open (product, callback) {
  var client = new gdax.PublicClient(product);
  function ws_open_callback (data) {
    client.getProductOrderBook({'level': 3}, function (err, resp, data) {
      if (err) console.error(err);
      // var orderbook = create_orderbook(data);
      var orderbook = new Orderbook(data);
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
 * @param   sync            an object which holds a lock and a pointer to
 *                          the orderbook (or null).
 */
function playback_messages(orderbook, message_queue, sync) {
  sync.lock.acquire(ASYNCKEY, function (done) {
    var msg = message_queue.dequeue();
    while (msg != null) {
      // apply_message(orderbook, msg);
      orderbook.play_message(msg);
      msg = message_queue.dequeue();
    }
    sync.book = orderbook;
    // console.log(sync.book);
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
function orderbook_ws(product, callback) {
  var client = gdax.PublicClient(product);
  var message_queue = new ds.queue();
  var ws = new gdax.WebsocketClient([product]);
  var sync = {
    'lock': new asynclock(),
    'book': null,
  };
  function playback_cb(orderbook) {
    playback_messages(orderbook, message_queue, sync);
  };
  var open_callback = orderbook_ws_open(product, playback_cb); 
  ws.on('open', open_callback);
  ws.on('message', function (data) {
    sync.lock.acquire(ASYNCKEY, function (done) {
      if (sync.book != null) {
        console.log('apply',data.sequence);
        // apply_message(sync.book, data);
        sync.book.play_message(data);
      } else {
        console.log('queue',data.sequence);
        message_queue.enqueue(data);
      }
      done();
    });
    callback(sync.book);
  });
  ws.on('close', function (data) {
  });
  ws.on('error', function (err) {
    if (err) console.error(err);
  });
};

// Exports
module.exports = {
  orderbook_ws: orderbook_ws,
};


// Testing
var example_orderbooks = [
  {
    sequence: "12",
    bids: [ ['2525.71', '0.01', 'e9fdd413-641a-40c1-9d5a-95bf610dedfe' ],
            ['2525.42', '0.01', '1bdd20bf-fdda-4c1d-a2e5-11ad0c205223' ],
          ],
    asks: [ ['2525.86', '3.50310398', '12a651a5-e642-42e4-981c-840ae3eafbda' ],
            ['2525.86', '0.19472', 'c9abce9e-ec33-4c8f-b78d-2b7efbe53ad0' ],
          ],
  },
]

var msg_open = {
};

var msg_done = {
};

var msg_match = {
};

var msg_change = {
};

function test_add() {
  var test_ob = example_orderbooks[0];
  var new_order = msg_open;
}
