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
    let input = document.getElementById("destination");
    if (input && google.maps.places) {
        new google.maps.places.Autocomplete(input);
    }
}

// ================= PLAN TRIP =================
window.planTrip = async function () {
    let destination = document.getElementById("destination").value.trim();
    let days = document.getElementById("days").value;

    if (!destination || !days) return showError("Enter all details!");

    let user = auth.currentUser;
    if (!user) return showError("Login first!");

    try {
        await db.collection("trips").add({
            userId: user.uid,
            destination,
            days: Number(days),
            date: new Date().toLocaleDateString()
        });

        showError("Trip saved ✅");
        displayTrips();

    } catch {
        showError("Save failed ❌");
    }
};

// ================= DELETE =================
window.deleteTrip = async function (id) {
    try {
        await db.collection("trips").doc(id).delete();
        displayTrips();
    } catch {
        showError("Delete failed ❌");
    }
};

// ================= CLEAR =================
window.clearTrips = async function () {
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

    }, () => showError("Location denied ❌"));
};

// ================= MUSIC =================
window.toggleMusic = function () {
    let music = document.getElementById("bg-music");

    if (!music) return;

    if (music.paused) {
        music.muted = false;
        music.play().catch(() => alert("Click again 🎵"));
    } else {
        music.pause();
    }
};

// ================= THEME =================
window.toggleTheme = function () {
    document.body.classList.toggle("light-mode");
};

// ================= WEATHER =================
async function getWeather(city) {
    try {
        let res = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${WEATHER_API}&units=metric`
        );

        let data = await res.json();

        if (data.cod !== 200) return "Not found ❌";

        let icon = data.weather[0].icon;
        let iconUrl = `https://openweathermap.org/img/wn/${icon}@2x.png`;

        return `<img src="${iconUrl}" width="40"> ${data.main.temp}°C`;

    } catch {
        return "Error ⚠️";
    }
}

// ================= MAP LOCATION =================
window.showLocation = async function (city) {
    try {
        let res = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${WEATHER_API}`
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

    } catch {
        showError("Map error ❌");
    }
};

// ================= ROUTE =================
window.showRoute = function () {
    let start = document.getElementById("start").value;
    let end = document.getElementById("destination").value;

    if (!start || !end) return showError("Enter start & destination!");

    directionsService.route({
        origin: start,
        destination: end,
        travelMode: "DRIVING"
    }, (res, status) => {
        if (status === "OK") {
            directionsRenderer.setDirections(res);
        } else {
            showError("Route not found!");
        }
    });
};

// ================= PLACES =================
window.findPlaces = function (type) {
    let service = new google.maps.places.PlacesService(map);

    service.nearbySearch({
        location: map.getCenter(),
        radius: 2000,
        type: [type]
    }, (results, status) => {

        if (status !== "OK") return;

        results.forEach(p => {
            new google.maps.Marker({
                map: map,
                position: p.geometry.location,
                title: p.name
            });
        });
    });
};

// ================= 🤖 AI SUGGESTION (FULL FIX) =================
window.getSuggestion = async function () {

    let destination = document.getElementById("destination").value;
    let days = document.getElementById("days").value || 3;

    if (!destination) return showError("Enter destination!");

    showError("AI planning... 🤖");

    try {
        let response = await fetch(
          `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${GEMINI_API}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              contents: [{
                parts: [{
                  text: `Plan a ${days}-day trip to ${destination}. Include places, food, and tips.`
                }]
              }]
            })
          }
        );

        let data = await response.json();
        console.log("AI:", data);

        let text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

        // 🔥 FALLBACK
        if (!text) {
            text = generateLocalPlan(destination, days);
        }

        alert("🤖 AI Plan:\n\n" + text);
        showError("");

    } catch (err) {
        console.error(err);

        let text = generateLocalPlan(destination, days);

        alert("🤖 AI Plan:\n\n" + text);
        showError("");
    }
};

// ================= 🔥 LOCAL AI =================
function generateLocalPlan(destination, days) {

    let plan = `🌍 ${days}-Day Trip to ${destination}\n\n`;

    for (let i = 1; i <= days; i++) {
        plan += `Day ${i}:\n`;
        plan += `- Visit popular places 🏛️\n`;
        plan += `- Try local food 🍜\n`;
        plan += `- Take photos 📸\n\n`;
    }

    plan += "Tips:\n- Start early 🌅\n- Use maps 🗺️\n- Stay safe";

    return plan;
}

// ================= PDF =================
window.downloadPDF = function () {
    html2pdf().from(document.getElementById("result")).save("travel-plan.pdf");
};

// ================= DISPLAY =================
async function displayTrips() {
    let user = auth.currentUser;
    if (!user) return;

    let resultDiv = document.getElementById("result");
    let countDiv = document.getElementById("tripCount");

    let snapshot = await db.collection("trips")
        .where("userId", "==", user.uid)
        .get();

    resultDiv.innerHTML = "";
    countDiv.innerHTML = `Total Trips: ${snapshot.size}`;

    if (snapshot.empty) {
        resultDiv.innerHTML = "<p>No trips yet 😢</p>";
        return;
    }

    for (const doc of snapshot.docs) {
        let t = doc.data();
        let weather = await getWeather(t.destination);

        let image = `https://source.unsplash.com/400x300/?${t.destination}`;

        resultDiv.innerHTML += `
        <div class="card">
            <img src="${image}">
            <h2>${t.destination}</h2>
            <p>${t.date}</p>
            <p>${weather}</p>
            <p>Days: ${t.days}</p>

            <button onclick="showLocation('${t.destination}')">📍 Map</button>
            <button onclick="deleteTrip('${doc.id}')">❌ Delete</button>
        </div>`;
    }
}

// ================= ERROR =================
function showError(msg) {
    let e = document.getElementById("error");
    if (!e) return;

    e.innerText = msg;
    setTimeout(() => e.innerText = "", 3000);
}

// ================= AUTO LOAD =================
auth.onAuthStateChanged(user => {
    if (user) displayTrips();
});
