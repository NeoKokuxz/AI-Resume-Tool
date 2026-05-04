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

  let applicationId;
  try {
    const importRes = await authFetch(`${WEB_APP_URL}/api/jobs/import`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...scannedJob, atsResult: scannedJob.atsResult ?? null }),
    });

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

    // Use the tailored PDF returned from the server, or fall back to generating one
    if (resumeBlobUrl) URL.revokeObjectURL(resumeBlobUrl);
    let downloadFileName = "tailored-resume.pdf";
    if (data.pdfBase64) {
      const bytes = Uint8Array.from(atob(data.pdfBase64), c => c.charCodeAt(0));
      resumeBlobUrl = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
    } else {
      try {
        const pdfRes = await authFetch(`${WEB_APP_URL}/api/generate-pdf`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: tailoredResume, fileName: "tailored-resume" }),
        });
        if (pdfRes.ok) {
          resumeBlobUrl = URL.createObjectURL(await pdfRes.blob());
        }
      } catch (_) {}
      if (!resumeBlobUrl) {
        resumeBlobUrl = URL.createObjectURL(new Blob([tailoredResume], { type: "text/plain" }));
        downloadFileName = "tailored-resume.txt";
      }
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

async function extractFieldsFromTab(tabId) {
  const results = await chrome.scripting.executeScript({
    target: { tabId, allFrames: true },
    func: extractFormFields,
  });
  return results.flatMap(r => r?.result || []).filter(f => f && f.id);
}

async function doFill(fillEl, actionsEl) {
  // ── Phase 1: Extract all form fields from the page ──────────────────────
  setMsg(fillEl, "info", '<span class="spinner"></span>Scanning form fields...');
  let fields = await extractFieldsFromTab(appliedTab.id);

  // ── No fields? Look for another Apply button and navigate through ──────
  if (fields.length === 0) {
    setMsg(fillEl, "info", '<span class="spinner"></span>No fields found — looking for Apply button...');
    const clickResult = await chrome.scripting.executeScript({
      target: { tabId: appliedTab.id, allFrames: true },
      func: findAndClickApplyButton,
    });
    const clicked = clickResult.find(r => r?.result?.success)?.result;

    if (clicked?.success) {
      if (clicked.newTab) {
        // Apply button opened a new tab — wait for it
        setMsg(fillEl, "info", '<span class="spinner"></span>Waiting for application page...');
        const newTab = await waitForNewTab();
        appliedTab = newTab;
        await new Promise(r => setTimeout(r, 2000));
      } else {
        // Apply button navigated in the same tab — wait for page to update
        setMsg(fillEl, "info", '<span class="spinner"></span>Waiting for form to load...');
        await waitForTabLoad(appliedTab.id);
        await new Promise(r => setTimeout(r, 2000));
      }
      // Retry extraction
      fields = await extractFieldsFromTab(appliedTab.id);
    }

    if (fields.length === 0) {
      // Show message with autofill-again button — user navigates manually
      fillEl.innerHTML = `<div class="msg info" style="margin-top:10px">No form fields found. Navigate to the application form, then try again.</div>`;
      actionsEl.innerHTML = `
        <button class="btn primary" id="btn-autofill-again" style="margin-top:10px;display:flex;align-items:center;justify-content:center;gap:7px">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          Autofill Again
        </button>
        <button class="btn secondary" id="btn-restart-nofill" style="margin-top:8px;display:flex;align-items:center;justify-content:center;gap:6px">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
          Start Over
        </button>
      `;
      document.getElementById("btn-autofill-again").addEventListener("click", async () => {
        const btn = document.getElementById("btn-autofill-again");
        btn.disabled = true;
        btn.textContent = "Scanning...";
        try {
          // Use the current active tab (user may have navigated)
          const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
          appliedTab = activeTab;
          await doFill(fillEl, actionsEl);
        } catch (err) {
          setMsg(fillEl, "error", err.message);
          btn.disabled = false;
          btn.textContent = "Autofill Again";
        }
      });
      document.getElementById("btn-restart-nofill").addEventListener("click", () => startOver());
      return;
    }
  }

  // ── Phase 2: Send fields to backend for classification + AI answers ─────
  setMsg(fillEl, "info", `<span class="spinner"></span>Analyzing ${fields.length} fields...`);
  const jobContext = scannedJob ? {
    title: scannedJob.title || "",
    company: scannedJob.company || "",
    description: scannedJob.description || "",
  } : undefined;

  const apiRes = await authFetch(`${WEB_APP_URL}/api/autofill`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fields, jobContext }),
  });

  if (!apiRes.ok) {
    const err = await apiRes.json().catch(() => ({}));
    throw new Error(err.error || "Autofill API failed");
  }

  const { answers } = await apiRes.json();

  // ── Phase 3: Inject answers into the page ───────────────────────────────
  setMsg(fillEl, "info", '<span class="spinner"></span>Filling fields...');
  const fillResults = await chrome.scripting.executeScript({
    target: { tabId: appliedTab.id, allFrames: true },
    func: fillFormFields,
    args: [answers || []],
  });
  const fillResult = fillResults.find(r => r?.result?.filled?.length > 0)?.result
    || fillResults[0]?.result
    || { filled: [], skipped: [], review: [] };

  // ── Phase 4: Handle resume file upload separately ───────────────────────
  if (tailoredResume) {
    const uploadResults = await chrome.scripting.executeScript({
      target: { tabId: appliedTab.id, allFrames: true },
      func: uploadResumeFile,
      args: [tailoredResume],
    });
    const uploaded = uploadResults.find(r => r?.result?.success)?.result;
    if (uploaded?.success) {
      fillResult.filled.push({ name: "Resume Upload", confidence: 1, source: "rule" });
    }
  }

  showFillResult(fillEl, actionsEl, fillResult);
}

