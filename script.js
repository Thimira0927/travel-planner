const WEATHER_API = "0c2d1ffade57eaa1ad12b6c3eb3f5f82";
const GEMINI_API = "AIzaSyAQzfVBDL8wEIJ9i4pxTPqdU0Hfu9zZ0E4";

const auth = window.auth;
const db = window.db;

let map, marker, directionsService, directionsRenderer, placeMarkers = [];

// MAP
window.initMap = function () {
    const loc = { lat: 7.8731, lng: 80.7718 };

    map = new google.maps.Map(document.getElementById("map"), {
        zoom: 7,
        center: loc
    });

    marker = new google.maps.Marker({ position: loc, map });

    directionsService = new google.maps.DirectionsService();
    directionsRenderer = new google.maps.DirectionsRenderer();
    directionsRenderer.setMap(map);

    new google.maps.places.Autocomplete(document.getElementById("start"));
    new google.maps.places.Autocomplete(document.getElementById("destination"));
};

// AUTH
window.login = () => {
    const emailVal = document.getElementById("email").value;
    const passVal = document.getElementById("password").value;

    auth.signInWithEmailAndPassword(emailVal, passVal)
        .catch(e => alert(e.message));
};

window.signup = () => {
    const emailVal = document.getElementById("email").value;
    const passVal = document.getElementById("password").value;

    auth.createUserWithEmailAndPassword(emailVal, passVal)
        .catch(e => alert(e.message));
};

window.logout = () => auth.signOut();

// PLAN
window.planTrip = async () => {
    let dest = document.getElementById("destination").value;
    let dayCount = document.getElementById("days").value;
    let startDate = document.getElementById("startDate").value;

    let user = auth.currentUser;
    if (!user) return alert("Login first");

    await db.collection("trips").add({
        userId: user.uid,
        destination: dest,
        days: dayCount,
        startDate
    });

    displayTrips();
};

// DISPLAY
async function displayTrips() {
    let user = auth.currentUser;
    if (!user) return;

    const resultDiv = document.getElementById("result");
    const countDiv = document.getElementById("tripCount");

    let snap = await db.collection("trips")
        .where("userId", "==", user.uid)
        .get();

    resultDiv.innerHTML = "";
    countDiv.innerText = "Trips: " + snap.size;

    snap.forEach(doc => {
        let t = doc.data();
        resultDiv.innerHTML += `
        <div class="card">
        <h3>${t.destination}</h3>
        <p>${t.startDate} (${t.days} days)</p>
        <button onclick="deleteTrip('${doc.id}')">Delete</button>
        </div>`;
    });
}

// DELETE
window.deleteTrip = id =>
    db.collection("trips").doc(id).delete().then(displayTrips);

// ROUTE
window.showRoute = () => {
    directionsService.route({
        origin: document.getElementById("start").value,
        destination: document.getElementById("destination").value,
        travelMode: "DRIVING"
    }, (res, status) => {
        if (status === "OK") {
            directionsRenderer.setDirections(res);
        }
    });
};

// PLACES
window.findPlaces = type => {
    placeMarkers.forEach(m => m.setMap(null));
    placeMarkers = [];

    new google.maps.places.PlacesService(map).nearbySearch({
        location: map.getCenter(),
        radius: 2000,
        type: [type]
    }, (res, status) => {

        if (status !== "OK") return;

        res.forEach(p => {
            let m = new google.maps.Marker({
                map,
                position: p.geometry.location
            });
            placeMarkers.push(m);
        });
    });
};

// LOCATION
window.getCurrentLocation = () => {
    navigator.geolocation.getCurrentPosition(pos => {
        let loc = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude
        };
        map.setCenter(loc);
        marker.setPosition(loc);
    });
};

// AI
window.getSuggestion = async () => {
    const aiBox = document.getElementById("aiResult");
    aiBox.style.display = "block";
    aiBox.innerHTML = "Loading...";

    let res = await fetch(
        `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${GEMINI_API}`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: `Plan trip to ${document.getElementById("destination").value}` }] }]
            })
        }
    );

    let data = await res.json();
    let text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "No AI result";

    aiBox.innerHTML = text.replace(/\n/g, "<br>");
};

// PDF
window.downloadPDF = () =>
    html2pdf().from(document.body).save("plan.pdf");

// CLEAR
window.clearTrips = () =>
    document.getElementById("result").innerHTML = "";
