'use strict';
const path = require('path');
const bcrypt = require('bcrypt');
require("dotenv").config({ path: path.join(process.env.HOME, '.cs304env')});

const express = require('express');
const morgan = require('morgan');
const serveStatic = require('serve-static');
const bodyParser = require('body-parser');
const cookieSession = require('cookie-session');
const multer = require("multer");
const flash = require('express-flash');
const counter = require('./counter-utils.js')

const { Connection } = require('./connection');
const cs304 = require('./cs304');

const app = express();

app.use(morgan('tiny'));
app.use(cs304.logStartRequest);

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(cs304.logRequestData);

app.use(cookieSession({
  name: 'session',
  keys: [cs304.randomString(20)],
  maxAge: 24 * 60 * 60 * 1000
}));

app.use(flash());
app.use('/uploads', express.static('uploads'));
app.use(serveStatic('public'));
app.set('view engine', 'ejs');

const mongoUri = cs304.getMongoUri();
const DB = 'wellesleyspots';
const USERS = 'users';
const REVIEWS = 'reviews';
const COUNTERS = 'counters';
const COMMENTS = 'comments';
const LIKES = 'likes';
const HISTORY = 'history';


// middleware to require login for certain routes
function loginRequired(req, res, next) {
  if (!req.session.userId) return res.redirect('/signup');
  next();
}

// Validate email format
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Check if email is a Wellesley email address (ends with @wellesley.edu)
function isWellesleyEmail(email) {
  return String(email || '').trim().toLowerCase().endsWith('@wellesley.edu');
}

// for our collections page
function buildHistoryEntry({ userId, action, rr, title, location_name, createdAt }) {
  return {
    userId,
    action,
    rr,
    title: title || null,
    location_name: location_name || null,
    createdAt: createdAt || new Date()
  };
}

// for our collections page
async function recordHistory(db, entry) {
  await db.collection(HISTORY).insertOne(entry);
}

// Generate string for a photo's file path using a date
function timeString(dateObj) {
  if( !dateObj) dateObj = new Date();
  // convert val to two-digit string
  const d2 = (val) => val < 10 ? '0'+val : ''+val;
  let hh = d2(dateObj.getHours())
  let mm = d2(dateObj.getMinutes())
  let ss = d2(dateObj.getSeconds())
  return hh+mm+ss
}

var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads')
  },
  filename: function (req, file, cb) {
      let parts = file.originalname.split('.');
      let ext = parts[parts.length-1];
      let hhmmss = timeString();
      cb(null, file.fieldname + '-' + hhmmss + '.' + ext);
  }
})

var upload = multer({ storage: storage,
  limits: {fileSize: 1024 * 1024 * 5 }}); // max 5 MB

// Apply user session data to all routes so nav bar has conditional appearance based on login/logout state
app.use((req, res, next) => {
  res.locals.user = req.session.userId || null;
  next();
});

// Redirect to home page 
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

