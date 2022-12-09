import pg from "pg";
import express from "express";
import bodyParser from "body-parser";
import bcrypt from "bcryptjs";
import * as dotenv from 'dotenv';
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
  const salt = bcrypt.genSaltSync(10);
  const hashPassword = bcrypt.hashSync(password, salt);
  client.query(`INSERT INTO users (email, password) VALUES ($1, $2)`, [email, hashPassword])
  res.send(`User ${email} added`)
})

app.post('/login', (req, res) => {
  const { email, password } = req.body;
  client.query(`SELECT * FROM users WHERE email = '${email}'`)
  .then ((result) => {
          if(result.rows[0] === undefined) {
            res.send(`User ${email} does not exist`);
          } else {
            const validPassword = bcrypt.compareSync(password, result.rows[0].password);
            if (validPassword){
              res.send(`You are logged in`)
            } else {
              res.send(`The password is not correct`);
            }
          }
  })
})

app.post('/lobby', (req, res) => {
  const { email, password } = req.body;
  client.query(`SELECT * FROM users WHERE email = '${email}'`)
  .then ((result) => {
          if(result.rows[0] === undefined) {
            res.send(`User ${email} does not exist`);
          } else {
            const validPassword = bcrypt.compareSync(password, result.rows[0].password);
            if (validPassword){
              client.query(`INSERT INTO lobbies (id_users) VALUES ($1) RETURNING id`, 
              [JSON.stringify(result.rows[0].id)], 
              (err, reslobby) => {
                if (err) throw err
                client.query(`INSERT INTO users_per_lobby (id_users, id_lobbies) VALUES ($1, $2) RETURNING id_lobbies`, 
                [(JSON.stringify(result.rows[0].id)), (JSON.stringify(reslobby.rows[0].id))],
                (err, resupl) => {
                  if (err) throw err
                  res.send({new_lobby: `User ${email} just create lobby n°${(JSON.stringify(reslobby.rows[0].id))}`, 
                  user_per_lobby:`User ${email} joined lobby n°${resupl.rows[0].id_lobbies}`})
                })
              })
            } else {
              res.send(`The password is not correct`);
            }
          }
  })
})

app.post('/lobby/:id', (req, res) => {
  const { email, password, content } = req.body;
  client.query(`SELECT * FROM users WHERE email = '${email}'`)
  .then ((result) => {
          if(result.rows[0] === undefined) {
            res.send(`User ${email} does not exist`);
          } else {
            const validPassword = bcrypt.compareSync(password, result.rows[0].password);
            if (validPassword){
              client.query(`SELECT * FROM users_per_lobby WHERE id_users = '${JSON.stringify(result.rows[0].id)}'`)
              .then ((resultupl) => {
                  if(JSON.stringify(resultupl.rows[0].id_lobbies) === req.params['id']) {
                    client.query(`INSERT INTO messages (id_users, id_lobbies, content) VALUES ($1, $2, $3) RETURNING id_users, id_lobbies, content`,
                    [(JSON.stringify(result.rows[0].id)), req.params['id'], content], 
                    (err, resmsg) => {
                      if (err) throw err
                      res.send(`User ${JSON.stringify(resmsg.rows[0].id_users)} sent a message in lobby n°${JSON.stringify(resmsg.rows[0].id_lobbies)} with content ${resmsg.rows[0].content}`)
                    }
                    )
               } else {
                res.send(`User ${email} does not have the permission to post messages in lobby n°${JSON.stringify(resultupl.rows[0].id_lobbies)} `)
               }
              })
            } else {
              res.send(`The password is not correct`);
            }
          }
  })
})

app.get('/lobby/:id', (req, res) => {
  const { email, password } = req.body;
  client.query(`SELECT * FROM users WHERE email = '${email}'`)
  .then ((result) => {
          if(result.rows[0] === undefined) {
            res.send(`User ${email} does not exist`);
          } else {
            const validPassword = bcrypt.compareSync(password, result.rows[0].password);
            if (validPassword){
              client.query(`SELECT * FROM users_per_lobby WHERE id_users = '${JSON.stringify(result.rows[0].id)}'`)
              .then ((resultupl) => {
                  if(JSON.stringify(resultupl.rows[0].id_lobbies) === req.params['id']) {
                    client.query(`SELECT * from messages WHERE id_lobbies = ${resultupl.rows[0].id_lobbies}`)
                    .then ((resultgetmsg) => {
                      res.send(resultgetmsg.rows)
                    })
               } else {
                res.send(`User ${email} does not have the permission to see messages from lobby n°${JSON.stringify(resultupl.rows[0].id_lobbies)} `)
               }
              })
            } else {
              res.send(`The password is not correct`);
            }
          }
  })
})


app.put('/lobby/:id/:msg', (req, res) => {
  const { email, password, content } = req.body;
  client.query(`SELECT * FROM users WHERE email = '${email}'`)
  .then ((result) => {
          if(result.rows[0] === undefined) {
            res.send(`User ${email} does not exist`);
          } else {
            const validPassword = bcrypt.compareSync(password, result.rows[0].password);
            if (validPassword){
              client.query(`SELECT * FROM users_per_lobby WHERE id_users = '${JSON.stringify(result.rows[0].id)}'`)
              .then ((resultupl) => {
                  if(JSON.stringify(resultupl.rows[0].id_lobbies) === req.params['id']) {
                    client.query(`SELECT * FROM messages WHERE id = ${req.params['msg']}`)
                    .then ((resultputmsg) => {
                      if(resultputmsg.rows[0].id_users === result.rows[0].id) {
                        client.query(`UPDATE messages SET content = $1 WHERE id = ${req.params['msg']}`, [content])
                        .then(() => {
                          res.send(`User ${email} edited message n°${req.params['msg']}, the new content is ${content}`)
                      })
                      } else {
                        res.send(`User ${email} does not have the permission to edit this message`)
                      }
                    })
               } else {
                res.send(`User ${email} does not have the permission to edit messages in lobby n°${JSON.stringify(resultupl.rows[0].id_lobbies)} `)
               }
              })
            } else {
              res.send(`The password is not correct`);
            }
          }
  })
})

app.get('/lobby/:id/:msg', (req, res) => {
  const { email, password } = req.body;
  client.query(`SELECT * FROM users WHERE email = '${email}'`)
  .then ((result) => {
          if(result.rows[0] === undefined) {
            res.send(`User ${email} does not exist`);
          } else {
            const validPassword = bcrypt.compareSync(password, result.rows[0].password);
            if (validPassword){
              client.query(`SELECT * FROM users_per_lobby WHERE id_users = '${JSON.stringify(result.rows[0].id)}'`)
              .then ((resultupl) => {
                  if(JSON.stringify(resultupl.rows[0].id_lobbies) === req.params['id']) {
                    client.query(`SELECT * from messages WHERE id = ${req.params['msg']}`)
                    .then ((resultgetmsg) => {
                      res.send(resultgetmsg.rows)
                    })
               } else {
                res.send(`User ${email} does not have the permission to see messages from lobby n°${JSON.stringify(resultupl.rows[0].id_lobbies)} `)
               }
              })
            } else {
              res.send(`The password is not correct`);
            }
          }
  })
})

  app.listen(3000, () =>{
    console.log("Server running on port 3000")
})