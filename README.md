# Finding WellesleySpots on the Wellesley College Campus

## Description
  WellesleySpots is a web application that will allow students to find, review, and share detailed information about study locations on campus. 

## Why It’s Useful
  Students often have a hard time finding good study spots, especially as first-years who are new to campus. This application will help students find high quality places so that they can be more productive! This website will be suited to any and every type of student’s needs and interests, including whether they prefer a quiet spot or need to be in a busy area. 

## Inspiration
  We took inspiration from websites like Rate Your Professor and Tripadvisor. These websites are very helpful for finding information about things that people like and what to avoid, with user-generated ratings. Tripadvisor works similar to how we imagine our website will be, as users can rate places and the ratings are averaged and shown to other users of the website to show if an area is user-recommended or not. 
  
  To add, the witty and interesting comments in Tripadvisor were one of the biggest factors in drawing us to this idea and we want to see these types of comments and this type of community on our website, specifically in a setting related to the Wellesley College campus. 

## Features
Email verification since the user must be a Wellesley College student. We will enforce this through a simple front-end check that will confirm the user input an email ending in @wellesley.edu. This will also increase trust in our website by guaranteeing users that they are talking to real Wellesley College students

Users will be able to filter locations using tags. These tags could include noise level. This will ensure users can easily find study locations that best fit their needs. 

Users can add a pin for a location on the Wellesley College campus map where they can then input their review of the location. Making the process to start a review as easy as possible by letting users just click on a map (using a map API Leaflet) promotes app usability.

Users can write a short text review for places and can also upload a photo. A user also has to answer other questions, such as the name of the location, adding tags, rating out of 5 stars, a general description review, and an image. This is the main component of our application that ensures users get to see the feedback and opinions of other students. 

## Data to be Collected 
The database will have two main collections: users and reviews. 

Users store details like name, email, passwords, and role. 

Reviews store user ID, location ID, ratings, text, photo filename, tags, and timestamp.

Queries should include features like retrieving a specific user's review history and getting average ranking of locations for display. 

Web forms will need to handle user registration, login, review creation, and photo uploads.


## Programmers
[Gloria](https://github.com/gloriapul) & [Clara](https://github.com/Incodi)

## Status

WellesleySpots is near completion. As it currently stands, we support review creation, deletion, and modification. Users also have the ability to search for other reviews and like them. We currently need to add comments, complete our collections page, and support stronger profile customization options such as resetting passwords. 

## Directions for use 

1. To get started, sign up or log into account
2. You can find your account information in profile page
3. View reviews under Review → Create Review element in navigation bar 
- Can click the marker to View Details, which will show the expanded version of the review with a placeholder for a comments section that will be implemented in a future version
4. Create review on that same page in form
- Each field, except for photo, must be filled out
- Upon form submission, you will be redirected to your newly created review
4. Modify or delete your review
5. Search for other reviews under Review → Search Reviews element in navigation bar 
- Can fill out any field as long as at least one is filled out
6. Can like other reviews
7. Find your own reviews and liked reviews in Collections page