function showFillResult(fillEl, actionsEl, fillResult) {
  const allItems = [
    ...(fillResult.filled || []).map(r => {
      const isReview = r.confidence !== undefined && r.confidence <= 0.8;
      const color = isReview ? "#fbbf24" : "#86efac";
      const dotClass = "filled";
      const label = isReview ? "filled (review)" : r.source === "ai" ? "filled (AI)" : "filled";
      return `<div class="fill-result-item">
        <div class="fill-dot ${dotClass}"></div>
        <span style="color:${color}">${esc(r.name)}: ${label}</span>
      </div>`;
    }),
    ...(fillResult.skipped || []).map(r => `<div class="fill-result-item">
      <div class="fill-dot filled"></div>
      <span style="color:#fbbf24">${esc(r.name)}: already filled</span>
    </div>`),
    ...(fillResult.review || []).map(r => `<div class="fill-result-item">
      <div class="fill-dot missed"></div>
      <span style="color:#6b7280">${esc(r.name)}: needs review</span>
    </div>`),
  ];

  const filledCount = (fillResult.filled || []).length;
  const reviewCount = (fillResult.filled || []).filter(r => r.confidence <= 0.8).length + (fillResult.review || []).length;
  const summary = reviewCount > 0
    ? `<div class="msg info" style="margin-bottom:8px">Filled ${filledCount} fields. ${reviewCount} need review (yellow highlight).</div>`
    : `<div class="msg success" style="margin-bottom:8px">Filled ${filledCount} fields.</div>`;

  fillEl.innerHTML = `<div style="margin-top:10px">${summary}${allItems.join("")}</div>`;

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

// ─── Auto Fill Tab ──────────────────────────────────────────────────────────
document.getElementById("btn-autofill-page").addEventListener("click", async () => {
  const statusEl = document.getElementById("autofill-status");
  const actionsEl = document.getElementById("autofill-actions");
  const btn = document.getElementById("btn-autofill-page");
  btn.disabled = true;
  actionsEl.innerHTML = "";

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) throw new Error("No active tab.");

    setMsg(statusEl, "info", '<span class="spinner"></span>Scanning form fields...');
    const fields = await extractFieldsFromTab(tab.id);

    if (fields.length === 0) {
      setMsg(statusEl, "info", "No form fields found on this page. Open the application form, then try again.");
      btn.disabled = false;
      return;
    }

    setMsg(statusEl, "info", `<span class="spinner"></span>Analyzing ${fields.length} fields with AI...`);
    const apiRes = await authFetch(`${WEB_APP_URL}/api/autofill`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fields }),
    });
    if (!apiRes.ok) {
      const err = await apiRes.json().catch(() => ({}));
      throw new Error(err.error || `Autofill API failed (${apiRes.status})`);
    }
    const { answers } = await apiRes.json();

    setMsg(statusEl, "info", '<span class="spinner"></span>Filling fields...');
    const fillResults = await chrome.scripting.executeScript({
      target: { tabId: tab.id, allFrames: true },
      func: fillFormFields,
      args: [answers || []],
    });
    const fillResult = fillResults.find(r => r?.result?.filled?.length > 0)?.result
      || fillResults[0]?.result
      || { filled: [], skipped: [], review: [] };

    showFillResult(statusEl, actionsEl, fillResult);

    // Override default Re-fill/Start Over actions with autofill-specific re-run
    actionsEl.innerHTML = `
      <button class="btn primary" id="btn-autofill-again" style="margin-top:10px;display:flex;align-items:center;justify-content:center;gap:7px">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>
        Re-scan & Re-fill
      </button>
    `;
    document.getElementById("btn-autofill-again").addEventListener("click", () => btn.click());
    btn.disabled = false;
  } catch (err) {
    setMsg(statusEl, "error", err.message);
    btn.disabled = false;
  }
});

