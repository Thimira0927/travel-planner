// ================= API KEYS =================
const WEATHER_API = "0c2d1ffade57eaa1ad12b6c3eb3f5f82";
const GEMINI_API = "AIzaSyAQzfVBDL8wEIJ9i4pxTPqdU0Hfu9zZ0E4";

// Firebase
const auth = window.auth;
const db = window.db;

// ================= GLOBAL =================
let map, marker, directionsService, directionsRenderer;

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

    new google.maps.places.Autocomplete(document.getElementById("start"));
    new google.maps.places.Autocomplete(document.getElementById("destination"));
};

// ================= AUTH =================
window.login = () => {
    const email = document.getElementById("email").value;
    const pass = document.getElementById("password").value;

    auth.signInWithEmailAndPassword(email, pass)
        .then(() => displayTrips())
        .catch(e => showError(e.message));
};

window.signup = () => {
    const email = document.getElementById("email").value;
    const pass = document.getElementById("password").value;

    auth.createUserWithEmailAndPassword(email, pass)
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
                <img src="https://source.unsplash.com/400x200/?${t.destination}" />
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

// BUTTON ROUTE (inputs වලින්)
window.showRoute = () => {
    const start = document.getElementById("start").value;
    const dest = document.getElementById("destination").value;

    if (!start || !dest) return showError("Enter start & destination!");

    drawRoute(start, dest);
};

// CARD ROUTE (destination only)
window.showRouteTo = (dest) => {
    const start = document.getElementById("start").value;

    if (!start) return showError("Enter start location!");

    drawRoute(start, dest);
};

// CORE ROUTE FUNCTION
function drawRoute(start, dest) {
    if (!directionsService) return;

    directionsService.route({
        origin: start,
        destination: dest,
        travelMode: "DRIVING"
    }, (res, status) => {

        if (status === "OK") {
            directionsRenderer.setDirections(res);
        } else {
            showError("Route not found ❌");
        }
    });
}

// ================= CURRENT LOCATION =================
window.getCurrentLocation = () => {
    if (!navigator.geolocation) return showError("Geolocation not supported");

    navigator.geolocation.getCurrentPosition(pos => {
        const loc = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude
        };

        map.setCenter(loc);
        map.setZoom(14);
        marker.setPosition(loc);

    }, () => showError("Location denied ❌"));
};

// ================= LOCATION + WEATHER =================
window.showLocation = async (city) => {
    try {
        const res = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&appid=${WEATHER_API}`
        );

        const data = await res.json();

        if (!data.coord) return showError("Location not found!");

        const pos = {
            lat: data.coord.lat,
            lng: data.coord.lon
        };

        map.setCenter(pos);
        map.setZoom(12);
        marker.setPosition(pos);

        // WEATHER BOX
        const box = document.getElementById("aiResult");
        box.style.display = "block";

        box.innerHTML = `
            <h3>🌦️ Weather - ${city}</h3>
            <p>🌡️ ${data.main.temp}°C</p>
            <p>☁️ ${data.weather[0].description}</p>
            <p>💨 Wind: ${data.wind.speed} m/s</p>
        `;

    } catch {
        showError("Weather error ❌");
    }
};

// ================= AI =================
window.getSuggestion = async () => {
    const box = document.getElementById("aiResult");

    const dest = document.getElementById("destination").value;
    const days = document.getElementById("days").value;

    if (!dest || !days) return showError("Enter destination & days!");

    box.style.display = "block";
    box.innerHTML = "🤖 Generating plan...";

    try {
        const res = await fetch(
            `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${GEMINI_API}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: `Create a ${days}-day travel plan for ${dest}. Include places, food, and tips.`
                        }]
                    }]
                })
            }
        );

        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

        box.innerHTML = text
            ? text.replace(/\n/g, "<br>")
            : "No AI response 😢";

    } catch {
        box.innerHTML = "AI error ❌";
    }
};

// ================= PDF =================
window.downloadPDF = () =>
    html2pdf().from(document.body).save("travel-plan.pdf");

// ================= CLEAR =================
window.clearTrips = async () => {
    const user = auth.currentUser;
    if (!user) return;

    if (!confirm("Clear all trips?")) return;

    const snap = await db.collection("trips")
        .where("userId", "==", user.uid)
        .get();

    const batch = db.batch();
    snap.forEach(doc => batch.delete(doc.ref));

    await batch.commit();
    displayTrips();
};

// ================= ERROR =================
function showError(msg) {
    const e = document.getElementById("error");
    e.innerText = msg;
    setTimeout(() => e.innerText = "", 4000);
}

// ================= AUTO LOAD =================
auth.onAuthStateChanged(user => {
    if (user) displayTrips();
});
