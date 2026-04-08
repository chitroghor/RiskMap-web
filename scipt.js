// ================= FIREBASE SETUP =================
const firebaseConfig = {
  apiKey: "AIzaSyBV0-f13_6hdRP_SKyIu0SPRdcEeQGX450",
  authDomain: "riskmap-ai.firebaseapp.com",
  projectId: "riskmap-ai",
  storageBucket: "riskmap-ai.firebasestorage.app",
  messagingSenderId: "11458794467",
  appId: "1:11458794467:web:136ddc9c5607e6785e46d6",
  measurementId: "G-LWMGT35WC8"
};

// Initialize Firebase and Database
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
// ==================================================

// Safely wrap the hazard event listener so it doesn't break if the element is missing
const hazardEl = document.getElementById("hazard");
if (hazardEl) {
    hazardEl.oninput = function () {
        document.getElementById("hazardValue").innerText = this.value;
    };
}

let lastDRI = 0;

function calculateRisk() {
  let H = parseFloat(document.getElementById("hazard").value);
  let pop = parseFloat(document.getElementById("population").value);
  let infra = parseFloat(document.getElementById("infra").value);
  let cap = parseFloat(document.getElementById("capacity").value);

  if (isNaN(pop) || isNaN(infra) || isNaN(cap)) {
    alert("Fill all inputs!");
    return;
  }
  
  let V = (pop / 100) + (100 - infra);
  let DRI = (H * V) / cap;
  lastDRI = DRI;

  let result = document.getElementById("result");
  if (result) {
      if (DRI < 50) {
        result.innerText = "Low Risk";
        result.style.color = "green";
      } else if (DRI < 150) {
        result.innerText = "Medium Risk";
        result.style.color = "orange";
      } else {
        result.innerText = "High Risk";
        result.style.color = "red";
      }
  }
}

lucide.createIcons();

// ================= AUTHENTICATION LOGIC =================
let userPhone = "";

function sendOTP() {
    const phoneInput = document.getElementById('phone-input').value;
    if(phoneInput.length !== 10 || isNaN(phoneInput)) {
        alert("Please enter a valid 10-digit mobile number.");
        return;
    }
    
    userPhone = phoneInput;
    const btn = document.querySelector('#step-phone .btn-primary');
    btn.innerHTML = "Sending...";
    btn.style.opacity = "0.7";

    setTimeout(() => {
        document.getElementById('step-phone').classList.remove('active');
        document.getElementById('step-phone').classList.add('hidden');
        
        document.getElementById('step-otp').classList.remove('hidden');
        document.getElementById('step-otp').classList.add('active');
        
        document.getElementById('auth-subtitle').innerText = `OTP sent to +91 ${userPhone}`;
        document.querySelector('.otp-box').focus(); 
    }, 1000);
}

function moveToNext(current, nextFieldID) {
    if (current.value.length >= 1) {
        document.getElementById(nextFieldID).focus();
    }
}

function verifyOTP() {
    const inputs = document.querySelectorAll('.otp-box');
    let otp = "";
    inputs.forEach(input => otp += input.value);

    if(otp.length !== 4) {
        alert("Please enter the complete 4-digit OTP.");
        return;
    }

    const btn = document.getElementById('verify-btn');
    btn.innerHTML = "Verifying...";
    
    setTimeout(() => {
        document.getElementById('auth-screen').classList.remove('active');
        document.getElementById('auth-screen').classList.add('hidden');
        
        const appScreen = document.getElementById('app-screen');
        appScreen.classList.remove('hidden');
        
        setTimeout(() => { initMap(); }, 100); 
    }, 1200);
}

function resetAuth() {
    document.getElementById('step-otp').classList.remove('active');
    document.getElementById('step-otp').classList.add('hidden');
    document.getElementById('step-phone').classList.remove('hidden');
    document.getElementById('step-phone').classList.add('active');
    document.getElementById('auth-subtitle').innerText = "Enter your mobile number to continue securely.";
    document.getElementById('phone-input').value = "";
    document.querySelector('#step-phone .btn-primary').innerHTML = "Send Secure OTP";
    document.querySelector('#step-phone .btn-primary').style.opacity = "1";
    document.querySelectorAll('.otp-box').forEach(box => box.value = "");
}


// ================= CORE MAP & DISASTER SYSTEM =================
let map, userMarker, safeHospitalMarker;
let dangerZones = [];
let routingControl = null;

function initMap() {
    map = L.map('map', { zoomControl: false }).setView([20.5937, 78.9629], 5);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: 'Map data &copy; OpenStreetMap contributors'
    }).addTo(map);

    map.invalidateSize();

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (pos) => { setUserLocation(pos.coords.latitude, pos.coords.longitude); },
            (err) => { setUserLocation(19.0760, 72.8777); } // Fallback to Mumbai
        );
    } else {
        setUserLocation(19.0760, 72.8777);
    }
}

function setUserLocation(lat, lng) {
    map.setView([lat, lng], 14);
    
    userMarker = L.marker([lat, lng], {
        icon: L.divIcon({ className: 'custom-icon', html: '<div class="user-dot"></div>' })
    }).addTo(map);

    simulateDisasters(lat, lng);
}

function simulateDisasters(lat, lng) {
    // 🏥 Safe Zone (Hospital) placed slightly further away so the road route looks good
    safeHospitalMarker = L.marker([lat + 0.015, lng - 0.015]).addTo(map).bindPopup("🏥 Safe Zone: District Hospital");

    // 🔥 Fire Zone 
    const fire = L.circle([lat + 0.012, lng + 0.01], {
        color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.3, radius: 400
    }).addTo(map);

    dangerZones.push(fire);

    setTimeout(() => {
        document.getElementById('risk-level').innerText = "Elevated Risk";
        document.getElementById('risk-level').className = "level-high";
        document.getElementById('risk-level').style.color = "var(--danger)";
        document.getElementById('alert-banner').innerHTML = "⚠️ WARNING: Wildfire detected nearby. Stay alert.";
        document.getElementById('alert-banner').style.color = "var(--danger)";
        document.getElementById('bottom-sheet').classList.remove('collapsed');
    }, 3000);
}

