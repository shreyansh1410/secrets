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
import { Strategy as GitHubStrategy } from 'passport-github2';
import findOrCreate from 'mongoose-findorcreate'

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
    googleId: String,
    githubId: String,
    secret: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

// console.log(process.env.API_KEY);
// const secret = process.env.SECRET;
// userSchema.plugin(encrypt, {secret: secret, encryptedFields: ['password']});

const User = new model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, cb) {
    process.nextTick(function() {
      return cb(null, {
        id: user.id,
        username: user.username
      });
    });
  });
   
passport.deserializeUser((user, cb) => {
    process.nextTick(() => {
      return cb(null, user);
    });
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

// passport.use(new GitHubStrategy({
//     clientID: process.env.GITHUB_CLIENT_ID,
//     clientSecret: process.env.GITHUB_CLIENT_SECRET,
//     callbackURL: "http://localhost:3000/auth/github/secrets"
//   },
//   function(accessToken, refreshToken, profile, done) {
//     User.findOrCreate({ githubId: profile.id }, function (err, user) {
//       return done(err, user);
//     });
//   }
// ));

app.get("/", (req,res) => {
    res.render("home");
});

app.route("/auth/google")
.get(passport.authenticate('google',{
    scope:['profile']
}));

app.route("/auth/github")
.get(passport.authenticate('github',{
    scope:['profile']
}));

app.get("/auth/google/secrets", 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect("/secrets");
});

app.get('/auth/github/secrets', 
  passport.authenticate('github', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
  });

app.get("/login", (req,res) =>{
    res.render("login");
});

app.get("/register", (req,res) => {
    res.render("register");
});

app.get("/secrets", (req,res) => {
    // if(req.isAuthenticated()){
    //     res.render("secrets");
    // }else{
    //     res.redirect('/login'); 
    // }
    User.find({"secret": {$ne: null}})
        .then((foundUsers) => {
            if(foundUsers)
                res.render("secrets", {usersWithSecrets: foundUsers});
        })
        .catch((err) => {
            console.log(err);
        });
});

app.get("/submit", (req,res) => {
    if(req.isAuthenticated()){
        res.render("submit");
    }else{
        res.redirect("/login"); 
    }
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


app.post("/submit", async (req, res) => {
    try {
      const submittedSecret = req.body.secret;
      const userID = req.user.id;
  
      const foundUser = await User.findById(userID);
  
      if (foundUser) {
        foundUser.secret = submittedSecret;
        await foundUser.save();
        res.redirect("/secrets");
      }
    } catch (err) {
      console.log(err);
      // Handle the error appropriately (e.g., send an error response)
    }
  });
  

app.listen(port, () => {
    console.log(`the port is running on ${port}`);
});