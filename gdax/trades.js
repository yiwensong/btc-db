/**
 * gdax_md.js
 *
 * Gets marketdata from the gdax server and performs INSERT into the database.
 */

const db = require('../db_connect');
// db.query('INSERT INTO rawdata.test(name, animal, age, sex) VALUES ($1::text, $2::text, $3::int, $4::text);',
//     ['yiwen','human',22,'M'],
//     function (err, result) {
//       if (err) console.error('error', err);
//     }
//     );
const gdax_clients = require('./connection');
const gdax = require('gdax');

/**
 * Trades:
 *
 * This section will write all trades into the table 'rawdata.trades'.
 * Takes all the MATCH messages from the socket and uses the info from those messages
 * to construct the insertions.
 */

/** 
 * Dummy placeholder function.
 *
 * @param  data   callback argument
 */
function init_trades(data) {
  console.log('trades websocket initiated', data);
};


/**
 * Filters out the messages that are 'match' and stores the information
 * in the table 'trades' of the schema 'rawdata'.
 *
 * @param  data   callback argument
 */
function parse_trade(data) {
  if (data.type != 'match') return;
  db.query('INSERT INTO rawdata.trades(trade_id, sequence, maker_order_id, taker_order_id, time,'
              + ' product_id, trade_size, price, side, exchange)'
              + ' VALUES ($1::int, $2::bigint, $3::text, $4::text, $5::timestamp, $6::text, $7::float, $8::float,'
              + ' $9::text, $10::text);',
            [data.trade_id, data.sequence, data.maker_order_id, data.taker_order_id, data.time,
             data.product_id, data.size, data.price, data.side, 'GDAX'],
            function(err, result) {
              if (err) console.error('error',err);
            }
          );
};


/**
 * On close, reinitializes a websocket connection.
 *
 * @param  data   callback argument
 */
function close_trades(data) {
  console.log('trades are closed', data);
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
 * Starts the trades table websocket connection.
 *
 * @param  products   a list of products for which you want data.
 */
function start_trades_ws(products) {
  var trades_websocket = new gdax.WebsocketClient(products);
  trades_websocket.on('open', init_trades);
  trades_websocket.on('message', parse_trade);
  trades_websocket.on('close', function (data) {
    console.log('websocket closed, reinitializing...', data);
    start_trades_ws(products);
  });
  trades_websocket.on('error', trades_error);
};


// Gets the product list and then starts a websocket client.
gdax_clients.publicClient.getProducts(function (err, resp, data) {
  if (err) console.error(err);
  var products = data.map(function (d) {
    return d.id;
  });

  start_trades_ws(products);
});
