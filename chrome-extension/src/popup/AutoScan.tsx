import { useState } from "react";

interface Job {
  title: string;
  company: string;
  location: string;
  description: string;
  url?: string;
}

type Status = "idle" | "scanning" | "found" | "sending" | "sent" | "error";

const WEB_APP_URL = "http://localhost:3000";

export default function AutoScan() {
  const [status, setStatus] = useState<Status>("idle");
  const [job, setJob] = useState<Job | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  async function handleScan() {
    setStatus("scanning");
    setJob(null);
    setErrorMsg("");

    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (!tab.id) throw new Error("No active tab");

      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: scrapeLinkedIn,
      });

      const result = results[0]?.result;
      if (!result || result.error) {
        throw new Error(result?.error || "No job data found");
      }

      setJob(result.job);
      setStatus("found");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Scan failed");
      setStatus("error");
    }
  }

  async function handleSend() {
    if (!job) return;
    setStatus("sending");

    try {
      const res = await fetch(`${WEB_APP_URL}/api/jobs/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(job),
      });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      setStatus("sent");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Send failed");
      setStatus("error");
    }
  }

  return (
    <div>
      <p style={{ fontSize: "12px", color: "#9ca3af", marginBottom: "14px" }}>
        Navigate to a LinkedIn job listing, then click Scan Page.
      </p>

      <button onClick={handleScan} disabled={status === "scanning"} style={btnStyle(status === "scanning")}>
        {status === "scanning" ? "Scanning..." : "Scan Page"}
      </button>

      {status === "error" && (
        <div style={errorStyle}>{errorMsg}</div>
      )}

      {(status === "found" || status === "sending" || status === "sent") && job && (
        <div style={cardStyle}>
          <div style={{ fontSize: "13px", fontWeight: 600, color: "#f9fafb", marginBottom: "4px" }}>
            {job.title || "Unknown Title"}
          </div>
          <div style={{ fontSize: "12px", color: "#9ca3af" }}>{job.company}</div>
          {job.location && (
            <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "2px" }}>
              {job.location}
            </div>
          )}
        </div>
      )}

      {status === "found" && (
        <button onClick={handleSend} style={{ ...btnStyle(false), marginTop: "10px", background: "#4f46e5" }}>
          Send to App
        </button>
      )}

      {status === "sending" && (
        <div style={{ fontSize: "12px", color: "#9ca3af", marginTop: "10px" }}>Sending...</div>
      )}

      {status === "sent" && (
        <div style={successStyle}>Sent! Job will appear in the web app within 5 seconds.</div>
      )}
    </div>
  );
}

// Injected into the page — must be self-contained (no closure variables)
function scrapeLinkedIn(): { job: { title: string; company: string; location: string; description: string; url: string } } | { error: string } {
  const title =
    document.querySelector("h1.t-24.t-bold")?.textContent?.trim() ||
    document.querySelector(".job-details-jobs-unified-top-card__job-title h1")?.textContent?.trim() ||
    document.querySelector("h1")?.textContent?.trim() ||
    "";

  const company =
    document.querySelector(".job-details-jobs-unified-top-card__company-name a")?.textContent?.trim() ||
    document.querySelector("[data-test-employer-name]")?.textContent?.trim() ||
    document.querySelector(".jobs-unified-top-card__company-name")?.textContent?.trim() ||
    "";

  const location =
    document.querySelector(".job-details-jobs-unified-top-card__primary-description-without-tagline span")?.textContent?.trim() ||
    document.querySelector(".jobs-unified-top-card__bullet")?.textContent?.trim() ||
    "";

  const description =
    document.querySelector(".jobs-description__content .jobs-description-content__text")?.textContent?.trim() ||
    document.querySelector("#job-details")?.textContent?.trim() ||
    document.querySelector(".jobs-box__html-content")?.textContent?.trim() ||
    "";

  const url = window.location.href;

  if (!title && !company) {
    return { error: "No job found on this page. Make sure you are on a LinkedIn job listing." };
  }

  return { job: { title, company, location, description, url } };
}

// Styles
function btnStyle(disabled: boolean): React.CSSProperties {
  return {
    width: "100%",
    padding: "9px 14px",
    borderRadius: "8px",
    border: "none",
    cursor: disabled ? "not-allowed" : "pointer",
    fontSize: "13px",
    fontWeight: 500,
    background: disabled ? "#374151" : "#1f2937",
    color: disabled ? "#6b7280" : "#e5e7eb",
    transition: "all 0.15s",
  };
}

const cardStyle: React.CSSProperties = {
  marginTop: "12px",
  padding: "12px",
  background: "#1f2937",
  borderRadius: "8px",
  border: "1px solid #374151",
};

const errorStyle: React.CSSProperties = {
  marginTop: "10px",
  padding: "8px 12px",
  background: "#450a0a",
  border: "1px solid #7f1d1d",
  borderRadius: "6px",
  fontSize: "12px",
  color: "#fca5a5",
};

const successStyle: React.CSSProperties = {
  marginTop: "10px",
  padding: "8px 12px",
  background: "#052e16",
  border: "1px solid #14532d",
  borderRadius: "6px",
  fontSize: "12px",
  color: "#86efac",
};
