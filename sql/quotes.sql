DROP TABLE IF EXISTS rawdata.quotes;
CREATE TABLE rawdata.quotes (
  sequence BIGINT NOT NULL,
  time TIMESTAMPTZ NOT NULL,
  bid_price FLOAT NOT NULL,
  bid_size FLOAT NOT NULL,
  bid_orders INT,
  ask_price FLOAT NOT NULL,
  ask_size FLOAT NOT NULL,
  ask_orders INT,
  product_id CHAR(10) NOT NULL,
  exchange CHAR(20) NOT NULL,
  PRIMARY KEY(sequence, time, product_id, exchange)
);
GRANT SELECT ON rawdata.quotes TO public;
GRANT INSERT ON rawdata.quotes TO gdax_md;