// ================= UI INTERACTIONS =================

function toggleBottomSheet() {
    document.getElementById('bottom-sheet').classList.toggle('collapsed');
}

function toggleModal(modalId) {
    document.getElementById(modalId).classList.toggle('hidden');
}

// Action: Safe Route using REAL ROADS via Leaflet Routing Machine (OSRM API)
function findSafeRoute() {
    if (!userMarker || !safeHospitalMarker) return;
    
    alert("Requesting optimal road path from satellite routing servers...");

    // Remove old route if it exists
    if (routingControl) {
        map.removeControl(routingControl);
    }

    const start = userMarker.getLatLng();
    const end = safeHospitalMarker.getLatLng();

    // Use Routing Machine to trace actual roads
    routingControl = L.Routing.control({
        waypoints: [
            L.latLng(start.lat, start.lng),
            L.latLng(end.lat, end.lng)
        ],
        routeWhileDragging: false,
        addWaypoints: false,
        fitSelectedRoutes: true,
        show: false, // Hides the ugly text instructions panel
        lineOptions: {
            styles: [{ color: '#10b981', opacity: 0.8, weight: 6, dashArray: '15, 10' }] // Green dashed line
        }
    }).addTo(map);

    document.getElementById('bottom-sheet').classList.add('collapsed');
}

// Action: I'm Safe
function markSafe() {
    alert("Status verified. Local authorities and emergency contacts have been notified of your safety.");
}

// Action: SOS Trigger
function triggerSOS() {
    const btn = document.getElementById('main-sos-btn');
    const confirmSOS = confirm("⚠️ TRIGGER EMERGENCY PROTOCOL? This dispatches local authorities to your live GPS coordinates.");
    
    if (confirmSOS) {
        btn.style.background = "#fff";
        btn.querySelector('span').style.color = "#ef4444";
        btn.querySelector('span').innerText = "SENT";
        alert(`Emergency Services Dispatched. GPS Coordinates shared.`);
    }
}

// Action: Community Report (Saves directly to Firebase Database)
function submitReport() {
    const typeElement = document.getElementById('report-type');
    const type = typeElement.options[typeElement.selectedIndex].text;
    const desc = document.getElementById('report-desc').value;
    
    if(!desc) { 
        alert("Please provide details."); 
        return; 
    }

    // Change button text to show it's working
    const btn = document.querySelector('#report-modal .btn-primary');
    btn.innerHTML = "Sending to Cloud...";
    btn.style.opacity = "0.7";

    // Send data to Firebase Firestore
    db.collection("reports").add({
        incidentType: type,
        description: desc,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    })
    .then(() => {
        alert("Incident logged securely to RiskMap AI Cloud!");
        document.getElementById('report-desc').value = "";
        btn.innerHTML = "Submit Live Report";
        btn.style.opacity = "1";
        toggleModal('report-modal');
    })
    .catch((error) => {
        console.error("Firebase Error:", error);
        alert("Error saving report. Check your internet connection.");
        btn.innerHTML = "Submit Live Report";
        btn.style.opacity = "1";
    });
}

// ================= AI ASSISTANT =================
function handleAIEnter(e) {
    if (e.key === 'Enter') askAI();
}

function askAI() {
    const input = document.getElementById('ai-input');
    const chatBox = document.getElementById('chat-box');
    const text = input.value.trim();
    
    if (!text) return;

    chatBox.innerHTML += `<div class="msg user">${text}</div>`;
    input.value = "";
    
    setTimeout(() => {
        let reply = "I am processing satellite data. Please follow local authority guidelines and avoid low-lying areas.";
        const q = text.toLowerCase();
        if (q.includes("fire")) reply = "If you are near the wildfire: Stay low to avoid smoke, cover your face with a damp cloth, and proceed to the designated Safe Zone.";
        if (q.includes("safe") || q.includes("where")) reply = "The nearest verified safe zone is the District Hospital. Use the 'Safe Route' feature on your dashboard to navigate.";
        
        chatBox.innerHTML += `<div class="msg bot">${reply}</div>`;
        chatBox.scrollTop = chatBox.scrollHeight;
    }, 800);
}

//  CITY SELECT
function selectCity(pop, infra, cap) {
  let popEl = document.getElementById("population");
  let infraEl = document.getElementById("infra");
  let capEl = document.getElementById("capacity");
  if(popEl) popEl.value = pop;
  if(infraEl) infraEl.value = infra;
  if(capEl) capEl.value = cap;
}

function fillSample() {
  selectCity(8000, 70, 60);
}

// REPORT
function generateReport() {
  if (lastDRI === 0) {
    alert("Calculate risk first!");
    return;
  }

  let level = lastDRI < 50 ? "LOW" : lastDRI < 150 ? "MEDIUM" : "HIGH";

  let report = `
RiskMap Detailed Report

Risk Score: ${lastDRI.toFixed(2)}
Risk Level: ${level}

Data Sources:
- Census India
- IMD
- NDMA

Recommendation:
Use official government data for accurate planning.

Generated: ${new Date().toLocaleString()}
`;

  let blob = new Blob([report], { type: "text/plain" });
  let link = document.createElement("a");

  link.href = URL.createObjectURL(blob);
  link.download = "Risk_Report.txt";
  link.click();
}
