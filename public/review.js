'use strict';

// Flips user's view of review's details page to view of the update form and back
function showReviewUpdate() {
    $('#change-review').toggle();
    $('#review-details').toggle();
    $('#click-changes-button').toggle()
}

// Flips user's view of the comment section from just viewing to the add comment form and back
function showCreateComment() {
    $('#show-comment-form').toggle();
    $('#add-comment-button').toggle()
}

$(document).on('click', '#click-changes-button', function () {
    showReviewUpdate();
});

$(document).on('click', '#cancel-changes-button', function () {
    showReviewUpdate();
});

$(document).on('click', '#add-comment-button', function () {
    showCreateComment();
});

$(document).on('click', '#cancel-comment-button', function () {
    showCreateComment();
});