// Redirect /login to /signup since we have a combined signup/login page
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

  // Validation patterns
  const usernameRegex = /^[a-zA-Z0-9_-]{3,24}$/; // 3-24 chars, alphanumeric/underscore

  // Basic email structure also make sure email has no invalid characters
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
 
  const passwordRegex = /^[A-Za-z\d@$!%*?&]{8,}$/; // Min 8 chars, specific symbols allowed

  if (!username || !email || !password) {
    req.flash('error', 'Username, email, and password are required.');
    return res.redirect('/signup');
  } else if (!usernameRegex.test(username)) {
    req.flash('error', "Invalid username characters or length.");
    return res.redirect('/signup');
  } else if (!emailRegex.test(email)) {
    req.flash('error', "Invalid email format.");
    return res.redirect('/signup');
  } else if (!passwordRegex.test(password)) {
    req.flash('error', "Password contains invalid characters or is too short.");
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

// Turns session into null to clear all session data and log the user out
app.post('/logout', (req, res) => {
  req.session = null;
  return res.redirect('/signup');
});

// Retrieves user's profile information
app.get('/profile', loginRequired, (req, res) => {
  return res.render('profile', {
    currentPath: '/profile',
    userId: req.session.userId,
    username: req.session.username || null,
    email: req.session.email || null
  });
});

// Render account settings page
app.get('/account-settings', loginRequired, (req, res) => {
  return res.render('account-settings', {
    currentPath: '/account-settings',
    userId: req.session.userId,
    username: req.session.username || null,
    email: req.session.email || null,
    flashError: req.flash('error'),
    flashInfo: req.flash('info')
  });
});

// Backward-compatible entry point for password resets
app.get('/reset-password', (req, res) => {
  if (req.session.userId) {
    return res.redirect('/account-settings');
  }

  return res.redirect('/forgot-password');
});

// Completes a password reset for logged-in users
app.post('/reset-password', loginRequired, async (req, res) => {
  const currentPassword = String(req.body.currentPassword || '').trim();
  const newPassword = String(req.body.newPassword || '').trim();
  const confirmPassword = String(req.body.confirmPassword || '').trim();

  if (!currentPassword || !newPassword || !confirmPassword) {
    req.flash('error', 'All password fields are required.');
    return res.redirect('/account-settings');
  }

  if (newPassword !== confirmPassword) {
    req.flash('error', 'New passwords do not match.');
    return res.redirect('/account-settings');
  }

  const passwordRegex = /^[A-Za-z\d@$!%*?&]{8,}$/; // Min 8 chars, only specific symbols allowed
  if (!passwordRegex.test(newPassword)) {
    req.flash('error', 'New password must be at least 8 characters and contain only letters, numbers, and these symbols: @$!%*?&');
    return res.redirect('/account-settings');
  }

  const db = await Connection.open(mongoUri, DB);
  const usersCol = db.collection(USERS);
  const user = await usersCol.findOne({ _id: new (require('mongodb')).ObjectId(req.session.userId) });

  if (!user) {
    req.flash('error', 'User not found.');
    return res.redirect('/account-settings');
  }

  // Verify current password
  const passwordMatch = await bcrypt.compare(currentPassword, user.password);
  if (!passwordMatch) {
    req.flash('error', 'Current password is incorrect.');
    return res.redirect('/account-settings');
  }

  // Hash new password and update
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await usersCol.updateOne({ _id: new (require('mongodb')).ObjectId(req.session.userId) }, { $set: { password: hashedPassword } });

  req.flash('info', 'Password updated successfully.');
  return res.redirect('/account-settings');
});

// Handle account deletion for logged-in users
app.post('/delete-account', loginRequired, async (req, res) => {
  const password = String(req.body.password || '').trim();

  if (!password) {
    req.flash('error', 'Password is required for account deletion.');
    return res.redirect('/account-settings');
  }

  const db = await Connection.open(mongoUri, DB);
  const usersCol = db.collection(USERS);
  const user = await usersCol.findOne({ _id: new (require('mongodb')).ObjectId(req.session.userId) });

  if (!user) {
    req.flash('error', 'User not found.');
    return res.redirect('/account-settings');
  }

  // Verify password
  const passwordMatch = await bcrypt.compare(password, user.password);
  if (!passwordMatch) {
    req.flash('error', 'Password is incorrect. Account was not deleted.');
    return res.redirect('/account-settings');
  }

  const userId = req.session.userId;

  // Delete all user data
  await Promise.all([
    usersCol.deleteOne({ _id: new (require('mongodb')).ObjectId(userId) }),
    db.collection(REVIEWS).deleteMany({ userId: userId }),
    db.collection(COMMENTS).deleteMany({ userId: userId }),
    db.collection(LIKES).deleteMany({ userId: userId }),
    db.collection(HISTORY).deleteMany({ userId: userId })
  ]);

  // Set flash message BEFORE clearing session
  req.flash('info', 'Your account and all associated data have been permanently deleted.');
  
  // Clear session after setting flash
  req.session = null;
  
  return res.redirect('/signup');
});

// Renders a forgot password page
app.get('/forgot-password', (req, res) => {
  return res.render('forgot-password', {
    currentPath: '/forgot-password',
    userId: req.session.userId || null,
    flashError: req.flash('error'),
    flashInfo: req.flash('info')
  });
});

// Simulates process for reset password requests for logged out users
app.post('/forgot-password', async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();

  if (!email) {
    req.flash('error', 'Email is required.');
    return res.redirect('/forgot-password');
  }

  if (!isValidEmail(email)) {
    req.flash('error', 'Please enter a valid email address.');
    return res.redirect('/forgot-password');
  }

  if (!isWellesleyEmail(email)) {
    req.flash('error', 'Use your Wellesley email address ending in @wellesley.edu. just use your Wellesley email address.');
    return res.redirect('/forgot-password');
  }

  // In a real application, we would send an email to the user with instructions to reset their password
  // For this implementation, we decided to just flash a message indicating a reset link has been sent
  req.flash('info', 'If an account with that email exists, a password reset link has been sent.');
  return res.redirect('/forgot-password');
});

