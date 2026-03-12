const WEB_APP_URL = "http://localhost:3000";

// ─── State ─────────────────────────────────────────────────────────────────
let currentStep = 1;
let scannedJob = null;
let tailoredResume = "";
let coverLetter = "";
let resumeBlobUrl = null;
let appliedTab = null;

// ─── Settings ───────────────────────────────────────────────────────────────
const DEFAULT_SETTINGS = { autoScan: false, autoApply: false, autoFill: false };
let settings = { ...DEFAULT_SETTINGS };

function loadSettings() {
  return new Promise(resolve => {
    chrome.storage.local.get("automationSettings", data => {
      if (data.automationSettings) settings = { ...DEFAULT_SETTINGS, ...data.automationSettings };
      document.getElementById("toggle-autoScan").checked  = settings.autoScan;
      document.getElementById("toggle-autoApply").checked = settings.autoApply;
      document.getElementById("toggle-autoFill").checked  = settings.autoFill;
      resolve();
    });
  });
}

function saveSettings() {
  chrome.storage.local.set({ automationSettings: settings });
}

loadSettings();

["autoScan", "autoApply", "autoFill"].forEach(key => {
  document.getElementById(`toggle-${key}`).addEventListener("change", e => {
    settings[key] = e.target.checked;
    saveSettings();
  });
});

// ─── Mock profile (replace with resume data once step 2 is re-enabled) ─────
const MOCK_PROFILE = {
  firstName:    "Naoki",
  lastName:     "Doe",
  email:        "naoki@example.com",
  phone:        "4155551234",
  linkedin:     "https://linkedin.com/in/naoki",
  website:      "https://naoki.dev",
  addressLine1: "123 Main St",
  addressLine2: "",
  city:         "San Francisco",
  state:        "CA",
  zip:          "94105",
  country:      "United States",
};

// ─── Settings overlay ───────────────────────────────────────────────────────
document.getElementById("btn-gear").addEventListener("click", () => {
  document.getElementById("settings-overlay").classList.add("open");
  document.getElementById("btn-gear").classList.add("active");
});
document.getElementById("btn-close-settings").addEventListener("click", () => {
  document.getElementById("settings-overlay").classList.remove("open");
  document.getElementById("btn-gear").classList.remove("active");
});

// ─── Tab switching ──────────────────────────────────────────────────────────
document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
    document.querySelectorAll(".panel").forEach((p) => p.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById(`panel-${tab.dataset.tab}`).classList.add("active");
  });
});

// ─── Step indicator ─────────────────────────────────────────────────────────
function updateStepIndicator(step) {
  for (let i = 1; i <= 3; i++) {
    const dot   = document.getElementById(`dot-${i}`);
    const label = document.getElementById(`label-${i}`);
    dot.classList.remove("active", "done");
    label.classList.remove("active", "done");
    if (i < step) {
      dot.classList.add("done");
      dot.innerHTML = "✓";
      label.classList.add("done");
    } else if (i === step) {
      dot.classList.add("active");
      dot.innerHTML = String(i);
      label.classList.add("active");
    } else {
      dot.innerHTML = String(i);
    }
  }
  for (let i = 1; i <= 2; i++) {
    const line = document.getElementById(`line-${i}`);
    if (i < step) {
      line.classList.add("done");
    } else {
      line.classList.remove("done");
    }
  }
}

function showStep(step) {
  currentStep = step;
  for (let i = 1; i <= 3; i++) {
    document.getElementById(`step-${i}-content`).classList.toggle("active", i === step);
  }
  updateStepIndicator(step);
  document.getElementById("start-over-bar").classList.toggle("visible", step > 1);
  if (step === 3) populateResumeDownload();
}

