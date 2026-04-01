document.getElementById("hazard").oninput = function () {
  document.getElementById("hazardValue").innerText = this.value;
};

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

// 🔥 CITY SELECT
function selectCity(pop, infra, cap) {
  document.getElementById("population").value = pop;
  document.getElementById("infra").value = infra;
  document.getElementById("capacity").value = cap;
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