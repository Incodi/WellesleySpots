# WellesleySpots

Finding WellesleySpots on the Wellesley College Campus

## Description</br>
  WellesleySpots is a web application that will allow students to find, review, and share detailed information about study locations on campus. 

## Why It’s Useful
  Students often have a hard time finding good study spots, especially as first-years who are new to campus. This application will help students find high quality places so that they can be more productive! This website will be suited to any and every type of student’s needs and interests, including whether they prefer a quiet spot or need to be in a busy area. 

## Inspiration
  We took inspiration from websites like Rate Your Professor and Tripadvisor. These websites are very helpful for finding information about things that people like and what to avoid, with user-generated ratings. Tripadvisor works similar to how we imagine our website will be, as users can rate places and the ratings are averaged and shown to other users of the website to show if an area is user-recommended or not. 

To add, the witty and interesting comments in Tripadvisor were one of the biggest factors in drawing us to this idea and we want to see these types of comments and this type of community on our website, specifically in a setting related to the Wellesley College campus. 

## Features
Email verification since the user must be a Wellesley College student. We will enforce this both through a simple front-end check that will confirm the user input an email ending in @wellesley.edu and through an email verification API that will send users an email to confirm the validity behind their input. This will also increase trust in our website by guaranteeing users that they are talking to real Wellesley College students

Users will be able to filter locations using tags. These tags could include noise level or if there is easy access to food, such as through a cafe. This will ensure users can easily find study locations that best fit their needs. 

Users can add a pin for a location on the Wellesley College campus map where they can then input their review of the location. Making the process to start a review as easy as possible by letting users just click on a map (using a map API Leaflet) promotes app usability.

Users can write a short text review for places and can also upload a photo. After clicking on our map, a user will answer a series of questions, such as the name of the location, adding tags, rating out of 5 stars, a general description review, and an image. This is the main component of our application that ensures users get to see the feedback and opinions of other students. 

Users can save locations in their private collections (for example, want to visit or have visited). This allows users to reflect on past study locations they’ve visited and keep track of future locations they could go to. 

Administrators can manage and moderate the website’s database. To combat any potential harmful language or behaviors on the website, designated administrators of the site should be able to delete the reviews of other users. 

## Data to be Collected 
The database will have three main collections: users, locations, and reviews. 

Users store details like name, email, passwords, and role. 

Locations store details like name, coordinates, hours. 

Reviews store user ID, location ID, ratings, text, photo filename, tags, and timestamp.

Queries should include features like retrieving a specific user's review history and getting average ranking of locations for display. 

Updates to the database will have to occur in situations where users submit reviews, edit their profile, or when administrators moderate content. 

Web forms will need to handle user registration, login, review submission, and photo uploads.

## Technical Implementation
As with most websites, it is built with HTML, CSS, and Javascript.

We will need to implement web forms which will connect to our database and share information. This will connect to NodeJS and MongoDB servers.

Will have to use AJAX for database queries. This will help with making website updates asynchronous and always updating, showing the newest information at all times. 

We will need to implement a map on the website, for example, using Leaflet. Users can just click on the map to add a pin with coordinates that are automatically generated using the API. 

We will also need to use an email verification API and learn how to incorporate and test that in our site. 

