const WEB_APP_URL = "http://localhost:3000";
const SUPABASE_URL = "https://ybozvcxbcuowwaldwzjy.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_pIjQLlJoKX9ubm_jMPs0ww_H2VuT5GU";

// ─── Auth ────────────────────────────────────────────────────────────────────
let currentSession = null;

async function loadStoredSession() {
  return new Promise(resolve => {
    chrome.storage.local.get("supabaseSession", data => {
      resolve(data.supabaseSession || null);
    });
  });
}

async function storeSession(session) {
  await chrome.storage.local.set({ supabaseSession: session });
}

async function clearStoredSession() {
  await chrome.storage.local.remove("supabaseSession");
}

async function refreshAccessToken(refreshToken) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "apikey": SUPABASE_ANON_KEY },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  const session = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + data.expires_in * 1000,
    email: data.user?.email || "",
  };
  await storeSession(session);
  return session;
}

async function getValidSession() {
  if (!currentSession) return null;
  // Refresh if expires within 60 seconds
  if (Date.now() > currentSession.expires_at - 60_000) {
    currentSession = await refreshAccessToken(currentSession.refresh_token);
  }
  return currentSession;
}

async function signIn(email, password) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "apikey": SUPABASE_ANON_KEY },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || data.msg || "Login failed");
  const session = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + data.expires_in * 1000,
    email: data.user?.email || email,
  };
  await storeSession(session);
  return session;
}

async function signOut() {
  currentSession = null;
  await clearStoredSession();
}

// Authenticated fetch — injects Bearer token on all web app requests
async function authFetch(url, options = {}) {
  const session = await getValidSession();
  if (!session) throw new Error("Not signed in");
  return fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      "Authorization": `Bearer ${session.access_token}`,
    },
  });
}

function getInitials(name) {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function populateProfile(profile) {
  if (!profile) return;
  const initials = getInitials(profile.fullName);
  const name = profile.fullName || profile.email || "—";
  const title = profile.workTitle || "";
  const skills = (profile.skills || []).slice(0, 4);

  // Profile card (compact, always visible)
  document.getElementById("profile-avatar").textContent = initials;
  document.getElementById("profile-name").textContent = name;
  document.getElementById("profile-title").textContent = title;
  const skillsEl = document.getElementById("profile-skills");
  skillsEl.innerHTML = skills.map(s => `<span class="profile-skill-tag">${esc(s)}</span>`).join("");

  // Settings overlay (full detail)
  document.getElementById("settings-avatar").textContent = initials;
  document.getElementById("settings-name").textContent = name;
  document.getElementById("settings-title").textContent = title;

  if (profile.location) {
    document.getElementById("settings-location").style.display = "flex";
    document.getElementById("settings-location-text").textContent = profile.location;
  }

  if (profile.linkedin) {
    document.getElementById("settings-linkedin-row").style.display = "flex";
    const a = document.getElementById("settings-linkedin");
    a.href = profile.linkedin;
    a.textContent = profile.linkedin.replace(/^https?:\/\/(www\.)?/i, "");
  }

  const settingsSkills = document.getElementById("settings-skills");
  settingsSkills.innerHTML = (profile.skills || []).map(s =>
    `<span class="settings-skill-tag">${esc(s)}</span>`
  ).join("");
}

function showLoginOverlay() {
  document.getElementById("login-overlay").classList.add("open");
  document.getElementById("profile-card").classList.remove("visible");
}

async function showMainUI(email) {
  document.getElementById("login-overlay").classList.remove("open");
  document.getElementById("profile-card").classList.add("visible");
  document.getElementById("profile-name").textContent = email;

  // Fetch and display full profile
  try {
    const res = await authFetch(`${WEB_APP_URL}/api/profile`);
    if (res.ok) {
      const profile = await res.json();
      userProfile = profile;
      populateProfile({ ...profile, email });
    }
  } catch (_) {}
}

// ─── Auth UI ─────────────────────────────────────────────────────────────────
document.getElementById("btn-login").addEventListener("click", async () => {
  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;
  const errorEl = document.getElementById("login-error");
  const btn = document.getElementById("btn-login");

  if (!email || !password) {
    errorEl.textContent = "Please enter your email and password.";
    errorEl.classList.add("visible");
    return;
  }

  errorEl.classList.remove("visible");
  btn.disabled = true;
  btn.textContent = "Signing in...";

  try {
    currentSession = await signIn(email, password);
    await showMainUI(currentSession.email);
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.classList.add("visible");
  } finally {
    btn.disabled = false;
    btn.textContent = "Sign In";
  }
});

document.getElementById("login-password").addEventListener("keydown", e => {
  if (e.key === "Enter") document.getElementById("btn-login").click();
});

document.getElementById("btn-logout").addEventListener("click", async () => {
  await signOut();
  showLoginOverlay();
  startOver();
});

// ─── Init: restore session ────────────────────────────────────────────────────
(async () => {
  currentSession = await loadStoredSession();
  if (currentSession) {
    // Try refreshing if close to expiry
    if (Date.now() > currentSession.expires_at - 60_000) {
      currentSession = await refreshAccessToken(currentSession.refresh_token);
    }
    if (currentSession) {
      await showMainUI(currentSession.email);
    } else {
      showLoginOverlay();
    }
  } else {
    showLoginOverlay();
  }
})();

// ─── State ─────────────────────────────────────────────────────────────────
let currentStep = 1;
let scannedJob = null;
let tailoredResume = "";
let coverLetter = "";
let resumeBlobUrl = null;
let appliedTab = null;
let currentApplicationId = null;

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

// ─── Profile (fetched from resume app in step 2) ─────────────────────────────
let userProfile = null;

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
  currentApplicationId = null;
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

    // Render job card immediately with a loading spinner for the ATS score
    renderJobCard(resultEl, scannedJob, null);

    document.getElementById("btn-tailor").addEventListener("click", () => goToStep2());
    if (scannedJob.description.length > 300) attachDescToggle();
    if (settings.autoScan) setTimeout(() => goToStep2(), 800);

    // Fetch ATS score in background — update card when ready
    try {
      const atsRes = await authFetch(`${WEB_APP_URL}/api/ats-score`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobDescription: scannedJob.description }),
      });
      if (atsRes.ok) {
        const atsResult = await atsRes.json();
        scannedJob.atsResult = atsResult;
        renderJobCard(resultEl, scannedJob, atsResult);
        document.getElementById("btn-tailor").addEventListener("click", () => goToStep2());
        if (scannedJob.description.length > 300) attachDescToggle();
      }
    } catch (_) {}

  } catch (err) {
    setMsg(resultEl, "error", err.message);
  }
});

