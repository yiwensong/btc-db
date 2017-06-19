/**
 * connection.js
 *
 * This program will be for connecting to the GDAX data center.
 */

// Get API keys and connection to the GDAX server
apiDir = 'api-key/';
fs = require('fs');
var readMode = {'encoding' : 'utf8'}
var key = fs.readFileSync(apiDir + 'key', readMode).trim();
var b64secret = fs.readFileSync(apiDir + 'secret', readMode).trim();
var passphrase = fs.readFileSync(apiDir + 'passphrase', readMode).trim();

var Gdax = require('gdax');
var publicClient = new Gdax.PublicClient();
var apiURI = 'https://api.gdax.com';
var sandboxURI = 'https://api-public.sandbox.gdax.com';
var websocketURI = 'wss://ws-feed.gdax.com';
var authedClient = new Gdax.AuthenticatedClient(
    key, b64secret, passphrase, apiURI);

module.exports = {
  publicClient: publicClient,
  authedClient: authedClient,
}
