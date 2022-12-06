import pg from "pg";
import express from "express";
import bodyParser from "body-parser";
import * as dotenv from 'dotenv'
// import jwt from 'jsonwebtoken'
dotenv.config()

const client = new pg.Client({
  user: 'lokkeroomdb_admin',
  host: 'localhost',
  database:"lokkeroomdb",
  password: `${process.env.MYSQL_PASSWORD}`,
  port: 5432,
})

client.connect();

const app = express()
app.use(bodyParser.json());

app.post('/register', (req, res) => {
  const { email, password } = req.body;
  client.query(`INSERT INTO users (email, password) VALUES ($1, $2)`, [email, password])
})

  app.listen(3000, () =>{
    console.log("Server running on port 3000")
})