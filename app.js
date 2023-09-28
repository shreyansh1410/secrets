// require('dotenv').config();
import {} from 'dotenv/config';
import express from 'express';
import md5 from 'md5';
// const express = require ('express')
import bodyParser from 'body-parser';
import { fileURLToPath } from 'url';
import {connect, Schema, model} from 'mongoose';
import encrypt from 'mongoose-encryption';

import bcrypt from 'bcrypt';
const saltRounds = 10;
const someOtherPlaintextPassword = 'not_bacon';

const app = express();
app.set('view engine', 'ejs');
const port = 3000;

const __filename = fileURLToPath(import.meta.url);
// const __dirname = dirname(__filename);

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

connect("mongodb://127.0.0.1:27017/userDB");

const userSchema = new Schema({
    email: String,
    password: String
})

// console.log(process.env.API_KEY);
// const secret = process.env.SECRET;
// userSchema.plugin(encrypt, {secret: secret, encryptedFields: ['password']});

const User = new model("User", userSchema);

app.get("/", (req,res) => {
    res.render("home");
});

app.get("/login", (req,res) =>{
    res.render("login");
});

app.get("/register", (req,res) => {
    res.render("register");
});

app.post("/register", (req,res) => {
    bcrypt.genSalt(saltRounds, function(err, salt) {
        bcrypt.hash(req.body.password, salt, function(err, hash) {
            // Store hash in your password DB.
            const item = new User({
                email: req.body.username,
                password: hash
            });
            item.save();
            res.render("secrets"); 
        });
    });
    
    
});

app.post("/login", (req,res) => {
    const password = req.body.password;
    User.findOne({
        email: req.body.username
    })
    .then((foundUser) => {
        if(foundUser){
            bcrypt.compare(password, foundUser.password, function(err, result) {
                // result == true
                if(result === true){
                    res.render("secrets");
                }
            });
        }
    }).catch((err) => {
        console.log(err);
    });
});

app.get("/logout", (req,res) => {
    res.redirect("/");
});

app.get("/submit", (rqe,res) => {
    res.render("submit");
});

app.post("/submit", (req,res) => {
    
})

app.listen(port, () => {
    console.log(`the port is running on ${port}`);
});