// Retrieves user's relevant data, including reviews they've created and liked in one page
app.get('/collections', loginRequired, async (req, res) => {

  const db = await Connection.open(mongoUri, DB);
  const userId = req.session.userId;

  // Basic collection queries for each collection type, sorted by most recent first
  const [reviews, comments, likes, storedHistory] = await Promise.all([
    db.collection(REVIEWS).find({userId}).sort({createdAt: -1}).toArray(),
    db.collection(COMMENTS).find({userId}).sort({createdAt: -1}).toArray(),
    db.collection(LIKES).find({userId}).sort({createdAt: -1}).toArray(),
    db.collection(HISTORY).find({userId}).sort({createdAt: -1}).toArray()
  ]);

  // Likes: add title and location_name to each like 
  // based on the review that was liked, 
  // so that the user can see what they liked without having to click into each review
  const likedRrs = likes
    .map((like) => like.rr)
    .filter((rr) => typeof rr === 'number');
  const likedReviewDocs = likedRrs.length
    ? await db.collection(REVIEWS)
    .find({ rr: { $in: likedRrs } })
    .project({ rr: 1, title: 1, location_name: 1 })
    .toArray()
    : [];
  const likedReviewByRr = new Map(likedReviewDocs.map((review) => [review.rr, review]));

  const mappedLikes = likes.map((like) => {
    const review = likedReviewByRr.get(like.rr) || {};
    return {
      ...like,
      title: like.title || review.title || null,
      location_name: like.location_name || review.location_name || null
    };
  });

  // Tracks user's history of actions such as creating, liking, and editing reviews on the site
  // Any activity done before this was implemented is not in here.
  const history = storedHistory;

  return res.render('collections', {
    currentPath: '/collections',
    userId: req.session.userId,
    username: req.session.username || null,
    email: req.session.email || null,
    reviews,
    comments,
    likes: mappedLikes,
    history
  });
});

// Render reviews page with all review creation form and existing reviews shown in map view
app.get('/reviews', loginRequired, async (req, res) => {
    const db = await Connection.open(mongoUri, DB);
    const reviews = await db.collection(REVIEWS).find({}).toArray();
    return res.render('reviews.ejs', { reviews });
});

// Creates a review for a particular location and then redirects to the newly created review upon successful completion
app.post('/reviews/', loginRequired, upload.single('photo'), async (req, res) => {
  const db = await Connection.open(mongoUri, DB);
  const review_counter = await counter.incr(db.collection(COUNTERS), REVIEWS);
  const review = {
      rr: review_counter, // like nm or tt
      userId: req.session.userId || null,
      username: req.session.username || null,
      createdAt: new Date(),
      title: req.body.title,
      location_name: req.body.location_name,
      review: req.body.review,
      x_coordinates: req.body.x_coordinates,
      y_coordinates: req.body.y_coordinates,
      tags: req.body.tags,
      rating: req.body.rating,
      likeCount: 0
  };

  if (req.file) { 
    review.photo_path = req.file.filename;
    if (req.body.photo_caption) {
      review.photo_caption = req.body.photo_caption;
    }
  }

  await db.collection(REVIEWS).insertOne(review);
  await recordHistory(db, buildHistoryEntry({
    userId: req.session.userId,
    action: 'review_created',
    rr: review.rr,
    title: review.title,
    location_name: review.location_name,
    createdAt: review.createdAt
  }));

  return res.redirect(`/review/${review.rr}`);
});