// ─── Save Job Tab ────────────────────────────────────────────────────────────
document.getElementById("btn-save-scan").addEventListener("click", async () => {
  const resultEl = document.getElementById("save-result");
  const btn = document.getElementById("btn-save-scan");
  btn.disabled = true;

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) throw new Error("No active tab.");

    setMsg(resultEl, "info", '<span class="spinner"></span>Scanning page...');
    const scrapeResults = await chrome.scripting.executeScript({
      target: { tabId: tab.id, allFrames: true },
      func: scrapeAnyJobPage,
    });
    const scraped = scrapeResults.map(r => r?.result).find(r => r && r.description && r.description.length > 50)
      || scrapeResults[0]?.result;

    if (!scraped || !scraped.description || scraped.description.length < 50) {
      setMsg(resultEl, "error", "Couldn't find a job description on this page. Try the manual paste option below.");
      btn.disabled = false;
      return;
    }

    let job = { ...scraped };

    // If title or company missing, ask the AI to extract them
    if (!job.title || !job.company) {
      setMsg(resultEl, "info", '<span class="spinner"></span>Extracting job details with AI...');
      try {
        const aiRes = await authFetch(`${WEB_APP_URL}/api/analyze-job`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jobDescription: job.description }),
        });
        if (aiRes.ok) {
          const { analysis } = await aiRes.json();
          if (analysis) {
            job.title = job.title || analysis.title || "";
            job.company = job.company || analysis.company || "";
            job.location = job.location || analysis.location || "";
          }
        }
      } catch (_) {}
    }

    setMsg(resultEl, "info", '<span class="spinner"></span>Saving to tracker...');
    const importRes = await authFetch(`${WEB_APP_URL}/api/jobs/import`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(job),
    });
    if (!importRes.ok) throw new Error(`Server error: ${importRes.status}`);

    resultEl.innerHTML = `
      <div class="msg success" style="margin-top:10px">✓ Saved to tracker</div>
      <div class="job-card">
        <div class="job-title">${esc(job.title || "Untitled")}</div>
        <div class="job-meta">${esc(job.company || "Unknown company")}${job.location ? " · " + esc(job.location) : ""}</div>
        <div class="job-section-label" style="margin-top:10px">Description</div>
        <div class="job-desc-preview">${esc(job.description.slice(0, 300))}${job.description.length > 300 ? "…" : ""}</div>
      </div>
      <a href="${WEB_APP_URL}/applications" target="_blank" style="display:flex;align-items:center;justify-content:center;gap:7px;margin-top:10px;padding:9px 14px;background:#0f1f3d;border:1px solid #1e40af;border-radius:8px;color:#93c5fd;text-decoration:none;font-size:13px;font-weight:500">
        View in Tracker
      </a>
    `;
    btn.disabled = false;
  } catch (err) {
    setMsg(resultEl, "error", err.message);
    btn.disabled = false;
  }
});

// Collapsible for "Paste manually instead"
(() => {
  const head = document.getElementById("save-paste-toggle");
  const body = document.getElementById("save-paste-body");
  head.addEventListener("click", () => {
    body.classList.toggle("open");
    head.querySelector(".chevron").textContent = body.classList.contains("open") ? "▲" : "▼";
  });
})();

// ─── Manual paste (inside Save Job tab) ─────────────────────────────────────
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

// ─── Generic job-page scraper (injected into page) ─────────────────────────
// Tries LinkedIn → common ATS selectors (Greenhouse, Lever, Workday, Ashby,
// Workable, SmartRecruiters) → falls back to body text. Returns the same
// shape as scrapeLinkedIn().job so /api/jobs/import accepts it directly.
function scrapeAnyJobPage() {
  const url = window.location.href;
  const host = window.location.hostname;

  function txt(sel) {
    const el = document.querySelector(sel);
    return el?.textContent?.trim() || "";
  }
  function meta(name) {
    const el = document.querySelector(`meta[property="${name}"], meta[name="${name}"]`);
    return el?.getAttribute("content") || "";
  }

  // LinkedIn — reuse selectors from scrapeLinkedIn
  if (/linkedin\.com/.test(host)) {
    const title =
      txt("h1.t-24.t-bold") ||
      txt(".job-details-jobs-unified-top-card__job-title h1") ||
      txt("h1");
    const company =
      txt(".job-details-jobs-unified-top-card__company-name a") ||
      txt("[data-test-employer-name]") ||
      txt(".jobs-unified-top-card__company-name");
    const location =
      txt(".job-details-jobs-unified-top-card__primary-description-without-tagline span") ||
      txt(".job-details-jobs-unified-top-card__tertiary-description-container span") ||
      txt(".jobs-unified-top-card__bullet");
    const description =
      txt(".jobs-description__content .jobs-description-content__text") ||
      txt("#job-details") ||
      txt(".jobs-box__html-content");
    if (description) return { title, company, location, description, url };
  }

  // Greenhouse
  let description =
    txt("#content") ||
    txt(".content") ||
    txt("[data-mapped='true']");
  let title = txt("h1.app-title") || txt(".app-title");
  let company = txt(".company-name") || txt(".main-header-text") || "";
  let location = txt(".location");

  // Lever
  if (!description) {
    description = txt(".posting-page .section-wrapper") || txt(".posting-description");
    title = title || txt(".posting-headline h2") || txt(".posting-name");
    location = location || txt(".sort-by-time .posting-category");
  }

  // Workday — they wrap description in a data-automation-id
  if (!description) {
    description =
      txt('[data-automation-id="jobPostingDescription"]') ||
      txt('[data-automation-id="jobDescription"]');
    title = title || txt('[data-automation-id="jobPostingHeader"]');
    location = location || txt('[data-automation-id="locations"]');
  }

  // Ashby
  if (!description) {
    description = txt('[class*="_descriptionText"]') || txt("._jobPostingPage_description_1mi6");
    title = title || txt('h1[class*="_title"]') || txt("h1");
  }

  // Workable / SmartRecruiters / generic
  if (!description) {
    description =
      txt("section.jobAd") ||
      txt('[class*="job-description"]') ||
      txt('[class*="JobDescription"]') ||
      txt('[class*="description"]') ||
      txt('article');
  }

  // Generic fallbacks
  title = title || txt("h1") || meta("og:title") || document.title || "";
  company = company || meta("og:site_name") || "";

  // Last resort: body innerText (with nav/header/footer pruned)
  if (!description || description.length < 200) {
    const main =
      document.querySelector("main") ||
      document.querySelector("[role='main']") ||
      document.querySelector("article") ||
      document.body;
    if (main) {
      const clone = main.cloneNode(true);
      clone.querySelectorAll("nav, header, footer, script, style, aside").forEach(n => n.remove());
      const candidate = (clone.innerText || "").trim();
      if (candidate.length > description.length) description = candidate;
    }
  }

  // Cleanup
  description = description.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  if (description.length > 12000) description = description.slice(0, 12000);

  return { title, company, location, description, url };
}

