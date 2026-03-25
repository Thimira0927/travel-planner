// ================= API KEYS =================
const WEATHER_API = "0c2d1ffade57eaa1ad12b6c3eb3f5f82";

// ================= FIREBASE =================
const auth = window.auth;
const db = window.db;

// ================= GLOBAL =================
let map = null;
let marker = null;
let directionsService = null;
let directionsRenderer = null;
let watchId = null;
let musicPlaying = false;

// ================= MAP =================
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

    const startInput = document.getElementById("start");
    const destInput = document.getElementById("destination");

    if (startInput) new google.maps.places.Autocomplete(startInput);
    if (destInput) new google.maps.places.Autocomplete(destInput);
};

// ================= AUTH =================
window.login = () => {
    const email = emailVal();
    const password = passVal();

    if (!email || !password) return showError("Enter email & password!");

    auth.signInWithEmailAndPassword(email, password)
        .then(() => showError("Login success ✅"))
        .catch(e => showError(e.message));
};

window.signup = () => {
    const email = emailVal();
    const password = passVal();

    if (!email || !password) return showError("Enter email & password!");

    auth.createUserWithEmailAndPassword(email, password)
        .then(() => showError("Signup success ✅"))
        .catch(e => showError(e.message));
};

window.logout = () => auth.signOut();

const emailVal = () => document.getElementById("email").value.trim();
const passVal = () => document.getElementById("password").value.trim();

// ================= PLAN =================
window.planTrip = async () => {
    const dest = document.getElementById("destination").value.trim();
    const days = document.getElementById("days").value;
    const startDate = document.getElementById("startDate").value;

    if (!dest || !days) return showError("Enter destination & days!");

    const user = auth.currentUser;
    if (!user) return showError("Login first!");

    await db.collection("trips").add({
        userId: user.uid,
        destination: dest,
        days: Number(days),
        startDate
    });

    showError("Trip added ✅");
    displayTrips();
};

// ================= DISPLAY =================
async function displayTrips() {
    const user = auth.currentUser;
    if (!user) return;

    const snap = await db.collection("trips")
        .where("userId", "==", user.uid)
        .get();

    const resultDiv = document.getElementById("result");
    const countDiv = document.getElementById("tripCount");

    resultDiv.innerHTML = "";
    countDiv.innerText = "Trips: " + snap.size;

    snap.forEach(doc => {
        const t = doc.data();

        resultDiv.innerHTML += `
        <div class="card">
            <h3>${t.destination}</h3>
            <p>📅 ${t.startDate || "Not set"}</p>
            <p>⏳ ${t.days} days</p>

            <button onclick="showLocation('${t.destination}')">📍 Map</button>
            <button onclick="showRouteTo('${t.destination}')">🧭 Route</button>
            <button onclick="deleteTrip('${doc.id}')">❌ Delete</button>
        </div>`;
    });
}

// ================= DELETE =================
window.deleteTrip = id => {
    db.collection("trips").doc(id).delete().then(displayTrips);
};

// ================= ROUTE =================
window.showRouteTo = (dest) => {
    const start = document.getElementById("start").value;
    if (!start) return showError("Enter start!");

    directionsService.route({
        origin: start,
        destination: dest,
        travelMode: "DRIVING"
    }, (res, status) => {
        if (status === "OK") {
            directionsRenderer.setDirections(res);
        }
    });
};

// ================= 🔥 FIXED MAP =================
window.showLocation = (city) => {
    if (!map) return showError("Map not ready ❌");

    const geocoder = new google.maps.Geocoder();

    geocoder.geocode({ address: city }, (results, status) => {
        if (status === "OK") {

            const loc = results[0].geometry.location;

            map.setCenter(loc);
            map.setZoom(12);
            marker.setPosition(loc);

            // clear route
            directionsRenderer.setDirections({ routes: [] });

            // optional weather
            fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&appid=${WEATHER_API}`)
                .then(res => res.json())
                .then(data => {
                    document.getElementById("weatherBox").innerHTML = `
                        <div class="card">
                            <h3>🌦️ ${city}</h3>
                            <p>🌡️ ${data.main?.temp || "-"}°C</p>
                        </div>
                    `;
                });

        } else {
            showError("Location not found ❌");
        }
    });
};

// ================= LOCATION =================
window.getCurrentLocation = () => {
    navigator.geolocation.getCurrentPosition(pos => {
        const loc = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude
        };

        map.setCenter(loc);
        map.setZoom(15);
        marker.setPosition(loc);
    });
};

// ================= THEME =================
window.toggleTheme = () => {
    document.body.classList.toggle("light-mode");
};

// ================= MUSIC =================
window.toggleMusic = () => {
    const m = document.getElementById("bg-music");

    if (!musicPlaying) {
        m.play();
    } else {
        m.pause();
    }

    musicPlaying = !musicPlaying;
};

// ================= ERROR =================
function showError(msg) {
    const e = document.getElementById("error");
    if (!e) return;
    e.innerText = msg;
    setTimeout(() => e.innerText = "", 3000);
}

// ================= AUTH STATE =================
auth.onAuthStateChanged(user => {
    document.getElementById("auth-box").style.display = user ? "none" : "block";
    document.getElementById("app").style.display = user ? "block" : "none";

    if (user) displayTrips();
});
