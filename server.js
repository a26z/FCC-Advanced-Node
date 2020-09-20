"use strict";
require('dotenv').config()
const express = require("express");
const app = express();
const myDB = require('./connection');
const fccTesting = require("./freeCodeCamp/fcctesting.js");
const pug = require('pug');
app.set('view engine', 'pug');
const passport = require('passport');
const session = require('express-session');
const ObjectID = require('mongodb').ObjectID;

fccTesting(app); //For FCC testing purposes

app.use("/public", express.static(process.cwd() + "/public"));
app.use(express.json());
app.use(express.urlencoded({
    extended: true
}));
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: true,
    saveUninitialized: true,
    cookie: {
        secure: false
    }
}));
app.use(passport.initialize());
app.use(passport.session());

myDB(async function(client) {
    const myDataBase = await client.db('database').collection('users');
    app.route('/').get(function(req, res) {
        res.render('pug', {
            title: 'Connected to Database',
            message: 'Please login'
        });
    });
    passport.serializeUser(function(user, done) {
        done(null, user._id)
    });
    passport.deserializeUser(function(id, done) {
        myDataBase.findOne({_id: new ObjectID(id)}, function(err, doc){
        done(null, doc);
        });
    });
}).catch(function(e) {
    app.route('/').get(function(req, res) {
        res.render('pug', {
            title: e,
            message: 'Unable to login'
        });
    });
});

app.listen(process.env.PORT || 3000, () => {
    console.log(`Listening on port ${process.env.PORT} -----> ${process.env.BASE_URL}`);
});