function populateResumeDownload() {
  const el = document.getElementById("resume-download");
  if (!tailoredResume || !el) return;
  if (!resumeBlobUrl) {
    resumeBlobUrl = URL.createObjectURL(new Blob([tailoredResume], { type: "text/plain" }));
  }
  const isPdf = resumeBlobUrl && !resumeBlobUrl.startsWith("blob:") === false;
  // Determine label from what we have (PDF endpoint may have succeeded)
  const dlName = "tailored-resume.pdf";
  el.innerHTML = `
    <div style="margin-bottom:10px;padding:10px 12px;background:#052e16;border:1px solid #14532d;border-radius:8px;display:flex;align-items:center;justify-content:space-between;gap:8px">
      <div style="font-size:12px;color:#86efac">✓ Tailored resume ready</div>
      <a href="${resumeBlobUrl}" download="${dlName}" style="flex-shrink:0;font-size:12px;color:#a5b4fc;text-decoration:none;padding:4px 10px;background:#1e1b4b;border:1px solid #3730a3;border-radius:6px">⬇ Download</a>
    </div>
  `;
}

function startOver() {
  scannedJob = null;
  tailoredResume = "";
  coverLetter = "";
  if (resumeBlobUrl) { URL.revokeObjectURL(resumeBlobUrl); resumeBlobUrl = null; }
  document.getElementById("scan-result").innerHTML = "";
  document.getElementById("tailor-result").innerHTML = "";
  document.getElementById("resume-download").innerHTML = "";
  document.getElementById("fill-result").innerHTML = "";
  document.getElementById("apply-actions").innerHTML = "";
  appliedTab = null;
  document.getElementById("btn-scan").disabled = false;
  document.getElementById("btn-fill").disabled = false;
  document.getElementById("btn-fill").style.display = "";
  showStep(1);
}

document.getElementById("btn-start-over").addEventListener("click", startOver);

// ─── Step 1: Scan ───────────────────────────────────────────────────────────
document.getElementById("btn-scan").addEventListener("click", async () => {
  const resultEl = document.getElementById("scan-result");
  setMsg(resultEl, "info", "Scanning...");
  scannedJob = null;

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id, allFrames: true },
      func: scrapeLinkedIn,
    });

    const result = results.find(r => r?.result?.job)?.result;
    if (!result) throw new Error(results[0]?.result?.error || "No job found. Make sure you are on a LinkedIn job listing.");

    scannedJob = result.job;
    const skills = extractJobSkills(scannedJob.description);
    const skillsHtml = skills.length
      ? skills.map(s => `<span class="skill-tag">${esc(s)}</span>`).join("")
      : `<span style="color:#6b7280;font-size:11px">None detected</span>`;

    resultEl.innerHTML = `
      <div class="job-card">
        <div class="job-title">${esc(scannedJob.title) || "Unknown Title"}</div>
        <div class="job-meta">${esc(scannedJob.company)}${scannedJob.location ? " · " + esc(scannedJob.location) : ""}</div>
        ${scannedJob.salary || scannedJob.jobType || scannedJob.workplace ? `
        <div class="job-badges">
          ${scannedJob.salary    ? `<span class="job-badge badge-pay">${esc(scannedJob.salary)}</span>` : ""}
          ${scannedJob.jobType   ? `<span class="job-badge badge-type">${esc(scannedJob.jobType)}</span>` : ""}
          ${scannedJob.workplace ? `<span class="job-badge badge-place">${esc(scannedJob.workplace)}</span>` : ""}
        </div>` : ""}

        <div class="job-section-label">Skills Required</div>
        <div class="skill-tags">${skillsHtml}</div>

        <div class="job-section-label" style="margin-top:10px">Description</div>
        <div class="job-desc-preview" id="desc-preview">
          ${esc(scannedJob.description.slice(0, 300))}${scannedJob.description.length > 300 ? "…" : ""}
        </div>
        ${scannedJob.description.length > 300
          ? `<button class="btn-link" id="btn-desc-toggle">Show more</button>
             <div class="job-desc-full hidden" id="desc-full">${esc(scannedJob.description)}</div>`
          : ""}
      </div>
      <button class="btn primary" id="btn-tailor" style="margin-top:10px">Tailor Resume →</button>
    `;

    if (scannedJob.description.length > 300) {
      document.getElementById("btn-desc-toggle").addEventListener("click", () => {
        const full = document.getElementById("desc-full");
        const preview = document.getElementById("desc-preview");
        const btn = document.getElementById("btn-desc-toggle");
        const expanded = !full.classList.contains("hidden");
        full.classList.toggle("hidden", expanded);
        preview.classList.toggle("hidden", !expanded);
        btn.textContent = expanded ? "Show more" : "Show less";
      });
    }

    document.getElementById("btn-tailor").addEventListener("click", () => {
      goToStep2();
    });

    // Automation chain after scan
    if (settings.autoScan) {
      setTimeout(() => goToStep2(), 800);
    }

  } catch (err) {
    setMsg(resultEl, "error", err.message);
  }
});

