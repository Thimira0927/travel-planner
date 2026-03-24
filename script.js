```javascript
// 🌦️ Weather API
const WEATHER_API = "0c2d1ffade57eaa1ad12b6c3eb3f5f82";

// 🤖 Gemini API
const GEMINI_API = "AIzaSyAQzfVBDL8wEIJ9i4pxTPqdU0Hfu9zZ0E4";

let map, marker, directionsService, directionsRenderer;

// ================= MAP =================
window.initMap = function () {
    const defaultLocation = { lat: 7.8731, lng: 80.7718 };

    map = new google.maps.Map(document.getElementById("map"), {
        zoom: 7,
        center: defaultLocation
    });

    marker = new google.maps.Marker({
        position: defaultLocation,
        map: map
    });

    directionsService = new google.maps.DirectionsService();
    directionsRenderer = new google.maps.DirectionsRenderer();
    directionsRenderer.setMap(map);

    initAutocomplete();
};

// ================= AUTOCOMPLETE =================
function initAutocomplete() {
    let startInput = document.getElementById("start");
    let destInput = document.getElementById("destination");

    if (google.maps.places) {
        if (startInput) new google.maps.places.Autocomplete(startInput);
        if (destInput) new google.maps.places.Autocomplete(destInput);
    }
}

// ================= PLAN TRIP =================
window.planTrip = async function () {
    let destination = document.getElementById("destination").value.trim();
    let days = document.getElementById("days").value;
    let startDate = document.getElementById("tripDate")?.value;

    if (!destination || !days || !startDate) {
        return showError("Enter all details!");
    }

    let user = auth.currentUser;
    if (!user) return showError("Login first!");

    try {
        await db.collection("trips").add({
            userId: user.uid,
            destination,
            days: Number(days),
            startDate,
            createdAt: new Date()
        });

        showError("Trip saved ✅");
        displayTrips();

    } catch (err) {
        console.error(err);
        showError("Save failed ❌");
    }
};

// ================= DELETE =================
window.deleteTrip = async function (id) {
    if (!confirm("Delete this trip?")) return;

    try {
        await db.collection("trips").doc(id).delete();
        displayTrips();
    } catch (err) {
        console.error(err);
        showError("Delete failed ❌");
    }
};

// ================= CLEAR =================
window.clearTrips = async function () {
    if (!confirm("Clear all trips?")) return;

    let user = auth.currentUser;
    if (!user) return;

    let snapshot = await db.collection("trips")
        .where("userId", "==", user.uid)
        .get();

    let batch = db.batch();
    snapshot.forEach(doc => batch.delete(doc.ref));
    await batch.commit();

    displayTrips();
};

// ================= LOCATION =================
window.getCurrentLocation = function () {
    navigator.geolocation.getCurrentPosition(pos => {
        let loc = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude
        };

        map.setCenter(loc);
        map.setZoom(14);
        marker.setPosition(loc);

        document.getElementById("start").value =
            `${loc.lat}, ${loc.lng}`;

    }, () => showError("Location denied ❌"));
};

// ================= ROUTE =================
window.getDirections = function () {

    let start = document.getElementB
```
