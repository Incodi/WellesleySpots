'use strict';
const path = require('path');
const bcrypt = require('bcrypt');
require("dotenv").config({ path: path.join(process.env.HOME, '.cs304env')});

const express = require('express');
const morgan = require('morgan');
const serveStatic = require('serve-static');
const bodyParser = require('body-parser');
const cookieSession = require('cookie-session');
const flash = require('express-flash');

const { Connection } = require('./connection');
const cs304 = require('./cs304');

const app = express();

app.use(morgan('tiny'));
app.use(cs304.logStartRequest);

// This handles POST data
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(cs304.logRequestData);

app.use(cookieSession({
  name: 'session',
  keys: [cs304.randomString(20)],
  maxAge: 24 * 60 * 60 * 1000
}));
app.use(flash());

app.use(serveStatic('public'));
app.set('view engine', 'ejs');

const mongoUri = cs304.getMongoUri();
const DB = 'wellesleyspots';
const USERS = 'users';
const LOCATIONS = 'locations';
const REVIEWS = 'reviews';
const COMMENTS = 'comments';
const LIKES = 'likes';
const FAVORITES = 'favorites';
const HISTORY = 'history';

// Helper to validate email format
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Helper to check if email is a Wellesley email address (ends with @wellesley.edu)
function isWellesleyEmail(email) {
  return String(email || '').trim().toLowerCase().endsWith('@wellesley.edu');
}

// This is for debugging
function isMongoConfigured(req, res) {
  if (mongoUri) {
    return true;
  }

  req.flash('error', 'Database connection is not configured.');
  res.redirect('/signup');
  return false;
}

// TODO: documentation
app.get('/', (req, res) => { 
  return res.redirect('/home');
});

// Render Home page
app.get('/home', (req, res) => {
  return res.render('home', {
    currentPath: '/home',
    userId: req.session.userId || null
  });
});

// Render Signup/Login page
app.get('/signup', (req, res) => {
  return res.render('signup', {
    currentPath: '/signup',
    userId: req.session.userId || null,
    username: req.session.username || null,
    email: req.session.email || null,
    flashError: req.flash('error'),
    flashInfo: req.flash('info')
  });
});

// Redirect /login to /signup for now since we have a combined signup/login page
app.get('/login', (req, res) => {
  return res.redirect('/signup');
});

