/* TODO: add all the possible fields */
DROP TABLE IF EXISTS rawdata.messages;
CREATE TABLE rawdata.messages (
  msg_type CHAR(10) NOT NULL,
  time TIMESTAMPTZ NOT NULL,
  product_id CHAR(10) NOT NULL,
  sequence INTEGER,
  order_id CHAR(40),
  price FLOAT,
  order_size FLOAT,
  funds FLOAT,
  side CHAR(10),
  reason VARCHAR,
  exchange CHAR(20) NOT NULL,
  PRIMARY KEY(time, product_id, exchange)
);
GRANT SELECT ON rawdata.messages TO public;
GRANT INSERT ON rawdata.messages TO gdax_md;

