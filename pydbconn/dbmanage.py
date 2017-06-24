"""dbmanage.py

A program to help manage the database.
"""
import psycopg2
import pandas as pd

ADMIN_CONFIG = {
  'user': 'postgres',
  'database': 'mddb',
  'password': 'postgres',
  'host': '35.186.174.114',
  'port': 5432,
};

def get_connection():
    """Returns a connection to the research database."""
    con = psycopg2.connect(**ADMIN_CONFIG)
    return con

def query(statement, con=None, params=None):
    """Returns a dataframe that contains the results of the statement."""
    if con is None:
        con = get_connection()
    table = pd.io.sql.read_sql(statement, con, params=params)
    return table

def run_sql_file(sql_fname, con=None):
    if con is None:
        con = get_connection()
    with open(sql_fname, 'r') as f:
        sql = f.read()
    cur = con.cursor()
    cur.execute(sql)
    con.commit()
