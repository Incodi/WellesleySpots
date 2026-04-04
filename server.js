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

app.get('/', (req, res) => {
    return res.render('home.ejs');
});

app.get('/reviews', async (req, res) => {
    const db = await Connection.open(mongoUri, DB);
    const reviews = await db.collection(REVIEWS).find({}).toArray();
    return res.render('reviews.ejs', { reviews });
});

let reviewIdCounter = 1;
app.post('/review/', async (req, res) => {
    const reviewId = reviewIdCounter++;
    const review = {
        id: reviewId,
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
    res.json(review);
});

app.get('/home', (req, res) => {
    return res.render('home.ejs');
});

app.get('/profile', (req, res) => {
    return res.render('profile.ejs');
});

app.get('/collections', (req, res) => {
    return res.render('collections.ejs');
});

app.get('/signup', (req, res) => {
    return res.render('signup.ejs');
});

const serverPort = cs304.getPort(8080);

// this is last, because it never returns
app.listen(serverPort, function() {
    console.log(`listening on ${serverPort}`);
    console.log(`visit http://cs.wellesley.edu:${serverPort}/`);
    console.log(`or http://localhost:${serverPort}/`);
    console.log('^C to exit');
});
