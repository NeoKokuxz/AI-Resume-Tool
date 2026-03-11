const WEB_APP_URL = "http://localhost:3000";

// ─── Tab switching ────────────────────────────────────────────────────────────
document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
    document.querySelectorAll(".panel").forEach((p) => p.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById(`panel-${tab.dataset.tab}`).classList.add("active");
  });
});

// ─── Auto Scan ────────────────────────────────────────────────────────────────
let scannedJob = null;

document.getElementById("btn-scan").addEventListener("click", async () => {
  const resultEl = document.getElementById("scan-result");
  setMsg(resultEl, "info", "Scanning...");
  scannedJob = null;

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: scrapeLinkedIn,
    });

    const result = results[0]?.result;
    if (!result || result.error) throw new Error(result?.error || "No job found");

    scannedJob = result.job;
    resultEl.innerHTML = `
      <div class="job-card">
        <div class="job-title">${esc(scannedJob.title) || "Unknown Title"}</div>
        <div class="job-meta">${esc(scannedJob.company)}${scannedJob.location ? " · " + esc(scannedJob.location) : ""}</div>
      </div>
      <button class="btn primary" id="btn-send" style="margin-top:10px">Send to App</button>
      <div id="send-result"></div>
    `;

    document.getElementById("btn-send").addEventListener("click", async () => {
      const sendEl = document.getElementById("send-result");
      setMsg(sendEl, "info", "Sending...");
      try {
        await postJob(scannedJob);
        setMsg(sendEl, "success", "Sent! Job will appear in the web app within 5 seconds.");
        document.getElementById("btn-send").disabled = true;
      } catch (err) {
        setMsg(sendEl, "error", err.message);
      }
    });

  } catch (err) {
    setMsg(resultEl, "error", err.message);
  }
});

// ─── Manual ───────────────────────────────────────────────────────────────────
const descEl = document.getElementById("manual-desc");
const sendBtn = document.getElementById("btn-manual-send");

descEl.addEventListener("input", () => {
  sendBtn.disabled = !descEl.value.trim();
});

sendBtn.addEventListener("click", async () => {
  const resultEl = document.getElementById("manual-result");
  setMsg(resultEl, "info", "Sending...");
  sendBtn.disabled = true;

  try {
    await postJob({
      title:       document.getElementById("manual-title").value.trim(),
      company:     document.getElementById("manual-company").value.trim(),
      description: descEl.value.trim(),
      location:    "",
    });
    setMsg(resultEl, "success", "Sent! Job will appear in the web app within 5 seconds.");
    descEl.value = "";
    document.getElementById("manual-title").value = "";
    document.getElementById("manual-company").value = "";
    setTimeout(() => { resultEl.innerHTML = ""; }, 4000);
  } catch (err) {
    setMsg(resultEl, "error", err.message);
    sendBtn.disabled = false;
  }
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function postJob(job) {
  const res = await fetch(`${WEB_APP_URL}/api/jobs/import`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(job),
  });
  if (!res.ok) throw new Error(`Server error: ${res.status}`);
}

function setMsg(el, type, text) {
  el.innerHTML = `<div class="msg ${type}">${esc(text)}</div>`;
}

function esc(str) {
  return (str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ─── LinkedIn scraper (injected into page) ────────────────────────────────────
function scrapeLinkedIn() {
  const title =
    document.querySelector("h1.t-24.t-bold")?.textContent?.trim() ||
    document.querySelector(".job-details-jobs-unified-top-card__job-title h1")?.textContent?.trim() ||
    document.querySelector("h1")?.textContent?.trim() || "";

  const company =
    document.querySelector(".job-details-jobs-unified-top-card__company-name a")?.textContent?.trim() ||
    document.querySelector("[data-test-employer-name]")?.textContent?.trim() ||
    document.querySelector(".jobs-unified-top-card__company-name")?.textContent?.trim() || "";

  const location =
    document.querySelector(".job-details-jobs-unified-top-card__primary-description-without-tagline span")?.textContent?.trim() ||
    document.querySelector(".jobs-unified-top-card__bullet")?.textContent?.trim() || "";

  const description =
    document.querySelector(".jobs-description__content .jobs-description-content__text")?.textContent?.trim() ||
    document.querySelector("#job-details")?.textContent?.trim() ||
    document.querySelector(".jobs-box__html-content")?.textContent?.trim() || "";

  const url = window.location.href;

  if (!title && !company) {
    return { error: "No job found. Make sure you are on a LinkedIn job listing." };
  }
  return { job: { title, company, location, description, url } };
}
