// ================= API KEYS =================
const WEATHER_API = "0c2d1ffade57eaa1ad12b6c3eb3f5f82";
const GEMINI_API = "AIzaSyAQzfVBDL8wEIJ9i4pxTPqdU0Hfu9zZ0E4";

// Firebase (already initialized in HTML)
const auth = window.auth;
const db = window.db;

// ================= GLOBAL =================
let map, marker, directionsService, directionsRenderer, placeMarkers = [];

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
    const emailVal = document.getElementById("email").value;
    const passVal = document.getElementById("password").value;

    auth.signInWithEmailAndPassword(emailVal, passVal)
        .then(() => displayTrips())
        .catch(e => showError(e.message));
};

window.signup = () => {
    const emailVal = document.getElementById("email").value;
    const passVal = document.getElementById("password").value;

    auth.createUserWithEmailAndPassword(emailVal, passVal)
        .then(() => showError("Signup success ✅"))
        .catch(e => showError(e.message));
};

window.logout = () => auth.signOut();

// ================= PLAN TRIP =================
window.planTrip = async () => {
    let dest = document.getElementById("destination").value.trim();
    let dayCount = document.getElementById("days").value;
    let startDate = document.getElementById("startDate").value;

    if (!dest || !dayCount) {
        return showError("Enter destination & days!");
    }

    let user = auth.currentUser;
    if (!user) return showError("Login first!");

    try {
        await db.collection("trips").add({
            userId: user.uid,
            destination: dest,
            days: Number(dayCount),
            startDate
        });

        showError("Trip added ✅");
        displayTrips();

    } catch (err) {
        console.error(err);
        showError("Save failed ❌");
    }
};

// ================= DISPLAY TRIPS =================
async function displayTrips() {
    let user = auth.currentUser;
    if (!user) return;

    const resultDiv = document.getElementById("result");
    const countDiv = document.getElementById("tripCount");

    try {
        let snap = await db.collection("trips")
            .where("userId", "==", user.uid)
            .get();

        resultDiv.innerHTML = "";
        countDiv.innerText = "Trips: " + snap.size;

        if (snap.empty) {
            resultDiv.innerHTML = "<p>No trips yet 😢</p>";
            return;
        }

        snap.forEach(doc => {
            let t = doc.data();

            resultDiv.innerHTML += `
            <div class="card">
                <img src="https://source.unsplash.com/400x200/?${t.destination}" />
                <h3>${t.destination}</h3>
                <p>📅 ${t.startDate || "Not set"}</p>
                <p>⏳ ${t.days} days</p>

                <button onclick="showLocation('${t.destination}')">📍 Map</button>
                <button onclick="showRoute()">🧭 Route</button>
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
    let start = document.getElementById("start").value;
    let dest = document.getElementById("destination").value;

    if (!start || !dest) {
        return showError("Enter start & destination!");
    }

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
};

// ================= CURRENT LOCATION =================
window.getCurrentLocation = () => {
    navigator.geolocation.getCurrentPosition(pos => {
        let loc = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude
        };

        map.setCenter(loc);
        map.setZoom(14);
        marker.setPosition(loc);

    }, () => showError("Location denied ❌"));
};

// ================= WEATHER + MAP =================
window.showLocation = async (city) => {
    if (!city) return;

    try {
        let res = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&appid=${WEATHER_API}`
        );

        let data = await res.json();

        if (!data.coord) return showError("Location not found!");

        let pos = {
            lat: data.coord.lat,
            lng: data.coord.lon
        };

        map.setCenter(pos);
        map.setZoom(12);
        marker.setPosition(pos);

        // WEATHER UI
        const aiBox = document.getElementById("aiResult");
        aiBox.style.display = "block";

        aiBox.innerHTML = `
            <h3>🌦️ Weather in ${city}</h3>
            <p>🌡️ Temp: ${data.main.temp}°C</p>
            <p>☁️ ${data.weather[0].description}</p>
            <p>💨 Wind: ${data.wind.speed} m/s</p>
        `;

    } catch {
        showError("Weather error ❌");
    }
};

// ================= AI PLANNER =================
window.getSuggestion = async () => {
    const aiBox = document.getElementById("aiResult");

    aiBox.style.display = "block";
    aiBox.innerHTML = "🤖 Planning your trip...";

    let dest = document.getElementById("destination").value;
    let days = document.getElementById("days").value;

    try {
        let res = await fetch(
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

        let data = await res.json();
        let text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

        aiBox.innerHTML = text
            ? text.replace(/\n/g, "<br>")
            : "No AI response 😢";

    } catch {
        aiBox.innerHTML = "AI error ❌";
    }
};

// ================= PDF =================
window.downloadPDF = () =>
    html2pdf().from(document.body).save("plan.pdf");

// ================= CLEAR =================
window.clearTrips = async () => {
    let user = auth.currentUser;
    if (!user) return;

    if (!confirm("Clear all trips?")) return;

    let snap = await db.collection("trips")
        .where("userId", "==", user.uid)
        .get();

    let batch = db.batch();
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
