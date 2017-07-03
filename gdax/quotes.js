/**
 * gdax/quotes.js
 *
 * Grabs the orderbook from GDAX on every relevant message and records them here.
 */

const db = require('../db_connect');
const gdax_clients = require('./connection');
const gdax = require('gdax');
const ds = require('datastructures');
const moment = require('moment');

const TIMEOUT = 400;

// An object whose keys are product names and whose values are the
// gdax connections for those products.
var connections = new Object();

// An object whose keys are product names and whose values are the
// last known orderbook.
var current_books = new Object(); 

// A queue to store messages while we load the orderbook.
var message_queue = new ds.queue();

/**
 * Quotes:
 *
 * This section will write all quotes into the table 'rawdata.quotes'.
 * This takes all the messages that could potentially change the order book and records
 * the level 1 book into the database.
 */


/**
 * Takes the orderbook and writes it as a query into the database.
 *
 * @param   err   the error message
 * @param   resp  the response json raw
 * @param   book  the book data
 */
function orderbook_callback(err, resp, book) {
  var insert_values = [
    book.sequence,
    moment().format(''),
    // data.time,
    book.bids[0][0],
    book.bids[0][1],
    book.bids[0][2],
    book.asks[0][0],
    book.asks[0][1],
    book.asks[0][2],
    'BTC-USD',
    // data.product_id,
    'GDAX',
  ];
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
};


/**
 * Queries the orderbook every quarter second and records
 * the inside market to the database.
 *
 * @param   client  the gdax client in which we call 
 *                  getProductOrderbook.
 */
function get_quotes(client) {
  client.getProductOrderBook({'level': 1}, orderbook_callback);
  setTimeout(function () {
    get_quotes(client);
  }, TIMEOUT);
};


var c = gdax_clients.publicClient;
get_quotes(c);
