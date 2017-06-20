/**
 * ticks.sql
 *
 * ticks keep track of every trade and every change of the
 * inside market.
 */
DROP TABLE IF EXISTS rawdata.ticks;
CREATE TABLE rawdata.ticks (
  time TIMESTAMPTZ NOT NULL,
  tick_type CHAR(10) NOT NULL,
  bid_price FLOAT,
  bid_size FLOAT,
  ask_price FLOAT,
  ask_size FLOAT,
  trade_price FLOAT,
  product_id CHAR(10) NOT NULL,
  exchange CHAR(20) NOT NULL,
  PRIMARY KEY(time, product_id, exchange)
);
GRANT SELECT ON rawdata.ticks TO public;
GRANT INSERT ON rawdata.ticks TO gdax_md;

