'use strict';

// Flips review's state to either the view or update mode
function showUpdate() {
    $('#change-review').toggle();
    $('#review').toggle();
    $('#click-changes-button').toggle()
}

$(document).on('click', '#click-changes-button', function () {
    showUpdate();
});

$(document).on('click', '#cancel-changes-button', function () {
    showUpdate();
});