// ================= API KEYS =================
const WEATHER_API = "0c2d1ffade57eaa1ad12b6c3eb3f5f82";
const GEMINI_API = "AIzaSyAQzfVBDL8wEIJ9i4pxTPqdU0Hfu9zZ0E4";

// ================= FIREBASE =================
const auth = window.auth;
const db = window.db;

// ================= GLOBAL =================
let map = null;
let marker = null;
let directionsService = null;
let directionsRenderer = null;
let placeMarkers = [];
let watchId = null;
let musicPlaying = false;

// ================= MAP =================
window.initMap = function () {
    const loc = { lat: 7.8731, lng: 80.7718 };

    map = new google.maps.Map(document.getElementById("map"), {
        zoom: 7,
        center: loc
    });

    marker = new google.maps.Marker({
        position: loc,
        map: map
    });

    directionsService = new google.maps.DirectionsService();
    directionsRenderer = new google.maps.DirectionsRenderer({
        suppressMarkers: false
    });
    directionsRenderer.setMap(map);

    const startInput = document.getElementById("start");
    const destInput = document.getElementById("destination");

    if (startInput) new google.maps.places.Autocomplete(startInput);
    if (destInput) new google.maps.places.Autocomplete(destInput);
};

// ================= AUTH =================
window.login = () => {
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();

    if (!email || !password) return showError("Enter email & password!");

    auth.signInWithEmailAndPassword(email, password)
        .then(() => showError("Login success ✅"))
        .catch(e => showError(e.message));
};

window.signup = () => {
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();

    if (!email || !password) return showError("Enter email & password!");

    auth.createUserWithEmailAndPassword(email, password)
        .then(() => showError("Signup success ✅"))
        .catch(e => showError(e.message));
};

window.logout = () => auth.signOut();

// ================= PLAN TRIP =================
window.planTrip = async () => {
    const dest = document.getElementById("destination").value.trim();
    const days = document.getElementById("days").value;
    const startDate = document.getElementById("startDate").value;

    if (!dest || !days) return showError("Enter destination & days!");

    const user = auth.currentUser;
    if (!user) return showError("Login first!");

    try {
        await db.collection("trips").add({
            userId: user.uid,
            destination: dest,
            days: Number(days),
            startDate
        });

        showError("Trip added ✅");
        displayTrips();

    } catch (err) {
        console.error(err);
        showError("Save failed ❌");
    }
};

// ================= DISPLAY =================
async function displayTrips() {
    const user = auth.currentUser;
    if (!user) return;

    const resultDiv = document.getElementById("result");
    const countDiv = document.getElementById("tripCount");

    try {
        const snap = await db.collection("trips")
            .where("userId", "==", user.uid)
            .get();

        resultDiv.innerHTML = "";
        countDiv.innerText = "Trips: " + snap.size;

        if (snap.empty) {
            resultDiv.innerHTML = "<p>No trips yet 😢</p>";
            return;
        }

        snap.forEach(doc => {
            const t = doc.data();

            resultDiv.innerHTML += `
            <div class="card">
                <div class="gallery">
                    <img src="https://picsum.photos/400/200?random=${Math.random()}">
                    <img src="https://picsum.photos/400/200?random=${Math.random()}">
                    <img src="https://picsum.photos/400/200?random=${Math.random()}">
                </div>

                <h3>${t.destination}</h3>
                <p>📅 ${t.startDate || "Not set"}</p>
                <p>⏳ ${t.days} days</p>

                <button onclick="showLocation('${t.destination}')">📍 Map</button>
                <button onclick="showRouteTo('${t.destination}')">🧭 Route</button>
                <button onclick="deleteTrip('${doc.id}')">❌ Delete</button>
            </div>`;
        });

    } catch (err) {
        console.error(err);
        showError("Load failed ❌");
    }
}

// ================= DELETE =================
window.deleteTrip = id => {
    if (!confirm("Delete this trip?")) return;

    db.collection("trips").doc(id).delete()
        .then(displayTrips)
        .catch(() => showError("Delete failed ❌"));
};

// ================= ROUTE =================
window.showRoute = () => {
    const start = document.getElementById("start").value;
    const dest = document.getElementById("destination").value;

    if (!start || !dest) return showError("Enter start & destination!");
    drawRoute(start, dest);
};

window.showRouteTo = (dest) => {
    const start = document.getElementById("start").value;
    if (!start) return showError("Enter start location!");
    drawRoute(start, dest);
};

function drawRoute(startLoc, destLoc) {
    if (!directionsService || !directionsRenderer) return;

    // 🔥 clear old route
    directionsRenderer.setDirections({ routes: [] });

    directionsService.route({
        origin: startLoc,
        destination: destLoc,
        travelMode: google.maps.TravelMode.DRIVING
    }, (res, status) => {
        if (status === "OK") {
            directionsRenderer.setDirections(res);
        } else {
            showError("Route not found ❌");
        }
    });
}

// ================= LIVE LOCATION =================
window.getCurrentLocation = () => {
    if (!navigator.geolocation) return showError("Not supported");

    if (watchId) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
        return showError("Tracking stopped ❌");
    }

    watchId = navigator.geolocation.watchPosition(pos => {
        const loc = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude
        };

        if (map && marker) {
            map.setCenter(loc);
            map.setZoom(15);
            marker.setPosition(loc);
        }

    }, () => showError("Location denied ❌"));

    showError("Tracking started 📍");
};

// ================= MUSIC =================
window.toggleMusic = () => {
    const music = document.getElementById("bg-music");

    if (!musicPlaying) {
        music.play().catch(() => showError("Click again 🎵"));
        musicPlaying = true;
    } else {
        music.pause();
        musicPlaying = false;
    }
};

// ================= THEME =================
window.toggleTheme = () => {
    document.body.classList.toggle("light-mode");

    if (document.body.classList.contains("light-mode")) {
        localStorage.setItem("theme", "light");
    } else {
        localStorage.setItem("theme", "dark");
    }
};

// ================= LOAD THEME =================
window.onload = () => {
    if (localStorage.getItem("theme") === "light") {
        document.body.classList.add("light-mode");
    }
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
    const authBox = document.getElementById("auth-box");
    const appBox = document.getElementById("app");

    if (user) {
        authBox.style.display = "none";
        appBox.style.display = "block";
        displayTrips();
    } else {
        authBox.style.display = "block";
        appBox.style.display = "none";
    }
});