// ─── Step 2: Tailor Resume ──────────────────────────────────────────────────
async function goToStep2() {
  showStep(2);
  const resultEl = document.getElementById("tailor-result");
  resultEl.innerHTML = `<div class="msg info"><span class="spinner"></span>Fetching your resume...</div>`;

  let baseResume, fileName;
  try {
    const resumeRes = await fetch(`${WEB_APP_URL}/api/resume`);
    if (!resumeRes.ok) {
      resultEl.innerHTML = `<div class="msg error">No resume found. Please <a href="${WEB_APP_URL}/resume" target="_blank" style="color:#a5b4fc">upload your resume</a> in the web app first, then come back and try again.</div>`;
      return;
    }
    const resumeData = await resumeRes.json();
    baseResume = resumeData.content;
    fileName = resumeData.fileName;
  } catch (err) {
    resultEl.innerHTML = `<div class="msg error">Could not reach the web app. Make sure it is running at ${esc(WEB_APP_URL)}.</div>`;
    return;
  }

  resultEl.innerHTML = `<div class="msg info"><span class="spinner"></span>Tailoring resume with AI — this may take 15–30 seconds...</div>`;

  try {
    const genRes = await fetch(`${WEB_APP_URL}/api/generate-resume`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        baseResume,
        jobDescription: scannedJob.description,
        jobTitle: scannedJob.title,
        company: scannedJob.company,
      }),
    });

    if (!genRes.ok) throw new Error(`AI error: ${genRes.status}`);
    const data = await genRes.json();
    tailoredResume = data.tailoredResume || "";
    coverLetter = data.coverLetter || "";

    // Also save job to tracker (fire-and-forget)
    postJob(scannedJob).catch(() => {});

    // Generate PDF blob URL; fall back to plain-text blob if PDF endpoint fails
    if (resumeBlobUrl) URL.revokeObjectURL(resumeBlobUrl);
    let downloadFileName = "tailored-resume.txt";
    try {
      const pdfRes = await fetch(`${WEB_APP_URL}/api/generate-pdf`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: tailoredResume, fileName: "tailored-resume" }),
      });
      if (pdfRes.ok) {
        resumeBlobUrl = URL.createObjectURL(await pdfRes.blob());
        downloadFileName = "tailored-resume.pdf";
      }
    } catch (_) {}
    if (!resumeBlobUrl) {
      resumeBlobUrl = URL.createObjectURL(new Blob([tailoredResume], { type: "text/plain" }));
    }

    resultEl.innerHTML = `
      <div class="msg success" style="display:flex;align-items:center;justify-content:space-between;gap:8px">
        <span>Resume tailored successfully!</span>
        <a href="${resumeBlobUrl}" download="${downloadFileName}" style="flex-shrink:0;font-size:12px;color:#a5b4fc;text-decoration:none;padding:4px 10px;background:#1e1b4b;border:1px solid #3730a3;border-radius:6px">⬇ ${downloadFileName.endsWith(".pdf") ? "PDF" : "TXT"}</a>
      </div>
      ${collapsible("Tailored Resume", tailoredResume, "resume-preview")}
      ${collapsible("Cover Letter", coverLetter, "cl-preview")}
      <button class="btn primary" id="btn-go-apply" style="margin-top:12px">Continue to Apply →</button>
    `;

    // Attach collapsible toggles
    document.querySelectorAll(".collapsible-header").forEach(h => {
      h.addEventListener("click", () => {
        h.nextElementSibling.classList.toggle("open");
        h.querySelector(".chevron").textContent =
          h.nextElementSibling.classList.contains("open") ? "▲" : "▼";
      });
    });

    document.getElementById("btn-go-apply").addEventListener("click", () => {
      showStep(3);
      if (settings.autoApply) triggerApplyFlow(settings.autoFill);
    });

    // Auto-chain if autoApply is on
    if (settings.autoApply) {
      setTimeout(() => {
        showStep(3);
        triggerApplyFlow(settings.autoFill);
      }, 1500);
    }

  } catch (err) {
    resultEl.innerHTML = `<div class="msg error">${esc(err.message)}</div>`;
  }
}

