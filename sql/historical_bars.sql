DROP TABLE IF EXISTS rawdata.historical_bars;
CREATE TABLE rawdata.historical_bars (
  time TIMESTAMPTZ NOT NULL,
  product_id CHAR(10) NOT NULL,
  low FLOAT NOT NULL,
  high FLOAT NOT NULL,
  open FLOAT NOT NULL,
  close FLOAT NOT NULL,
  volume FLOAT NOT NULL,
  value FLOAT, 
  exchange CHAR(20) NOT NULL,
  PRIMARY KEY(time, product_id, exchange)
);
GRANT SELECT ON rawdata.historical_bars TO public;
GRANT INSERT ON rawdata.historical_bars TO bars_cron;
