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

    map.on('click', onMapClick);

    const reviews = JSON.parse($('#reviews_data').html() || '[]');
    reviews.forEach(function(r) {
        const xCoordinates = parseFloat(r.x_coordinates);
        const yCoordinates = parseFloat(r.y_coordinates);
            L.marker([xCoordinates, yCoordinates])
                .addTo(map)
                .bindPopup(
                    `<b>${r.title}</b><br>
                     <i>${r.location_name}</i><br>
                     ${r.review}<br>
                     ${r.rating} stars<br>
                     <a href="/review/${r.id}">View Details</a>`
                );
    });

    let action = $('#action').val();

    $('#create_section').toggle(action === 'create');
    $('#search_section').toggle(action === 'search');

    $('#action').on('change', function() {
        action = $(this).val();
        $('#create_section').toggle(action === 'create');
        $('#search_section').toggle(action === 'search');
    });

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
                             <a href="/review/${review.id}">View Details</a>`
                        )
                        .openPopup();
            }
        });
    });
});