// ─── Find and click Apply button on intermediate pages (injected into page) ─
function findAndClickApplyButton() {
  // Common Apply button patterns on ATS job description pages
  const selectors = [
    // Generic apply buttons
    'a[href*="apply"]',
    'button[class*="apply"]',
    'a[class*="apply"]',
    'button[data-action*="apply"]',
    // Greenhouse
    '#grnhse_app a[href*="apply"]',
    '.opening-apply a',
    'a.apply-button',
    'a.btn-apply',
    // Lever
    '.posting-apply a',
    'a.postings-btn',
    '.apply-button a',
    // Workday
    'a[data-automation-id*="apply"]',
    'button[data-automation-id*="apply"]',
    // Generic text-based matching
    'a[title*="Apply" i]',
    'button[title*="Apply" i]',
  ];

  // Try specific selectors first
  for (const sel of selectors) {
    try {
      const el = document.querySelector(sel);
      if (el && el.offsetParent !== null) {
        const willOpenNewTab = el.tagName === "A" && (el.target === "_blank" || el.getAttribute("rel")?.includes("noopener"));
        el.click();
        return { success: true, newTab: willOpenNewTab };
      }
    } catch (_) {}
  }

  // Fallback: find any visible button/link containing "Apply" text
  const candidates = [
    ...document.querySelectorAll('a, button, [role="button"]')
  ].filter(el => {
    if (!el.offsetParent) return false;
    const text = el.textContent?.trim() || "";
    // Must say "Apply" but not "Applied" or "Apply with LinkedIn" (already handled)
    return /^apply(\s+now)?$/i.test(text) || /^apply\s+(for|to)\s+/i.test(text);
  });

  if (candidates.length > 0) {
    const el = candidates[0];
    const willOpenNewTab = el.tagName === "A" && (el.target === "_blank" || el.getAttribute("rel")?.includes("noopener"));
    el.click();
    return { success: true, newTab: willOpenNewTab };
  }

  return { success: false };
}

