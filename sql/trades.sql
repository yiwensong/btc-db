/* trades.sql */
DROP TABLE IF EXISTS rawdata.trades;
CREATE TABLE rawdata.trades (
  trade_id BIGINT,
  sequence BIGINT NOT NULL,
  maker_order_id CHAR(36),
  taker_order_id CHAR(36),
  time TIMESTAMPTZ NOT NULL,
  product_id CHAR(10) NOT NULL,
  trade_size FLOAT NOT NULL,
  price FLOAT NOT NULL,
  side CHAR(4),
  exchange CHAR(20) NOT NULL,
  PRIMARY KEY(sequence, exchange, product_id)
);
GRANT SELECT ON rawdata.trades TO public;
GRANT INSERT ON rawdata.trades TO gdax_md;