function scoreColor(score) {
  if (score >= 75) return "#22c55e";
  if (score >= 50) return "#f59e0b";
  return "#ef4444";
}

function atsRingHtml(atsResult) {
  if (!atsResult) {
    return `<div class="ats-ring-loading"><span class="spinner" style="margin:0"></span></div>`;
  }
  const score = atsResult.score;
  const color = scoreColor(score);
  const r = 20;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  return `
    <div class="ats-ring-wrap">
      <svg width="52" height="52" viewBox="0 0 52 52">
        <circle class="ats-ring-bg" cx="26" cy="26" r="${r}"/>
        <circle class="ats-ring-fill" cx="26" cy="26" r="${r}"
          stroke="${color}"
          stroke-dasharray="${circ}"
          stroke-dashoffset="${offset}"/>
      </svg>
      <div class="ats-ring-label">
        <span class="ats-ring-score" style="color:${color}">${score}</span>
        <span class="ats-ring-pct">ATS</span>
      </div>
    </div>
  `;
}

function renderJobCard(resultEl, job, atsResult) {
  const skills = extractJobSkills(job.description);

  let keywordsHtml = "";
  if (atsResult) {
    const matched = (atsResult.matchedKeywords || []).slice(0, 8);
    const missing = (atsResult.missingKeywords || []).slice(0, 6);
    keywordsHtml = `
      <div class="keyword-section">
        ${atsResult.summary ? `<div style="font-size:11px;color:#9ca3af;line-height:1.5;margin-bottom:6px">${esc(atsResult.summary)}</div>` : ""}
        <div class="keyword-row">
          ${matched.map(k => `<span class="kw-match">✓ ${esc(k)}</span>`).join("")}
          ${missing.map(k => `<span class="kw-miss">✗ ${esc(k)}</span>`).join("")}
        </div>
      </div>
    `;
  }

  const skillsHtml = skills.length
    ? skills.map(s => `<span class="skill-tag">${esc(s)}</span>`).join("")
    : `<span style="color:#6b7280;font-size:11px">None detected</span>`;

  resultEl.innerHTML = `
    <div class="job-card" style="position:relative">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px">
        <div style="min-width:0;flex:1">
          <div class="job-title">${esc(job.title) || "Unknown Title"}</div>
          <div class="job-meta">${esc(job.company)}${job.location ? " · " + esc(job.location) : ""}</div>
        </div>
        ${atsRingHtml(atsResult)}
      </div>

      ${job.salary || job.jobType || job.workplace ? `
      <div class="job-badges" style="margin-top:8px">
        ${job.salary    ? `<span class="job-badge badge-pay">${esc(job.salary)}</span>` : ""}
        ${job.jobType   ? `<span class="job-badge badge-type">${esc(job.jobType)}</span>` : ""}
        ${job.workplace ? `<span class="job-badge badge-place">${esc(job.workplace)}</span>` : ""}
      </div>` : ""}

      ${keywordsHtml}

      <div class="job-section-label" style="margin-top:10px">Skills Required</div>
      <div class="skill-tags">${skillsHtml}</div>

      <div class="job-section-label" style="margin-top:10px">Description</div>
      <div class="job-desc-preview" id="desc-preview">
        ${esc(job.description.slice(0, 300))}${job.description.length > 300 ? "…" : ""}
      </div>
      ${job.description.length > 300
        ? `<button class="btn-link" id="btn-desc-toggle">Show more</button>
           <div class="job-desc-full hidden" id="desc-full">${esc(job.description)}</div>`
        : ""}
    </div>
    <button class="btn primary" id="btn-tailor" style="margin-top:10px;display:flex;align-items:center;justify-content:center;gap:7px">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
      Tailor Resume for This Job
    </button>
  `;
}

