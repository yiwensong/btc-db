DROP TABLE IF EXISTS rawdata.ticks;
CREATE TABLE rawdata.ticks (
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
  PRIMARY KEY(time, product_id, exchange)
);
GRANT SELECT ON rawdata.ticks TO public;
GRANT INSERT ON rawdata.ticks TO gdax_md;

