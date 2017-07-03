/**
 * gdax/quotes.js
 *
 * Grabs the orderbook from GDAX on every relevant message and records them here.
 */

const db = require('../db_connect');
const gdax_clients = require('./connection');
const gdax = require('gdax');
const ds = require('datastructures-js');

// An object whose keys are product names and whose values are the
// gdax connections for those products.
var connections = new Object();

// An object whose keys are product names and whose values are the
// last known orderbook.
var current_books = new Object(); 

// A queue to store messages while we load the orderbook.
var message_queue = ds.queue();

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
  if (data.type == 'match') {
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