// ─── Phase 1: Extract form fields (injected into page) ─────────────────────
function extractFormFields() {
  // Resolve a human-readable label for any form element
  function labelFor(el) {
    const al = el.getAttribute("aria-label");
    if (al) return al.replace(/\s*\*\s*/g, "").trim();
    if (el.id) {
      const lbl = document.querySelector(`label[for="${el.id}"]`);
      if (lbl) return lbl.textContent.replace(/\s*\*\s*/g, "").trim();
    }
    const llby = el.getAttribute("aria-labelledby");
    if (llby) {
      const lbl = document.getElementById(llby.split(" ")[0]);
      if (lbl) return lbl.textContent.replace(/\s*\*\s*/g, "").trim();
    }
    const desc = el.getAttribute("aria-describedby");
    if (desc) {
      const lbl = document.getElementById(desc.split(" ")[0]);
      if (lbl) return lbl.textContent.replace(/\s*\*\s*/g, "").trim();
    }
    // Walk up parents to find nearby label text
    let parent = el.parentElement;
    for (let i = 0; i < 6 && parent; i++) {
      const labelEl = parent.querySelector("span:not(span span), label, legend");
      if (labelEl) {
        const text = labelEl.textContent.replace(/\s*\*\s*/g, "").trim();
        if (text) return text;
      }
      parent = parent.parentElement;
    }
    return "";
  }

  // Build a unique CSS selector for an element
  function selectorFor(el) {
    if (el.id) return `#${CSS.escape(el.id)}`;
    if (el.name) {
      const sel = `${el.tagName.toLowerCase()}[name="${CSS.escape(el.name)}"]`;
      if (document.querySelectorAll(sel).length === 1) return sel;
    }
    // Positional fallback
    const tag = el.tagName.toLowerCase();
    const siblings = Array.from(el.parentElement?.children || []).filter(c => c.tagName === el.tagName);
    const idx = siblings.indexOf(el);
    const parentSel = el.parentElement?.id
      ? `#${CSS.escape(el.parentElement.id)}`
      : el.parentElement?.tagName?.toLowerCase() || "body";
    return `${parentSel} > ${tag}:nth-of-type(${idx + 1})`;
  }

  function isVisible(el) {
    if (el.getAttribute("aria-hidden") === "true") return false;
    if (el.type === "hidden") return false;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return false;
    const style = window.getComputedStyle(el);
    return style.display !== "none" && style.visibility !== "hidden";
  }

  const fields = [];
  const seen = new Set();

  // ── Inputs + Textareas ──────────────────────────────────────────────────
  const inputs = document.querySelectorAll(
    'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]):not([type="file"]), textarea'
  );

  // Collect radio groups separately
  const radioGroups = {};

  inputs.forEach(el => {
    if (!isVisible(el)) return;
    if (el.classList.contains("select__input")) return; // React-select

    if (el.type === "radio") {
      const groupName = el.name || el.id;
      if (!groupName) return;
      if (!radioGroups[groupName]) {
        radioGroups[groupName] = { elements: [], label: "" };
      }
      const radioLabel = labelFor(el) || el.value;
      radioGroups[groupName].elements.push({ value: el.value, label: radioLabel, checked: el.checked });
      // Use the group-level label (fieldset/legend or first radio's parent label)
      if (!radioGroups[groupName].label) {
        const fieldset = el.closest("fieldset");
        if (fieldset) {
          const legend = fieldset.querySelector("legend");
          if (legend) radioGroups[groupName].label = legend.textContent.replace(/\s*\*\s*/g, "").trim();
        }
        if (!radioGroups[groupName].label) {
          // Try to find a group label in parent
          let p = el.parentElement;
          for (let i = 0; i < 4 && p; i++) {
            const heading = p.querySelector("h3, h4, p, span.label, label");
            if (heading && heading.textContent.trim().length > 2) {
              radioGroups[groupName].label = heading.textContent.replace(/\s*\*\s*/g, "").trim();
              break;
            }
            p = p.parentElement;
          }
        }
      }
      return;
    }

    if (el.type === "checkbox") {
      const id = selectorFor(el);
      if (seen.has(id)) return;
      seen.add(id);
      const label = labelFor(el);
      fields.push({
        id,
        tagName: "checkbox",
        inputType: "checkbox",
        name: el.name || "",
        label,
        placeholder: "",
        ariaLabel: el.getAttribute("aria-label") || "",
        required: el.required,
        options: ["true", "false"],
        currentValue: el.checked ? "true" : "",
        autocomplete: el.getAttribute("autocomplete") || "",
        fieldSignature: btoa(unescape(encodeURIComponent(label + "|" + (el.name || "") + "|"))),
      });
      return;
    }

    // Regular text input or textarea
    const id = selectorFor(el);
    if (seen.has(id)) return;
    seen.add(id);

    const label = labelFor(el);
    fields.push({
      id,
      tagName: el.tagName.toLowerCase() === "textarea" ? "textarea" : "input",
      inputType: el.type || "text",
      name: el.name || "",
      label,
      placeholder: el.placeholder || "",
      ariaLabel: el.getAttribute("aria-label") || "",
      required: el.required,
      options: [],
      currentValue: el.value || "",
      autocomplete: el.getAttribute("autocomplete") || "",
      fieldSignature: btoa(unescape(encodeURIComponent(label + "|" + (el.name || "") + "|" + (el.placeholder || "")))),
    });
  });

  // ── Radio groups ────────────────────────────────────────────────────────
  for (const [groupName, group] of Object.entries(radioGroups)) {
    const options = group.elements.map(r => r.label || r.value);
    const checkedEl = group.elements.find(r => r.checked);
    const sel = `input[name="${CSS.escape(groupName)}"]`;
    fields.push({
      id: sel,
      tagName: "radio-group",
      inputType: "radio",
      name: groupName,
      label: group.label || groupName,
      placeholder: "",
      ariaLabel: "",
      required: false,
      options,
      currentValue: checkedEl ? (checkedEl.label || checkedEl.value) : "",
      autocomplete: "",
      fieldSignature: btoa(unescape(encodeURIComponent((group.label || groupName) + "|" + groupName + "|"))),
    });
  }

  // ── Native Selects ───────────────────────────────────────────────────────
  document.querySelectorAll("select").forEach(el => {
    if (!isVisible(el)) return;
    const id = selectorFor(el);
    if (seen.has(id)) return;
    seen.add(id);

    const label = labelFor(el);
    const options = Array.from(el.options)
      .filter(o => o.value && o.value !== "" && !o.disabled)
      .map(o => o.text.trim());

    fields.push({
      id,
      tagName: "select",
      inputType: "select",
      name: el.name || "",
      label,
      placeholder: "",
      ariaLabel: el.getAttribute("aria-label") || "",
      required: el.required,
      options,
      currentValue: el.options[el.selectedIndex]?.text?.trim() || "",
      autocomplete: el.getAttribute("autocomplete") || "",
      fieldSignature: btoa(unescape(encodeURIComponent(label + "|" + (el.name || "") + "|"))),
    });
  });

  // ── Contenteditable divs (Workday, rich text editors) ──────────────────
  document.querySelectorAll('[contenteditable="true"], [contenteditable=""]').forEach(el => {
    if (!isVisible(el)) return;
    // Skip tiny inline editables (e.g. single-word spans)
    const rect = el.getBoundingClientRect();
    if (rect.height < 20) return;

    const id = selectorFor(el);
    if (seen.has(id)) return;
    seen.add(id);

    const label = labelFor(el);
    fields.push({
      id,
      tagName: "textarea", // treat as textarea for the backend
      inputType: "contenteditable",
      name: el.getAttribute("data-name") || el.getAttribute("name") || "",
      label,
      placeholder: el.getAttribute("placeholder") || el.getAttribute("data-placeholder") || "",
      ariaLabel: el.getAttribute("aria-label") || "",
      required: el.getAttribute("aria-required") === "true",
      options: [],
      currentValue: el.textContent?.trim() || "",
      autocomplete: "",
      fieldSignature: btoa(unescape(encodeURIComponent(label + "|contenteditable|"))),
    });
  });

  // ── ARIA listbox / combobox (custom dropdowns — React-Select, Greenhouse, Lever) ──
  document.querySelectorAll('[role="listbox"], [role="combobox"]').forEach(el => {
    if (!isVisible(el)) return;
    const id = selectorFor(el);
    if (seen.has(id)) return;
    seen.add(id);

    const label = labelFor(el);
    // Collect options from child [role="option"] elements
    const optionEls = el.querySelectorAll('[role="option"]');
    const options = Array.from(optionEls).map(o => o.textContent.trim()).filter(Boolean);

    // Find current selected value
    const selected = el.querySelector('[aria-selected="true"]');
    const currentValue = selected?.textContent?.trim()
      || el.getAttribute("aria-activedescendant") && document.getElementById(el.getAttribute("aria-activedescendant"))?.textContent?.trim()
      || "";

    fields.push({
      id,
      tagName: "select", // treat as select for the backend
      inputType: "aria-listbox",
      name: el.getAttribute("data-name") || el.getAttribute("name") || "",
      label,
      placeholder: el.getAttribute("placeholder") || "",
      ariaLabel: el.getAttribute("aria-label") || "",
      required: el.getAttribute("aria-required") === "true",
      options,
      currentValue,
      autocomplete: "",
      fieldSignature: btoa(unescape(encodeURIComponent(label + "|aria-listbox|" + options.slice(0, 3).join(",")))),
    });
  });

  // ── React-Select containers (css class-based detection) ────────────────
  document.querySelectorAll('.select__control, .css-1s2u09g-control, [class*="select__control"]').forEach(container => {
    // Walk up to the React-Select root
    const root = container.closest('[class*="select__container"], [class*="-container"]') || container.parentElement;
    if (!root || !isVisible(root)) return;
    const id = selectorFor(root);
    if (seen.has(id)) return;
    seen.add(id);

    const label = labelFor(root);
    // React-Select renders options in a menu portal — they may not be in DOM yet
    // Check for a hidden input that React-Select syncs with
    const hiddenInput = root.querySelector('input[type="hidden"]');
    const currentValue = root.querySelector('.select__single-value, [class*="singleValue"]')?.textContent?.trim()
      || hiddenInput?.value || "";

    // Try to find options if menu is open
    const menu = root.querySelector('.select__menu, [class*="select__menu"]')
      || document.querySelector('.select__menu-portal [class*="select__menu"]');
    const options = menu
      ? Array.from(menu.querySelectorAll('.select__option, [class*="select__option"]')).map(o => o.textContent.trim())
      : [];

    fields.push({
      id,
      tagName: "select",
      inputType: "react-select",
      name: hiddenInput?.name || "",
      label,
      placeholder: root.querySelector('.select__placeholder, [class*="placeholder"]')?.textContent?.trim() || "",
      ariaLabel: root.getAttribute("aria-label") || "",
      required: false,
      options,
      currentValue,
      autocomplete: "",
      fieldSignature: btoa(unescape(encodeURIComponent(label + "|react-select|"))),
    });
  });

  // ── ARIA radio groups (custom radio buttons, not native <input>) ───────
  document.querySelectorAll('[role="radiogroup"]').forEach(el => {
    if (!isVisible(el)) return;
    const id = selectorFor(el);
    if (seen.has(id)) return;
    seen.add(id);

    const label = labelFor(el);
    const radioEls = el.querySelectorAll('[role="radio"]');
    const options = Array.from(radioEls).map(r => r.textContent?.trim() || r.getAttribute("aria-label") || "").filter(Boolean);
    const checked = el.querySelector('[role="radio"][aria-checked="true"]');
    const currentValue = checked?.textContent?.trim() || "";

    fields.push({
      id,
      tagName: "radio-group",
      inputType: "aria-radio",
      name: el.getAttribute("data-name") || "",
      label,
      placeholder: "",
      ariaLabel: el.getAttribute("aria-label") || "",
      required: el.getAttribute("aria-required") === "true",
      options,
      currentValue,
      autocomplete: "",
      fieldSignature: btoa(unescape(encodeURIComponent(label + "|aria-radio|" + options.slice(0, 3).join(",")))),
    });
  });

  // ── ARIA checkboxes (custom, not native <input>) ───────────────────────
  document.querySelectorAll('[role="checkbox"]').forEach(el => {
    if (!isVisible(el)) return;
    // Skip if it's a real input we already captured
    if (el.tagName.toLowerCase() === "input") return;
    const id = selectorFor(el);
    if (seen.has(id)) return;
    seen.add(id);

    const label = labelFor(el) || el.textContent?.trim() || "";
    const isChecked = el.getAttribute("aria-checked") === "true";

    fields.push({
      id,
      tagName: "checkbox",
      inputType: "aria-checkbox",
      name: el.getAttribute("data-name") || "",
      label,
      placeholder: "",
      ariaLabel: el.getAttribute("aria-label") || "",
      required: el.getAttribute("aria-required") === "true",
      options: ["true", "false"],
      currentValue: isChecked ? "true" : "",
      autocomplete: "",
      fieldSignature: btoa(unescape(encodeURIComponent(label + "|aria-checkbox|"))),
    });
  });

  return fields;
}