// Render review details page for a specific review using on required parameter: rr (review ID)
app.get('/review/:rr', loginRequired, async (req, res) => {
    const rr = parseInt(req.params.rr);
    const db = await Connection.open(mongoUri, DB);
    const review = await db.collection(REVIEWS).findOne({ rr: rr });
    if (!review) return res.redirect('/reviews');
    let canEdit = (req.session.userId == review.userId);

    let comments = await db.collection(COMMENTS).find({ rr: rr }).sort({ createdAt: -1 }).toArray();
    comments = comments.map(comment => {
      return {
        ...comment,
        canDeleteComment: req.session.userId == comment.userId
      };
    });

    return res.render('reviewDetails.ejs', { 
      review, canEdit,
      flashError: req.flash('error'),
      flashInfo: req.flash('info'),
      comments
    });
});

// Update a specific review if user is author of the review
app.post('/review/:rr/update', loginRequired, upload.single('photo'), async (req, res) => {
    const rr = parseInt(req.params.rr);
    const db = await Connection.open(mongoUri, DB);
    const mutable_fields = ["title", "location_name", "review", "tags", "rating", "photo_caption", "photo"];
    let fields = {};
    let canEdit = true;

    const review = await db.collection(REVIEWS).findOne({ rr: rr });

    if (!review) return res.redirect('/reviews');
    if (req.session.userId != review.userId) {
      canEdit = false;
      return res.render('reviewDetails.ejs', { review, canEdit });
    }

    for (const key of mutable_fields) {
      if (req.body[key] !== undefined && req.body[key] !== "") {
        fields[key] = req.body[key];
      }
    }

    if (req.file) fields.photo_path = req.file.filename; 

    if (Object.keys(fields).length === 0) {
      req.flash('error', 'Please provide at least one change before saving.');
      return res.redirect(`/review/${rr}`);
    }

    fields.editedAt = new Date();

    await db.collection(REVIEWS).updateOne({ rr: rr }, { $set: fields });

    const updatedReview = await db.collection(REVIEWS).findOne({ rr: rr });
    await recordHistory(db, buildHistoryEntry({
      userId: req.session.userId,
      action: 'review_edited',
      rr,
      title: updatedReview?.title || review.title,
      location_name: updatedReview?.location_name || review.location_name,
      createdAt: fields.editedAt
    }));

    return res.redirect(`/review/${rr}`);
});

// Delete a specific review, only if user is author of the review
app.post('/review/:rr/delete', loginRequired, async (req, res) => {
    const rr = parseInt(req.params.rr);
    const db = await Connection.open(mongoUri, DB);
    const review = await db.collection(REVIEWS).findOne({ rr: rr });
    if (req.session.userId != review.userId) return res.redirect(`/review/${rr}`);

    await db.collection(REVIEWS).deleteOne({ rr: rr });

    return res.redirect('/reviews');
});

// Increments, decerements, or initializes a like counter for a review
// If user has already liked a review, it removes their like
app.post('/like', loginRequired, async (req, res) => {
  const rr = parseInt(req.body.rr);  
  const db = await Connection.open(mongoUri, DB);

  const review = await db.collection(REVIEWS).findOne({ rr });
  if (!review) return res.redirect('/reviews');

  const existingLike = await db.collection(LIKES).findOne({ userId: req.session.userId, rr });

  // Remove like functionality
  if (existingLike) {
    await db.collection(LIKES).deleteOne({
    userId: req.session.userId,
    rr
  });

  await recordHistory(db, buildHistoryEntry({
    userId: req.session.userId,
    action: 'review_unliked',
    rr,
    title: review.title,
    location_name: review.location_name,
    createdAt: new Date()
  }));

  // Decrement like count
  await db.collection(REVIEWS).updateOne({ rr, likeCount: { $gt: 0 } }, { $inc: { likeCount: -1 } });
  return res.redirect(`/review/${rr}`);
  }

  await db.collection(LIKES).insertOne({
    userId: req.session.userId,
    rr,
    title: review.title || null,
    location_name: review.location_name || null,
    createdAt: new Date()
  });

  await recordHistory(db, buildHistoryEntry({
    userId: req.session.userId,
    action: 'review_liked',
    rr,
    title: review.title,
    location_name: review.location_name,
    createdAt: new Date()
  }));

  await db.collection(REVIEWS).updateOne({ rr }, { $inc: { likeCount: 1 } });
  return res.redirect(`/review/${rr}`);
});