function attachDescToggle() {
  const btn = document.getElementById("btn-desc-toggle");
  if (!btn) return;
  btn.addEventListener("click", () => {
    const full = document.getElementById("desc-full");
    const preview = document.getElementById("desc-preview");
    const expanded = !full.classList.contains("hidden");
    full.classList.toggle("hidden", expanded);
    preview.classList.toggle("hidden", !expanded);
    btn.textContent = expanded ? "Show more" : "Show less";
  });
}

// ─── Step 2: Tailor Resume ──────────────────────────────────────────────────
async function goToStep2() {
  showStep(2);
  const resultEl = document.getElementById("tailor-result");
  resultEl.innerHTML = `<div class="msg info"><span class="spinner"></span>Saving job & fetching resume...</div>`;

  let baseResume, applicationId;
  try {
    const [resumeRes, importRes] = await Promise.all([
      authFetch(`${WEB_APP_URL}/api/resume`),
      authFetch(`${WEB_APP_URL}/api/jobs/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...scannedJob, atsResult: scannedJob.atsResult ?? null }),
      }),
    ]);

    if (!resumeRes.ok) {
      resultEl.innerHTML = `<div class="msg error">No resume found. Please <a href="${WEB_APP_URL}/resume" target="_blank" style="color:#a5b4fc">upload your resume</a> in the web app first.</div>`;
      return;
    }
    baseResume = (await resumeRes.json()).content;

    if (importRes.ok) {
      applicationId = (await importRes.json()).applicationId;
      currentApplicationId = applicationId;
    }
  } catch (err) {
    resultEl.innerHTML = `<div class="msg error">Could not reach the web app. Make sure it is running at ${esc(WEB_APP_URL)}.</div>`;
    return;
  }

  // Show job-saved confirmation + tailoring spinner
  const ats = scannedJob.atsResult;
  const savedBadge = `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;background:#0a1628;border:1px solid #1d4ed8;border-radius:8px;margin-bottom:10px">
      <div>
        <div style="font-size:12px;font-weight:600;color:#93c5fd">✓ Saved to tracker</div>
        <div style="font-size:11px;color:#4b5563;margin-top:1px">${esc(scannedJob.title)} · ${esc(scannedJob.company)}</div>
      </div>
      ${ats ? `<div style="text-align:center;flex-shrink:0">
        <div style="font-size:15px;font-weight:700;color:${scoreColor(ats.score)}">${ats.score}</div>
        <div style="font-size:9px;color:#6b7280">ATS</div>
      </div>` : ""}
    </div>
  `;

  resultEl.innerHTML = savedBadge + `<div class="msg info"><span class="spinner"></span>Tailoring resume with AI — this may take 15–30 seconds...</div>`;

  try {
    const genRes = await authFetch(`${WEB_APP_URL}/api/generate-resume`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        baseResume,
        jobDescription: scannedJob.description,
        jobTitle: scannedJob.title,
        company: scannedJob.company,
        applicationId,
      }),
    });

    if (!genRes.ok) throw new Error(`AI error: ${genRes.status}`);
    const data = await genRes.json();
    tailoredResume = data.tailoredResume || "";
    coverLetter = data.coverLetter || "";

    // Generate PDF; fall back to plain text
    if (resumeBlobUrl) URL.revokeObjectURL(resumeBlobUrl);
    let downloadFileName = "tailored-resume.txt";
    try {
      const pdfRes = await authFetch(`${WEB_APP_URL}/api/generate-pdf`, {
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

    resultEl.innerHTML = savedBadge + `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;background:#052e16;border:1px solid #14532d;border-radius:8px;margin-bottom:10px;gap:8px">
        <span style="font-size:12px;font-weight:600;color:#86efac">✓ Resume tailored</span>
        <a href="${resumeBlobUrl}" download="${downloadFileName}" style="flex-shrink:0;font-size:12px;color:#a5b4fc;text-decoration:none;padding:4px 10px;background:#1e1b4b;border:1px solid #3730a3;border-radius:6px">⬇ ${downloadFileName.endsWith(".pdf") ? "PDF" : "TXT"}</a>
      </div>
      ${collapsible("Tailored Resume", tailoredResume, "resume-preview")}
      ${collapsible("Cover Letter", coverLetter, "cl-preview")}
      <button class="btn primary" id="btn-go-apply" style="margin-top:12px;display:flex;align-items:center;justify-content:center;gap:7px">
        Proceed to Apply
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
      </button>
    `;

    document.querySelectorAll(".collapsible-header").forEach(h => {
      h.addEventListener("click", () => {
        h.nextElementSibling.classList.toggle("open");
        h.querySelector(".chevron").textContent =
          h.nextElementSibling.classList.contains("open") ? "▲" : "▼";
      });
    });

    document.getElementById("btn-go-apply").addEventListener("click", async () => {
      if (currentApplicationId) {
        authFetch(`${WEB_APP_URL}/api/applications/update`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ applicationId: currentApplicationId, status: "applied" }),
        }).catch(() => {});
      }
      showStep(3);
      if (settings.autoApply) triggerApplyFlow(settings.autoFill);
    });

    if (settings.autoApply) {
      setTimeout(async () => {
        if (currentApplicationId) {
          authFetch(`${WEB_APP_URL}/api/applications/update`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ applicationId: currentApplicationId, status: "applied" }),
          }).catch(() => {});
        }
        showStep(3);
        triggerApplyFlow(settings.autoFill);
      }, 1500);
    }

  } catch (err) {
    resultEl.innerHTML = savedBadge + `<div class="msg error">${esc(err.message)}</div>`;
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
        <button class="btn primary" id="btn-fill-now" style="margin-top:10px;display:flex;align-items:center;justify-content:center;gap:7px">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          Fill in My Details
        </button>
        <button class="btn secondary" id="btn-restart-after-open" style="margin-top:8px;display:flex;align-items:center;justify-content:center;gap:6px">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
          Start Over
        </button>
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
    args: [userProfile || {}, tailoredResume || null],
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
    <div class="btn-pair">
      <button class="btn secondary" id="btn-reapply" style="gap:6px">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>
        Re-fill Fields
      </button>
      <button class="btn secondary" id="btn-restart-from3" style="gap:6px">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
        Start Over
      </button>
    </div>
    <a href="${WEB_APP_URL}/applications" target="_blank" style="display:flex;align-items:center;justify-content:center;gap:7px;margin-top:8px;padding:9px 14px;background:#0f1f3d;border:1px solid #1e40af;border-radius:8px;color:#93c5fd;text-decoration:none;font-size:13px;font-weight:500;transition:background 0.15s" onmouseover="this.style.background='#1e3a5f'" onmouseout="this.style.background='#0f1f3d'">
      <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><rect x="2" y="3" width="12" height="11" rx="1.5" stroke="#93c5fd" stroke-width="1.5"/><path d="M5 3V2M11 3V2M2 7h12" stroke="#93c5fd" stroke-width="1.5" stroke-linecap="round"/></svg>
      View Application in Tracker
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
      btn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg> Re-fill Fields`;
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
    const res = await authFetch(`${WEB_APP_URL}/api/jobs/import`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title:       document.getElementById("manual-title").value.trim(),
        company:     document.getElementById("manual-company").value.trim(),
        description: descEl.value.trim(),
        location:    "",
      }),
    });
    if (!res.ok) throw new Error(`Server error: ${res.status}`);
    setMsg(resultEl, "success", "Job saved to tracker!");
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
