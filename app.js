// require('dotenv').config();
import {} from 'dotenv/config';
import express from 'express';
import md5 from 'md5';
import bodyParser from 'body-parser';
import { fileURLToPath } from 'url';
import {connect, Schema, model} from 'mongoose';
import encrypt from 'mongoose-encryption';
import bcrypt from 'bcrypt';
const saltRounds = 10;
import session from 'express-session'
import passport from 'passport';
import passportLocalMongoose from 'passport-local-mongoose'
import {Strategy as GoogleStrategy} from 'passport-google-oauth20';
import findOrCreate from 'mongoose-findorcreate'
import { parseArgs } from 'util';

const app = express();
app.set('view engine', 'ejs');
const port = 3000;

const __filename = fileURLToPath(import.meta.url);
// const __dirname = dirname(__filename);

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

app.use(session({
    secret: "our little secret.",
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

connect("mongodb://127.0.0.1:27017/userDB");

const userSchema = new Schema({
    email: String,
    password: String,
    googleId: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

// console.log(process.env.API_KEY);
// const secret = process.env.SECRET;
// userSchema.plugin(encrypt, {secret: secret, encryptedFields: ['password']});

const User = new model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
    done(null, user);
  });
   
  passport.deserializeUser(function(user, done) {
    done(null, user);
  });

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

app.get("/", (req,res) => {
    res.render("home");
});

app.route("/auth/google")
.get(passport.authenticate('google',{
    scope:['profile']
}));

app.get("/auth/google/secrets", 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect("/secrets");
  });

app.get("/login", (req,res) =>{
    res.render("login");
});

app.get("/register", (req,res) => {
    res.render("register");
});

app.get("/secrets", (req,res) => {
    if(req.isAuthenticated()){
        res.render("secrets");
    }else{
        res.redirect('/login'); 
    }
});

app.post("/register", (req,res) => {
    // bcrypt.genSalt(saltRounds, function(err, salt) {
    //     bcrypt.hash(req.body.password, salt, function(err, hash) {
    //         // Store hash in your password DB.
    //         const item = new User({
    //             email: req.body.username,
    //             password: hash
    //         });
    //         item.save();
    //         res.render("secrets"); 
    //     });
    // });

    User.register({username: req.body.username}, req.body.password, (err) => {
        if(err){
            console.log(err);
            res.redirect("/register");
        }else{
            passport.authenticate("local")(req,res, (err) => {
                res.redirect("/secrets");
            });
        }
    });
    
    
});

app.post("/login", (req,res) => {
    // const password = req.body.password;
    // User.findOne({
    //     email: req.body.username
    // })
    // .then((foundUser) => {
    //     if(foundUser){
    //         bcrypt.compare(password, foundUser.password, function(err, result) {
    //             // result == true
    //             if(result === true){
    //                 res.render("secrets");
    //             }
    //         });
    //     }
    // }).catch((err) => {
    //     console.log(err);
    // });

    const user = new User({
        username: req.body.username,
        password: req.body.password
    })
    req.login(user, (err) => {
        if(err){
            console.log(err);
        }else{
            passport.authenticate("local")(req,res, (err => {
                res.redirect("/secrets");
            }));
        }
    });
});

app.get("/logout", (req,res) => {
    req.logout((err) => {
        if(err){
            console.log(err);
            next();
        }else{
            res.redirect("/");
        }
    });
});

app.get("/submit", (rqe,res) => {
    res.render("submit");
});

app.post("/submit", (req,res) => {
    
})

app.listen(port, () => {
    console.log(`the port is running on ${port}`);
});