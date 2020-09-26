"use strict";
require('dotenv').config();
const routes = require('./routes.js');
const auth = require('./auth');
const express = require("express");
const app = express();
const bodyParser = require('body-parser');
const myDB = require('./connection');
const fccTesting = require("./freeCodeCamp/fcctesting.js");
const pug = require('pug');
app.set('view engine', 'pug');
const session = require('express-session');
const passport = require('passport');
const http = require('http').createServer(app);
const io = require('socket.io')(http);

const passportSocketIo = require('passport.socketio');
const cookieParser = require('cookie-parser');

const MongoStore = require('connect-mongo')(session);
const URI = process.env.MONGO_URI;
const store = new MongoStore({ url: URI });

fccTesting(app); //For FCC testing purposes

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use("/public", express.static(process.cwd() + "/public"));
app.use(express.json());
app.use(express.urlencoded({
    extended: true
}));

app.use(session({
    key: 'express.sid',
    store: store,
    secret: process.env.SESSION_SECRET,
    resave: true,
    saveUninitialized: true,
    cookie: {
        secure: false
    }
}));

app.use(passport.initialize());
app.use(passport.session());

function onAuthorizeSuccess(data, accept) {
  console.log('successful connection to socket.io');
  accept(null, true);
}
function onAuthorizeFail(data, message, error, accept) {
  if (error) throw new Error(message);
  console.log('failed connection to socket.io:', message);
  accept(null, false);
}
io.use(
  passportSocketIo.authorize({
    cookieParser: cookieParser,
    key: 'express.sid',
    secret: process.env.SESSION_SECRET,
    store: store,
    success: onAuthorizeSuccess,
    fail: onAuthorizeFail
  })
);

myDB(async function(client) {
    const myDataBase = await client.db('test').collection('users');
    routes(app, myDataBase);
    auth(app, myDataBase);

    let currentUsers = 0;
    io.on('connection', function(socket){
      ++currentUsers;
      io.emit('user', {
        name: socket.request.user.name,
        currentUsers,
        connected: true
      });
      socket.on('chat message', (message) => {
        io.emit('chat message', { name: socket.request.user.name, message });
      });
      console.log('A user has connected');
      console.log('user ' + socket.request.user.name + ' connected');

      socket.on('disconnect', function(){
        --currentUsers;
        console.log('User has left');
      });
});

}).catch(function(e) {
    app.route('/').get(function(req, res) {
        res.render('pug', {
            title: e,
            message: 'Unable to login',
            showLogin: true
        });
    });
});

http.listen(process.env.PORT || 3000, () => {
    console.log(`HTTP Listening on port ${process.env.PORT} -----> ${process.env.BASE_URL}`);
});
