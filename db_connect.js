/**
 * db_connect.js
 * This file is a node package that will establish the connection to the database 
 * as the user 'gdax_md'. This will be used by all the processes that will write
 * to the database.
 *
 * API:
 * db_connect.query(text, values, callback) -> make a query
 * db_connect.connnect(callback) -> steal a client
 */

const pg = require('pg');
var config = {
  user: 'gdax_md',
  database: 'mddb',
  password: 'gdax_md',
  host: '35.186.174.114',
  port: 5432,
  max: 10,
  idleTimeoutMillis: 30000,
};
const pool = new pg.Pool(config);
pool.on('error', function(err,client) {
  console.error('idle client error', err.message, err.stack);
});

module.exports.query = function (text, values, callback) {
  console.log('query:', text, values);
  return pool.query(text, values, callback);
};

module.exports.connect = function(callback) {
  return pool.connect(callback);
};
