"""dbconn.py

This file is a python api to connect to the database.
"""
import psycopg2
import pandas as pd

DB_CONFIG = {
  'user': 'readonlyuser',
  'database': 'mddb',
  'password': 'readonlyuser',
  'host': '35.186.174.114',
  'port': 5432,
};

def get_connection():
    """Returns a connection to the research database."""
    con = psycopg2.connect(**DB_CONFIG)
    return con

def query(statement, con=None, params=None):
    """Returns a dataframe that contains the results of the statement."""
    if con is None:
        con = get_connection()
    table = pd.io.sql.read_sql(statement, con, params=params)
    return table