// ─── Step 3: Auto Apply ─────────────────────────────────────────────────────
document.getElementById("btn-fill").addEventListener("click", () => triggerApplyFlow(true));

async function triggerApplyFlow(shouldFill) {
  const fillEl = document.getElementById("fill-result");
  const actionsEl = document.getElementById("apply-actions");
  document.getElementById("btn-fill").disabled = true;

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // Set up new-tab listener BEFORE clicking so we don't miss it
    const newTabPromise = waitForNewTab();

    setMsg(fillEl, "info", "Clicking Apply button...");
    const clickResults = await chrome.scripting.executeScript({
      target: { tabId: tab.id, allFrames: true },
      func: clickLinkedInApply,
    });

    const clicked = clickResults.find(r => r?.result?.success)?.result
      || clickResults[0]?.result;
    if (!clicked?.success) throw new Error(clicked?.error || "Apply button not found. Make sure you are on a LinkedIn job listing.");

    setMsg(fillEl, "info", '<span class="spinner"></span>Waiting for application page to open...');
    const newTab = await newTabPromise;
    appliedTab = newTab;

    if (shouldFill) {
      setMsg(fillEl, "info", '<span class="spinner"></span>Filling in your details...');
      await new Promise(r => setTimeout(r, 2000));
      await doFill(fillEl, actionsEl);
    } else {
      fillEl.innerHTML = `<div class="msg success" style="margin-top:10px">Application page opened! Click Fill Fields when ready.</div>`;
      actionsEl.innerHTML = `
        <button class="btn primary" id="btn-fill-now" style="margin-top:10px">Fill Fields</button>
        <button class="btn" id="btn-restart-after-open" style="margin-top:8px;width:100%">↩ Re-start</button>
      `;
      document.getElementById("btn-fill-now").addEventListener("click", async () => {
        document.getElementById("btn-fill-now").disabled = true;
        setMsg(fillEl, "info", '<span class="spinner"></span>Filling in your details...');
        try { await doFill(fillEl, actionsEl); } catch (err) { setMsg(fillEl, "error", err.message); }
      });
      document.getElementById("btn-restart-after-open").addEventListener("click", () => startOver());
    }

    document.getElementById("btn-fill").style.display = "none";

  } catch (err) {
    setMsg(fillEl, "error", err.message);
    document.getElementById("btn-fill").disabled = false;
  }
}

async function doFill(fillEl, actionsEl) {
  const results = await chrome.scripting.executeScript({
    target: { tabId: appliedTab.id, allFrames: true },
    func: fillApplicationForm,
    args: [MOCK_PROFILE, tailoredResume || null],
  });
  const fillResult = results.find(r => r?.result?.results?.some(f => f.filled))?.result
    || results[0]?.result;
  if (!fillResult) throw new Error("Could not fill fields on the application page.");
  showFillResult(fillEl, actionsEl, fillResult);
}

