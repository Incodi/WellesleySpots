const path = require('path');
require("dotenv").config({ path: path.join(process.env.HOME, '.cs304env')});
const express = require('express');
const morgan = require('morgan');
const serveStatic = require('serve-static');
const bodyParser = require('body-parser');

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

app.get('/profile', (req, res) => {
    return res.render('profile.ejs');
});

app.get('/collections', (req, res) => {
    return res.render('collections.ejs');
});

app.get('/signup', (req, res) => {
  return res.render('signup', {
    currentPath: '/signup',
    userId: req.session.userId || null
  });
});

app.get('/login', (req, res) => {
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

app.get('/reviews', async (req, res) => {
    const db = await Connection.open(mongoUri, DB);
    const reviews = await db.collection(REVIEWS).find({}).toArray();
    return res.render('reviews.ejs', { reviews });
});

app.post('/reviews/', async (req, res) => {
    let reviewIdCounter = 1;
    const reviewId = reviewIdCounter++;
    const review = {
        id: reviewId, // TODO: review id
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
});

app.get('/search', async (req, res) => {
    const location_name = req.query.location;
    // const rating = req.query.rating;
    // const tags = req.query.tags; // TODO: handle tags search
    const db = await Connection.open(mongoUri, DB);
    const reviews = await db.collection(REVIEWS).find({location_name: location_name}).toArray();
    return res.render('list.ejs', { reviews });
});

app.get('/review/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    const db = await Connection.open(mongoUri, DB);
    const reviews = db.collection(REVIEWS);
    let full_review = await reviews.findOne({ id: id });

    /* if (!review) {
        return res.render('message.ejs', {
            message: `Sorry, no review with that ID is in the database.` });
    } */

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
