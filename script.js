```javascript
// 🌦️ Weather API
const WEATHER_API = "0c2d1ffade57eaa1ad12b6c3eb3f5f82";

// 🤖 Gemini API
const GEMINI_API = "AIzaSyAQzfVBDL8wEIJ9i4pxTPqdU0Hfu9zZ0E4";

const UNSPLASH_KEY = "ok8kLwCbK6NEj3MkXKe_YSzNgh_kDZXoApEif2pYyKY";

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
    let startDate = document.getElementById("startDate").value;

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

// ================= THEME =================
window.toggleTheme = function () {
    document.body.classList.toggle("light-mode");
};

// ================= MUSIC =================
window.toggleMusic = function () {
    let music = document.getElementById("bg-music");

    if (!music) return;

    if (music.paused) {
        music.play().catch(() => {
            alert("Click again to enable music 🎵");
        });
    } else {
        music.pause();
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

// ================= SHOW LOCATION =================
window.showLocation = async function (city) {
    if (!city) return showError("Enter destination!");

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

    let start = document.getElementById("start").value.trim();
    let end = document.getElementById("destination").value.trim();

    if (!start || !end) {
        return showError("Enter start & destination!");
    }

    directionsService.route({
        origin: start,
        destination: end,
        travelMode: google.maps.TravelMode.DRIVING
    }, (res, status) => {

        if (status === "OK") {
            directionsRenderer.setDirections(res);

            let route = res.routes[0].legs[0];
            showError(`Distance: ${route.distance.text} | Time: ${route.duration.text}`);

        } else {
            showError("Route not found ❌");
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

// ================= DATE =================
function calculateEndDate(startDate, days) {
    let d = new Date(startDate);
    d.setDate(d.getDate() + Number(days) - 1);
    return d.toLocaleDateString();
}

// ================= AI =================
window.getSuggestion = async function () {
    let destination = document.getElementById("destination").value;
    let days = document.getElementById("days").value || 3;

    if (!destination) return showError("Enter destination!");

    let box = document.getElementById("aiResult");
    box.style.display = "block";
    box.innerHTML = "🤖 Generating plan...";

    try {
        let res = await fetch(
          `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${GEMINI_API}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{
                parts: [{
                  text: `Plan a ${days}-day trip to ${destination}`
                }]
              }]
            })
          }
        );

        let data = await res.json();
        let text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!text) text = generateLocalPlan(destination, days);

        box.innerHTML = `<h3>🤖 AI Plan</h3><p>${text.replace(/\n/g, "<br>")}</p>`;

    } catch {
        box.innerHTML = generateLocalPlan(destination, days);
    }
};

// ================= LOCAL AI =================
function generateLocalPlan(destination, days) {
    let plan = `<h3>🤖 AI Plan</h3>`;

    for (let i = 1; i <= days; i++) {
        plan += `<p><b>Day ${i}</b>: Explore, Food, Photos 📸</p>`;
    }

    return plan;
}

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
        let endDate = calculateEndDate(t.startDate, t.days);

        resultDiv.innerHTML += `
        <div class="card">
            <h2>${t.destination}</h2>
            <p>📅 Start: ${t.startDate}</p>
            <p>🏁 End: ${endDate}</p>
            <p>${weather}</p>
            <p>⏳ Days: ${t.days}</p>

            <button onclick="showLocation('${t.destination}')">📍 Map</button>
            <button onclick="deleteTrip('${doc.id}')">❌ Delete</button>
        </div>`;
    }
}

// ================= PDF DOWNLOAD =================
window.downloadPDF = function () {

    let element = document.getElementById("app");

    if (!element) {
        return showError("Nothing to download ❌");
    }

    let opt = {
        margin: 0.5,
        filename: 'travel-plans.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(element).save();
};

// ================= ERROR =================
function showError(msg) {
    let e = document.getElementById("error");
    if (!e) return;

    e.innerText = msg;
    setTimeout(() => e.innerText = "", 4000);
}

// ================= AUTO LOAD =================
auth.onAuthStateChanged(user => {
    if (user) displayTrips();
});
```