// Handle user registration and login 
// Uses bcrypt to hash passwords before storing in the database, 
// and to compare hashes during login
app.post('/register', async (req, res) => {
  const username = String(req.body.username || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '').trim();

  // This is for debugging
  if (!isMongoConfigured(req, res)) {
    return;
  }

  if (!username || !email || !password) {
    req.flash('error', 'Username, email, and password are required.');
    return res.redirect('/signup');
  }

  if (!isValidEmail(email)) {
    req.flash('error', 'Please enter a valid email address.');
    return res.redirect('/signup');
  }

  if (!isWellesleyEmail(email)) {
    req.flash('error', 'Use your Wellesley email address ending in @wellesley.edu. just use test@wellesley.edu for now');
    return res.redirect('/signup');
  }

  const db = await Connection.open(mongoUri, DB);
  const usersCol = db.collection(USERS);
  const existingUsers = await usersCol.find({
    $or: [{ username: username }, { email: email }]
  }).toArray();

  if (existingUsers.length > 0) {
    req.flash('error', 'That username or email is already registered.');
    return res.redirect('/signup');
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const results = await usersCol.insertOne({
    username,
    email,
    password: hashedPassword
  });

  req.session.username = username;
  req.session.email = email;
  req.session.userId = results.insertedId.toString();
  req.flash('info', 'Account created. You are now logged in.');
  return res.redirect('/home');
});

// Handle user login on the signup page (since we have a combined signup/login page)
app.post('/login', async (req, res) => {
  const loginIdentifier = String(req.body.loginIdentifier || '').trim();
  const password = String(req.body.password || '').trim();

  // This is for debugging
  if (!isMongoConfigured(req, res)) {
    return;
  }

  if (!loginIdentifier || !password) {
    req.flash('error', 'Username/email and password are required.');
    return res.redirect('/signup');
  }

  const db = await Connection.open(mongoUri, DB);
  const usersCol = db.collection(USERS);
  const existingUser = await usersCol.findOne({
    $or: [
      { username: loginIdentifier },
      { email: loginIdentifier.toLowerCase() }
    ]
  });

  if (!existingUser) {
    req.flash('error', 'Account not found');
    return res.redirect('/signup');
  }

  // Compare the provided password with the hashed password in the database
  const passwordMatch = await bcrypt.compare(password, existingUser.password);
  if (!passwordMatch) {
    req.flash('error', 'Incorrect password');
    return res.redirect('/signup');
  }

  req.session.username = existingUser.username;
  req.session.email = existingUser.email || null;
  req.session.userId = existingUser._id.toString();
  req.flash('info', 'Login successful.');
  return res.redirect('/home');
});

// Handle user logout
// Turn session into null to clear all session data and log the user out
app.post('/logout', (req, res) => {
  req.session = null;
  return res.redirect('/signup');
});

app.get('/profile', (req, res) => { // redirects to signup if no user ID
  if (!req.session.userId) {
    return res.redirect('/signup');
  }
  return res.render('profile', {
    currentPath: '/profile',
    userId: req.session.userId,
    username: req.session.username || null,
    email: req.session.email || null
  });
});

app.get('/collections', async (req, res) => { // redirects to signup if no user ID
  if (!req.session.userId) {
    return res.redirect('/signup');
  }

  // This is for debugging
  if (!isMongoConfigured(req, res)) {
    return;
  }

  const db = await Connection.open(mongoUri, DB);
  const userId = req.session.userId;

  // Basic collection quires for each collection type, sorted by most recent first
  const [reviews, comments, likes, favorites, history] = await Promise.all([
    db.collection(REVIEWS).find({userId}).sort({createdAt: -1}).toArray(),
    db.collection(COMMENTS).find({userId}).sort({createdAt: -1}).toArray(),
    db.collection(LIKES).find({userId}).sort({createdAt: -1}).toArray(),
    db.collection(FAVORITES).find({userId}).sort({createdAt: -1}).toArray(),
    db.collection(HISTORY).find({userId}).sort({createdAt: -1}).toArray()
  ]);

  return res.render('collections', {
    currentPath: '/collections',
    userId: req.session.userId,
    username: req.session.username || null,
    email: req.session.email || null,
    reviews,
    comments,
    likes,
    favorites,
    history
  });
});

app.get('/searches', (req, res) => {
    /* if (!req.session.userId) {
        return res.redirect('/signup');
    } */
    return res.render('searches.ejs', { results: null });
});

app.get('/reviews', async (req, res) => {
    /* if (!req.session.userId) {
        return res.redirect('/signup');
    } */
    
    const db = await Connection.open(mongoUri, DB);
    const reviews = await db.collection(REVIEWS).find({}).toArray();
    return res.render('reviews.ejs', { reviews });
});

let review_rr_counter = 1;
app.post('/reviews/', async (req, res) => {
    const reviewId = review_rr_counter++;
    const review = {
        rr: reviewId, // like nm or tt
        userId: req.session.userId || null,
        username: req.session.username || null,
        title: req.body.title,
        location_name: req.body.location_name,
        review: req.body.review,
        x_coordinates: req.body.x_coordinates,
        y_coordinates: req.body.y_coordinates,
        tags: req.body.tags,
        rating: req.body.rating,
        createdAt: new Date()
    };

    const db = await Connection.open(mongoUri, DB);
    await db.collection(REVIEWS).insertOne(review);
    res.redirect('/reviews');
});

app.get('/search', async (req, res) => {
    const { location, rating, filter_tags } = req.query;

    const db = await Connection.open(mongoUri, DB);

    let query = {};
    if (location) query.location_name = location;
    if (rating) query.rating = rating;

    if (filter_tags) {
        const tagsArray = Array.isArray(filter_tags) ? filter_tags : [filter_tags];
        query.tags = { $in: tagsArray };
    }

    const results = await db.collection(REVIEWS).find(query).toArray();

    return res.render('searches.ejs', { results });
});

app.get('/review/:rr', async (req, res) => {
    const rr = parseInt(req.params.rr);
    const db = await Connection.open(mongoUri, DB);
    let full_review = await db.collection(REVIEWS).findOne({ rr: rr });

    res.render('reviewDetails.ejs', { full_review });
});

const serverPort = cs304.getPort(8080);


app.listen(serverPort, function() {
    console.log(`listening on ${serverPort}`);
    console.log(`visit http://cs.wellesley.edu:${serverPort}/`);
    console.log(`or http://localhost:${serverPort}/`);
    console.log('^C to exit');
});