function showFillResult(fillEl, actionsEl, fillResult) {
  const items = fillResult.results.map(r => {
    const color = r.filled ? (r.skipped ? "#fbbf24" : "#86efac") : "#6b7280";
    const dotClass = r.filled ? "filled" : "missed";
    const label = r.skipped ? "already filled" : r.filled ? "filled" : "not found";
    return `<div class="fill-result-item">
      <div class="fill-dot ${dotClass}"></div>
      <span style="color:${color}">${esc(r.name)}: ${label}</span>
    </div>`;
  }).join("");

  fillEl.innerHTML = `<div style="margin-top:10px">${items}</div>`;

  actionsEl.innerHTML = `
    <div style="display:flex;gap:8px;margin-top:12px">
      <button class="btn primary" id="btn-reapply" style="flex:1">↺ Re-apply</button>
      <button class="btn" id="btn-restart-from3" style="flex:1">↩ Re-start</button>
    </div>
    <a href="${WEB_APP_URL}/applications" target="_blank" class="btn" style="display:flex;align-items:center;justify-content:center;gap:6px;margin-top:8px;background:#1e3a5f;border:1px solid #1d4ed8;color:#93c5fd;text-decoration:none">
      <svg width="13" height="13" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="3" width="12" height="11" rx="1.5" stroke="#93c5fd" stroke-width="1.5"/><path d="M5 3V2M11 3V2M2 7h12" stroke="#93c5fd" stroke-width="1.5" stroke-linecap="round"/></svg>
      View in Tracker
    </a>
  `;

  document.getElementById("btn-reapply").addEventListener("click", async () => {
    if (!appliedTab) return;
    const btn = document.getElementById("btn-reapply");
    btn.disabled = true;
    btn.textContent = "Filling...";
    try {
      await doFill(fillEl, actionsEl);
    } catch (err) {
      setMsg(fillEl, "error", err.message);
      btn.disabled = false;
      btn.textContent = "↺ Re-apply";
    }
  });

  document.getElementById("btn-restart-from3").addEventListener("click", () => startOver());
}

function waitForNewTab() {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      chrome.tabs.onCreated.removeListener(onCreated);
      reject(new Error("Timed out waiting for the application tab to open."));
    }, 10000);

    function onCreated(tab) {
      chrome.tabs.onCreated.removeListener(onCreated);
      clearTimeout(timeout);
      waitForTabLoad(tab.id).then(resolve).catch(reject);
    }

    chrome.tabs.onCreated.addListener(onCreated);
  });
}

function waitForTabLoad(tabId) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(onUpdated);
      reject(new Error("Timed out waiting for the application page to load."));
    }, 15000);

    function onUpdated(id, changeInfo, tab) {
      if (id === tabId && changeInfo.status === "complete") {
        chrome.tabs.onUpdated.removeListener(onUpdated);
        clearTimeout(timeout);
        resolve(tab);
      }
    }

    chrome.tabs.onUpdated.addListener(onUpdated);
  });
}

// ─── Manual Panel ────────────────────────────────────────────────────────────
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

// ─── Helpers ─────────────────────────────────────────────────────────────────
async function postJob(job) {
  const res = await fetch(`${WEB_APP_URL}/api/jobs/import`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(job),
  });
  if (!res.ok) throw new Error(`Server error: ${res.status}`);
}

function setMsg(el, type, text) {
  el.innerHTML = `<div class="msg ${type}">${text}</div>`;
}

