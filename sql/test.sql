DROP TABLE IF EXISTS rawdata.test;
CREATE TABLE rawdata.test (
  id SERIAL PRIMARY KEY,
  name VARCHAR,
  animal VARCHAR,
  age INTEGER,
  sex CHAR(1)
);
GRANT SELECT ON rawdata.test TO public;
GRANT INSERT ON rawdata.test TO gdax_md;
GRANT ALL PRIVILEDGES ON ALL SEQUENCES IN SCHEMA rawdata TO gdax_md;
