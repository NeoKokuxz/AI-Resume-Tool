const WEB_APP_URL = "http://localhost:3000";

// ─── State ─────────────────────────────────────────────────────────────────
let currentStep = 1;
let scannedJob = null;
let tailoredResume = "";
let coverLetter = "";

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
}

function startOver() {
  scannedJob = null;
  tailoredResume = "";
  coverLetter = "";
  document.getElementById("scan-result").innerHTML = "";
  document.getElementById("tailor-result").innerHTML = "";
  document.getElementById("fill-result").innerHTML = "";
  document.getElementById("apply-actions").innerHTML = "";
  document.getElementById("btn-scan").disabled = false;
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

    document.getElementById("btn-tailor").addEventListener("click", () => goToStep2());

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

    resultEl.innerHTML = `
      <div class="msg success">Resume tailored successfully!</div>
      ${collapsible("Tailored Resume", tailoredResume, "resume-preview")}
      ${collapsible("Cover Letter", coverLetter, "cl-preview")}
      <button class="btn primary" id="btn-go-apply" style="margin-top:12px">Auto Apply →</button>
    `;

    // Attach collapsible toggles
    document.querySelectorAll(".collapsible-header").forEach(h => {
      h.addEventListener("click", () => {
        h.nextElementSibling.classList.toggle("open");
        h.querySelector(".chevron").textContent =
          h.nextElementSibling.classList.contains("open") ? "▲" : "▼";
      });
    });

    document.getElementById("btn-go-apply").addEventListener("click", () => showStep(3));

  } catch (err) {
    resultEl.innerHTML = `<div class="msg error">${esc(err.message)}</div>`;
  }
}

// ─── Step 3: Auto Apply ─────────────────────────────────────────────────────
document.getElementById("btn-fill").addEventListener("click", async () => {
  const fillEl = document.getElementById("fill-result");
  const actionsEl = document.getElementById("apply-actions");
  setMsg(fillEl, "info", "Filling fields...");

  const email = extractEmail(tailoredResume) || extractEmail(coverLetter) || "";
  const phone = extractPhone(tailoredResume) || extractPhone(coverLetter) || "";

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: fillEasyApply,
      args: [{ coverLetter, email, phone }],
    });

    const fillResult = results[0]?.result;
    if (!fillResult) throw new Error("Could not inject into page. Make sure LinkedIn is the active tab.");

    const items = fillResult.results.map(r =>
      `<div class="fill-result-item">
        <div class="fill-dot ${r.filled ? "filled" : "missed"}"></div>
        <span style="color:${r.filled ? "#86efac" : "#6b7280"}">${esc(r.name)}: ${r.filled ? "filled" : "not found"}</span>
      </div>`
    ).join("");

    fillEl.innerHTML = `<div style="margin-top:10px">${items}</div>`;

    actionsEl.innerHTML = `
      <div class="msg info" style="margin-top:12px">Submit the Easy Apply form on LinkedIn when ready.</div>
      <a href="${WEB_APP_URL}/applications" target="_blank" style="display:block;margin-top:8px;text-align:center;font-size:12px;color:#a5b4fc">View in Tracker →</a>
    `;

  } catch (err) {
    setMsg(fillEl, "error", err.message);
  }
});

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

// ─── Easy Apply filler (injected into page) ────────────────────────────────
function fillEasyApply({ coverLetter, email, phone }) {
  function setVal(el, value) {
    const proto = el.tagName === "TEXTAREA"
      ? window.HTMLTextAreaElement.prototype
      : window.HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, "value").set;
    setter.call(el, value);
    el.dispatchEvent(new Event("input",  { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }

  const results = [];

  // Cover letter
  const clField = document.querySelector(
    ".jobs-easy-apply-form-section__group textarea, textarea[id*='cover'], textarea[id*='Cover']"
  );
  if (clField && coverLetter) {
    setVal(clField, coverLetter);
    results.push({ name: "Cover Letter", filled: true });
  } else {
    results.push({ name: "Cover Letter", filled: false });
  }

  // Email
  const emailField = document.querySelector("input[type='email']");
  if (emailField && email) {
    setVal(emailField, email);
    results.push({ name: "Email", filled: true });
  } else {
    results.push({ name: "Email", filled: false });
  }

  // Phone
  const phoneField = document.querySelector("input[type='tel']");
  if (phoneField && phone) {
    setVal(phoneField, phone);
    results.push({ name: "Phone", filled: true });
  } else {
    results.push({ name: "Phone", filled: false });
  }

  return { results };
}