function esc(str) {
  return (str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function collapsible(title, content, id) {
  return `
    <div class="collapsible-header">
      <span>${esc(title)}</span>
      <span class="chevron">▼</span>
    </div>
    <div class="collapsible-body" id="${id}">${esc(content)}</div>
  `;
}

function extractJobSkills(text) {
  const keywords = [
    "javascript","typescript","python","java","golang","rust","c++","c#","ruby","swift","kotlin",
    "react","vue","angular","next.js","node.js","express","django","fastapi","flask","spring",
    "sql","postgresql","mysql","mongodb","redis","elasticsearch","dynamodb",
    "aws","gcp","azure","docker","kubernetes","terraform","ci/cd","github actions",
    "git","rest","graphql","grpc","kafka","rabbitmq",
    "machine learning","deep learning","llm","pytorch","tensorflow","pandas","numpy",
    "tailwind","css","html","figma","agile","scrum",
  ];
  const lower = (text || "").toLowerCase();
  return keywords.filter(k => lower.includes(k)).map(k =>
    k.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")
  );
}

function extractEmail(text) {
  const m = (text || "").match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/);
  return m ? m[0] : "";
}

function extractPhone(text) {
  const m = (text || "").match(/(\+?[\d\s\-().]{10,})/);
  return m ? m[0].trim() : "";
}

// ─── LinkedIn apply button clicker (injected into page) ────────────────────
function clickLinkedInApply() {
  const btn =
    document.querySelector("#jobs-apply-button-id") ||
    document.querySelector(".jobs-apply-button--top-card button") ||
    document.querySelector(".jobs-apply-button button") ||
    document.querySelector("button[aria-label*='Apply'][id*='apply']");
  if (!btn) return { error: "Apply button not found on this page." };
  btn.click();
  return { success: true };
}

// ─── LinkedIn scraper (injected into page) ─────────────────────────────────
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
    document.querySelector(".job-details-jobs-unified-top-card__tertiary-description-container span")?.textContent?.trim() ||
    document.querySelector(".jobs-unified-top-card__bullet")?.textContent?.trim() || "";

  const description =
    document.querySelector(".jobs-description__content .jobs-description-content__text")?.textContent?.trim() ||
    document.querySelector("#job-details")?.textContent?.trim() ||
    document.querySelector(".jobs-box__html-content")?.textContent?.trim() || "";

  const url = window.location.href;

  // Salary + job type + workplace from the fit-level-preferences buttons
  const prefButtons = document.querySelectorAll(".job-details-fit-level-preferences button");
  let salary = "";
  let jobType = "";
  let workplace = "";
  prefButtons.forEach(btn => {
    const text = btn.textContent.trim();
    if (/\$|£|€|¥|\/yr|\/hr|K\/yr/i.test(text)) {
      salary = text;
    } else {
      const typeMatch = text.match(/full[- ]?time|part[- ]?time|contract|internship|temporary|freelance/i);
      if (typeMatch) { jobType = typeMatch[0].replace(/\b\w/g, c => c.toUpperCase()); return; }
      const placeMatch = text.match(/remote|on[- ]?site|hybrid/i);
      if (placeMatch) workplace = placeMatch[0].replace(/\b\w/g, c => c.toUpperCase());
    }
  });

  if (!title && !company) {
    return { error: "No job found. Make sure you are on a LinkedIn job listing." };
  }
  return { job: { title, company, location, salary, jobType, workplace, description, url } };
}