// Creates a comment for a particular review 
// Both the author of the review and other users can comment
// Records a comment_created action in user's history for tracking
app.post('/review/:rr/comment', loginRequired, async (req, res) => {
  const rr = parseInt(req.params.rr);
  const db = await Connection.open(mongoUri, DB);
  const comment_counter = await counter.incr(db.collection(COUNTERS), COMMENTS);

  const userId = req.session.userId || null;
  const comment = {
    cc: comment_counter,
    rr: rr,
    userId: userId,
    username: req.session.username || null,
    createdAt: new Date(),
    comment: req.body.comment
  };
  await db.collection(COMMENTS).insertOne(comment);
  
  // Record the comment creation in user history
  const review = await db.collection(REVIEWS).findOne({ rr: rr });
  await recordHistory(db, buildHistoryEntry({
    userId: req.session.userId,
    action: 'comment_created',
    rr,
    title: review?.title || null,
    location_name: review?.location_name || null,
    createdAt: comment.createdAt
  }));
  
  return res.redirect(`/review/${rr}`);
});

// Delete a specific comment, only if user is author of the comment
// Records a comment_deleted action in user's history for tracking
app.post('/review/:rr/comment/:cc/delete', loginRequired, async (req, res) => {
    const rr = parseInt(req.params.rr);
    const cc = parseInt(req.params.cc);
    const db = await Connection.open(mongoUri, DB);
    const comment = await db.collection(COMMENTS).findOne({ rr: rr, cc: cc });
    if (req.session.userId != comment.userId) return res.redirect(`/review/${rr}`);

    await db.collection(COMMENTS).deleteOne({ rr: rr, cc: cc });
    
    // Record the comment deletion in user history
    const review = await db.collection(REVIEWS).findOne({ rr: rr });
    await recordHistory(db, buildHistoryEntry({
      userId: req.session.userId,
      action: 'comment_deleted',
      rr,
      title: review?.title || null,
      location_name: review?.location_name || null,
      createdAt: new Date()
    }));

    return res.redirect(`/review/${rr}`);
});

// Render search page with search form and existing locations for a dynamic dropdown filter in form
app.get('/searches', loginRequired, async (req, res) => {
    const db = await Connection.open(mongoUri, DB);
    const locations = await db.collection(REVIEWS).distinct('location_name', {});

    return res.render('searches.ejs', {
        results: null,
        locations
    });
});

// Retrieves reviews that fit search criteria including location, rating, and/or tag(s) 
// and renders search page with results
app.get('/search', loginRequired, async (req, res) => {
    const { location, rating, filter_tags } = req.query;

    const db = await Connection.open(mongoUri, DB);
    const locations = await db.collection(REVIEWS).distinct('location_name', {});

    let query = {};
    if (location) query.location_name = location;
    if (rating) query.rating = rating;

    if (filter_tags) {
        const tagsArray = Array.isArray(filter_tags) ? filter_tags : [filter_tags];
        query.tags = { $in: tagsArray };
    }

    const results = await db.collection(REVIEWS).find(query).toArray();
    return res.render('searches.ejs', { results, locations });
});

const serverPort = cs304.getPort(8080);

app.listen(serverPort, function() {
    console.log(`listening on ${serverPort}`);
    console.log(`visit http://cs.wellesley.edu:${serverPort}/`);
    console.log(`or http://localhost:${serverPort}/`);
    console.log('^C to exit');
});
