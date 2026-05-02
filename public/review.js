'use strict';

// Flips review's state to either the view or update mode
function showReviewUpdate() {
    $('#change-review').toggle();
    $('#review-details').toggle();
    $('#click-changes-button').toggle()
}

// Flips comments container to either the view or create comment mode
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