// ─── Application form filler (injected into page) ──────────────────────────
function fillApplicationForm(profile, resumeContent) {
  function setVal(el, value) {
    const proto = el.tagName === "TEXTAREA"
      ? window.HTMLTextAreaElement.prototype
      : window.HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, "value").set;
    setter.call(el, value);
    el.dispatchEvent(new Event("input",  { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function labelFor(el) {
    // aria-label takes priority
    const al = el.getAttribute("aria-label");
    if (al) return al.toLowerCase();
    // <label for="id">
    if (el.id) {
      const lbl = document.querySelector(`label[for="${el.id}"]`);
      if (lbl) return lbl.textContent.toLowerCase();
    }
    // aria-labelledby
    const llby = el.getAttribute("aria-labelledby");
    if (llby) {
      const lbl = document.getElementById(llby.split(" ")[0]);
      if (lbl) return lbl.textContent.toLowerCase();
    }
    // Gem / custom forms: walk up to find a sibling label span or legend
    let parent = el.parentElement;
    for (let i = 0; i < 6 && parent; i++) {
      // Direct child span/label that precedes the input's subtree
      const labelEl = parent.querySelector(
        'span:not(span span), label, legend'
      );
      if (labelEl) {
        const text = labelEl.textContent.replace(/\s*\*\s*/g, "").trim();
        if (text) return text.toLowerCase();
      }
      parent = parent.parentElement;
    }
    return "";
  }

  const results = [];
  const filled = new Set();

  function fill(el, name, value) {
    if (!el || !value || filled.has(name)) return;
    if (el.value === value) {
      results.push({ name, filled: true, skipped: true });
    } else {
      setVal(el, value);
      results.push({ name, filled: true, skipped: false });
    }
    filled.add(name);
  }

  // Today's date (MM/DD/YY)
  const now = new Date();
  const todayStr = `${String(now.getMonth()+1).padStart(2,"0")}/${String(now.getDate()).padStart(2,"0")}/${String(now.getFullYear()).slice(-2)}`;

  // Label → profile value mapping
  const locationStr = [profile.city, profile.state].filter(Boolean).join(", ");

  const labelMap = [
    [/first\s*name/,                          "First Name",       profile.firstName],
    [/last\s*name/,                           "Last Name",        profile.lastName],
    [/email/,                                 "Email",            profile.email],
    [/phone/,                                 "Phone",            profile.phone],
    [/linkedin/,                              "LinkedIn",         profile.linkedin],
    [/website|portfolio|personal url/,        "Website",          profile.website],
    [/^location$|city.*state|where.*located/, "Location",         locationStr],
    [/address line 1|street address(?! 2)/,   "Address Line 1",   profile.addressLine1],
    [/address line 2/,                        "Address Line 2",   profile.addressLine2],
    [/home address city|address city/,        "City",             profile.city],
    [/home address state|address state/,      "State",            profile.state],
    [/zip|postal/,                            "Zip",              profile.zip],
    [/today.{0,10}date|date.{0,10}application/, "Date",           todayStr],
  ];

  // Collect all fillable inputs (skip hidden, React-select internals)
  const inputs = document.querySelectorAll(
    'input[type="text"], input[type="email"], input[type="tel"], input:not([type])'
  );

  inputs.forEach(input => {
    if (input.getAttribute("aria-hidden") === "true") return;
    if (input.classList.contains("select__input")) return; // React-select combobox

    const lbl = labelFor(input);
    for (const [pattern, name, value] of labelMap) {
      if (pattern.test(lbl) && value) {
        fill(input, name, value);
        break;
      }
    }
  });

  // Report any fields we couldn't find
  for (const [, name] of labelMap) {
    if (!filled.has(name)) results.push({ name, filled: false });
  }

  // Try to upload resume to file input if resumeContent is provided
  if (resumeContent) {
    const fileInputs = Array.from(document.querySelectorAll('input[type="file"]'));
    const resumeInput = fileInputs.find(input => {
      const lbl = labelFor(input);
      return /resume|cv/i.test(lbl);
    }) || fileInputs[0];

    if (resumeInput) {
      try {
        const file = new File([resumeContent], "tailored-resume.txt", { type: "text/plain" });
        const dt = new DataTransfer();
        dt.items.add(file);
        resumeInput.files = dt.files;
        resumeInput.dispatchEvent(new Event("change", { bubbles: true }));
        results.push({ name: "Resume Upload", filled: true, skipped: false });
      } catch (e) {
        results.push({ name: "Resume Upload", filled: false });
      }
    } else {
      results.push({ name: "Resume Upload", filled: false });
    }
  }

  return { results };
}
