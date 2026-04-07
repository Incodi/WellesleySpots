const path = require('path');
require("dotenv").config({ path: path.join(process.env.HOME, '.cs304env')});
const express = require('express');
const morgan = require('morgan');
const serveStatic = require('serve-static');
const bodyParser = require('body-parser');
const cookieSession = require('cookie-session');
const flash = require('express-flash');

const { Connection } = require('./connection');
const cs304 = require('./cs304');

// Create and configure the app

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

// TODO: documentation
app.get('/', (req, res) => { 
  return res.redirect('/home');
});

app.get('/home', (req, res) => {
  return res.render('home', {
    currentPath: '/home',
    userId: req.session.userId || null
  });
});

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

app.get('/login', (req, res) => {
  return res.redirect('/signup');
});

app.post('/register', async (req, res) => {
  const username = String(req.body.username || '').trim();
  const password = String(req.body.password || '').trim();

  if (!username || !password) {
    req.flash('error', 'Username and password are required.');
    return res.redirect('/signup');
  }

  const db = await Connection.open(mongoUri, DB);
  const usersCol = db.collection(USERS);
  const existingUsers = await usersCol.find({ username: username }).toArray();

  if (existingUsers.length > 0) {
    req.flash('error', 'A user with that username already exists.');
    return res.redirect('/signup');
  }

  const results = await usersCol.insertOne({
    username,
    password
  });

  req.session.username = username;
  req.session.userId = results.insertedId.toString();
  req.flash('info', 'Account created. You are now logged in.');
  return res.redirect('/home');
});

app.post('/login', async (req, res) => {
  const username = String(req.body.username || '').trim();
  const password = String(req.body.password || '').trim();

  if (!username || !password) {
    req.flash('error', 'Username and password are required.');
    return res.redirect('/signup');
  }

  const db = await Connection.open(mongoUri, DB);
  const usersCol = db.collection(USERS);
  const existingUser = await usersCol.findOne({ username: username });

  if (!existingUser) {
    req.flash('error', 'Username not found');
    return res.redirect('/signup');
  }

  if (existingUser.password !== password) {
    req.flash('error', 'Incorrect password');
    return res.redirect('/signup');
  }

  req.session.username = existingUser.username;
  req.session.userId = existingUser._id.toString();
  req.flash('info', 'Login successful.');
  return res.redirect('/home');
});

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
    userId: req.session.userId
  });
});

app.get('/collections', (req, res) => { // redirects to signup if no user ID
  if (!req.session.userId) {
    return res.redirect('/signup');
  }
  return res.render('collections', {
    currentPath: '/collections',
    userId: req.session.userId
  });
});

app.get('/searches', (req, res) => {
    return res.render('searches.ejs', { results: null });
});

app.get('/reviews', async (req, res) => {
    const db = await Connection.open(mongoUri, DB);
    const reviews = await db.collection(REVIEWS).find({}).toArray();
    return res.render('reviews.ejs', { reviews });
});

let review_rr_counter = 1;
app.post('/reviews/', async (req, res) => {
    const reviewId = review_rr_counter++;
    const review = {
        rr: reviewId, // like nm or tt
        title: req.body.title,
        location_name: req.body.location_name,
        review: req.body.review,
        x_coordinates: req.body.x_coordinates,
        y_coordinates: req.body.y_coordinates,
        tags: req.body.tags,
        rating: req.body.rating
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

    const reviews = db.collection(REVIEWS);
    const results = await reviews.find(query).toArray();

    return res.render('searches.ejs', { results });
});

app.get('/review/:rr', async (req, res) => {
    const rr = parseInt(req.params.rr);
    const db = await Connection.open(mongoUri, DB);
    const reviews = db.collection(REVIEWS);
    let full_review = await reviews.findOne({ rr: rr });

    res.render('reviewDetails.ejs', { full_review });
});

const serverPort = cs304.getPort(8080);

// this is last, because it never returns
app.listen(serverPort, function() {
    console.log(`listening on ${serverPort}`);
    console.log(`visit http://cs.wellesley.edu:${serverPort}/`);
    console.log(`or http://localhost:${serverPort}/`);
    console.log('^C to exit');
});
