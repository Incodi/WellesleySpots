'use strict';
$(document).ready(function() {
    const map = L.map('map').setView([42.293243, -71.305604], 16);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);

    function onMapClick(e) {
        const xCoordinates = $('input[name="x_coordinates"]');
        const yCoordinates = $('input[name="y_coordinates"]');
        if (xCoordinates.length && yCoordinates.length) {
            xCoordinates.val(e.latlng.lat);
            yCoordinates.val(e.latlng.lng);
        }
    }

    map.on('click', onMapClick); // load coordinates for user

    // retrieve existing reviews & create markers for them 
    const reviews = JSON.parse($('#data').html() || '[]');
    reviews.forEach(function(review) {
        const xCoordinates = parseFloat(review.x_coordinates);
        const yCoordinates = parseFloat(review.y_coordinates);
            L.marker([xCoordinates, yCoordinates])
                .addTo(map)
                .bindPopup(
                    `<b>${review.title}</b><br>
                     <i>${review.location_name}</i><br>
                     ${review.review}<br>
                     ${review.rating} stars<br>
                     <a href="/review/${review.rr}">View Details</a>`
                );
    });

    // create marker for new review when form submitted
    $('.createreview').on('submit', function(e) {
        e.preventDefault();
        const form = $(this);
        const formData = form.serialize();

        $.ajax({
            url: form.attr('action'),
            type: form.attr('method'),
            data: formData,
            success: function(review) {
                const xCoordinates = parseFloat(review.x_coordinates);
                const yCoordinates = parseFloat(review.y_coordinates);
                    L.marker([xCoordinates, yCoordinates])
                        .addTo(map)
                        .bindPopup(
                            `<b>${review.title}</b><br>
                             <i>${review.location_name}</i><br>
                             ${review.review}<br>
                             ${review.rating} stars<br>
                             <a href="/review/${review.rr}">View Details</a>`
                        )
                        .openPopup();
            }
        });
    });
});