// ─── Phase 3: Fill form fields with answers (injected into page) ───────────
async function fillFormFields(answers) {
  function setVal(el, value) {
    const proto = el.tagName === "TEXTAREA"
      ? window.HTMLTextAreaElement.prototype
      : window.HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
    if (setter) {
      setter.call(el, value);
    } else {
      el.value = value;
    }
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }

  const filled = [];
  const skipped = [];
  const review = [];

  for (const answer of answers) {
    if (!answer.value || answer.confidence === 0) continue;

    const el = document.querySelector(answer.id);
    if (!el) {
      review.push({ name: answer.classification || answer.id, reason: "element not found" });
      continue;
    }

    const tagName = el.tagName.toLowerCase();
    const inputType = el.type?.toLowerCase();

    try {
      // ── Select ────────────────────────────────────────────────────────
      if (tagName === "select") {
        const opts = Array.from(el.options);
        // Try exact match first, then case-insensitive
        let match = opts.find(o => o.text.trim() === answer.value);
        if (!match) match = opts.find(o => o.text.trim().toLowerCase() === answer.value.toLowerCase());
        if (!match) match = opts.find(o => o.text.trim().toLowerCase().includes(answer.value.toLowerCase()));
        if (match) {
          el.value = match.value;
          el.dispatchEvent(new Event("change", { bubbles: true }));
          filled.push({ name: answer.classification || el.name, confidence: answer.confidence, source: answer.source });
        } else {
          review.push({ name: answer.classification || el.name, reason: "no matching option" });
        }
        continue;
      }

      // ── Radio group ───────────────────────────────────────────────────
      if (inputType === "radio" || answer.id.includes('input[name=')) {
        const radios = document.querySelectorAll(answer.id);
        let matched = false;
        radios.forEach(radio => {
          const radioLabel = radio.parentElement?.textContent?.trim() || radio.value;
          if (radioLabel.toLowerCase().includes(answer.value.toLowerCase()) ||
              radio.value.toLowerCase() === answer.value.toLowerCase()) {
            radio.checked = true;
            radio.dispatchEvent(new Event("change", { bubbles: true }));
            radio.dispatchEvent(new Event("click", { bubbles: true }));
            matched = true;
          }
        });
        if (matched) {
          filled.push({ name: answer.classification || el.name, confidence: answer.confidence, source: answer.source });
        } else {
          review.push({ name: answer.classification || el.name, reason: "no matching radio" });
        }
        continue;
      }

      // ── Checkbox ──────────────────────────────────────────────────────
      if (inputType === "checkbox") {
        const shouldCheck = /^(yes|true|1)$/i.test(answer.value);
        if (el.checked !== shouldCheck) {
          el.checked = shouldCheck;
          el.dispatchEvent(new Event("change", { bubbles: true }));
          el.dispatchEvent(new Event("click", { bubbles: true }));
        }
        filled.push({ name: answer.classification || el.name, confidence: answer.confidence, source: answer.source });
        continue;
      }

      // ── Contenteditable ─────────────────────────────────────────────
      if (el.getAttribute("contenteditable") === "true" || el.getAttribute("contenteditable") === "") {
        if (el.textContent?.trim() && el.textContent.trim() === answer.value) {
          skipped.push({ name: answer.classification || answer.id });
          continue;
        }
        el.focus();
        el.textContent = answer.value;
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
        el.blur();
        filled.push({ name: answer.classification || answer.id, confidence: answer.confidence, source: answer.source });
        if (answer.confidence <= 0.8) {
          el.style.outline = "2px solid #fbbf24";
          el.style.outlineOffset = "1px";
        }
        continue;
      }

      // ── ARIA listbox / combobox (custom dropdown) ─────────────────────
      if (el.getAttribute("role") === "listbox" || el.getAttribute("role") === "combobox") {
        const optionEls = el.querySelectorAll('[role="option"]');
        let matched = false;
        optionEls.forEach(opt => {
          const text = opt.textContent?.trim();
          if (text && (text === answer.value || text.toLowerCase() === answer.value.toLowerCase())) {
            opt.click();
            matched = true;
          }
        });
        if (!matched && optionEls.length === 0) {
          // Menu may need to be opened first — try clicking the element, then retry
          el.click();
          await new Promise(r => setTimeout(r, 300));
          const retryOpts = el.querySelectorAll('[role="option"]');
          retryOpts.forEach(opt => {
            const text = opt.textContent?.trim();
            if (text && (text === answer.value || text.toLowerCase() === answer.value.toLowerCase())) {
              opt.click();
              matched = true;
            }
          });
        }
        filled.push({ name: answer.classification || answer.id, confidence: matched ? answer.confidence : 0.3, source: answer.source });
        continue;
      }

      // ── React-Select container ────────────────────────────────────────
      if (el.querySelector && (el.querySelector('.select__control, [class*="select__control"]'))) {
        // Click to open the menu
        const control = el.querySelector('.select__control, [class*="select__control"]');
        if (control) control.click();
        await new Promise(r => setTimeout(r, 300));

        // Look for menu options (may be in a portal)
        const menu = el.querySelector('.select__menu, [class*="select__menu"]')
          || document.querySelector('.select__menu-portal .select__menu, [class*="menu-portal"] [class*="select__menu"]');
        let matched = false;
        if (menu) {
          const opts = menu.querySelectorAll('.select__option, [class*="select__option"]');
          opts.forEach(opt => {
            const text = opt.textContent?.trim();
            if (text && (text === answer.value || text.toLowerCase() === answer.value.toLowerCase()
                || text.toLowerCase().includes(answer.value.toLowerCase()))) {
              opt.click();
              matched = true;
            }
          });
        }
        // Also try typing into the React-Select input
        if (!matched) {
          const searchInput = el.querySelector('.select__input input, input[class*="select__input"]');
          if (searchInput) {
            setVal(searchInput, answer.value);
            await new Promise(r => setTimeout(r, 500));
            // Click the first matching option
            const filteredMenu = el.querySelector('.select__menu, [class*="select__menu"]')
              || document.querySelector('.select__menu-portal .select__menu');
            if (filteredMenu) {
              const firstOpt = filteredMenu.querySelector('.select__option, [class*="select__option"]');
              if (firstOpt) { firstOpt.click(); matched = true; }
            }
          }
        }
        filled.push({ name: answer.classification || answer.id, confidence: matched ? answer.confidence : 0.3, source: answer.source });
        continue;
      }

      // ── ARIA radiogroup ───────────────────────────────────────────────
      if (el.getAttribute("role") === "radiogroup") {
        const radioEls = el.querySelectorAll('[role="radio"]');
        let matched = false;
        radioEls.forEach(r => {
          const text = r.textContent?.trim() || r.getAttribute("aria-label") || "";
          if (text.toLowerCase().includes(answer.value.toLowerCase()) ||
              answer.value.toLowerCase().includes(text.toLowerCase())) {
            r.click();
            r.setAttribute("aria-checked", "true");
            matched = true;
          }
        });
        filled.push({ name: answer.classification || answer.id, confidence: matched ? answer.confidence : 0.3, source: answer.source });
        continue;
      }

      // ── ARIA checkbox ─────────────────────────────────────────────────
      if (el.getAttribute("role") === "checkbox") {
        const shouldCheck = /^(yes|true|1)$/i.test(answer.value);
        const isChecked = el.getAttribute("aria-checked") === "true";
        if (isChecked !== shouldCheck) {
          el.click();
        }
        filled.push({ name: answer.classification || answer.id, confidence: answer.confidence, source: answer.source });
        continue;
      }

      // ── Input / Textarea ──────────────────────────────────────────────
      if (el.value && el.value === answer.value) {
        skipped.push({ name: answer.classification || el.name });
        continue;
      }
      if (el.value && answer.confidence < 0.9) {
        // Don't overwrite existing values with low-confidence answers
        skipped.push({ name: answer.classification || el.name });
        continue;
      }
      setVal(el, answer.value);
      filled.push({ name: answer.classification || el.name, confidence: answer.confidence, source: answer.source });

      // Highlight low-confidence fields for review
      if (answer.confidence <= 0.8) {
        el.style.outline = "2px solid #fbbf24";
        el.style.outlineOffset = "1px";
      }
    } catch (err) {
      review.push({ name: answer.classification || answer.id, reason: err.message });
    }
  }

  return { filled, skipped, review };
}

// ─── Resume file upload (injected into page) ──────────────────────────────
function uploadResumeFile(resumeContent) {
  function labelFor(el) {
    const al = el.getAttribute("aria-label");
    if (al) return al.toLowerCase();
    if (el.id) {
      const lbl = document.querySelector(`label[for="${el.id}"]`);
      if (lbl) return lbl.textContent.toLowerCase();
    }
    let parent = el.parentElement;
    for (let i = 0; i < 4 && parent; i++) {
      const labelEl = parent.querySelector("span, label");
      if (labelEl) return labelEl.textContent.toLowerCase();
      parent = parent.parentElement;
    }
    return "";
  }

  const fileInputs = Array.from(document.querySelectorAll('input[type="file"]'));
  const resumeInput = fileInputs.find(input => /resume|cv/i.test(labelFor(input))) || fileInputs[0];

  if (!resumeInput) return { success: false };

  try {
    const file = new File([resumeContent], "tailored-resume.txt", { type: "text/plain" });
    const dt = new DataTransfer();
    dt.items.add(file);
    resumeInput.files = dt.files;
    resumeInput.dispatchEvent(new Event("change", { bubbles: true }));
    return { success: true };
  } catch (e) {
    return { success: false };
  }
}
