import { useState } from "react";

type Status = "idle" | "sending" | "sent" | "error";

const WEB_APP_URL = "http://localhost:3000";

export default function Manual() {
  const [description, setDescription] = useState("");
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSend() {
    if (!description.trim()) return;
    setStatus("sending");
    setErrorMsg("");

    try {
      const res = await fetch(`${WEB_APP_URL}/api/jobs/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          company: company.trim(),
          description: description.trim(),
          location: "",
        }),
      });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      setStatus("sent");
      setDescription("");
      setTitle("");
      setCompany("");
      setTimeout(() => setStatus("idle"), 3000);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Send failed");
      setStatus("error");
    }
  }

  return (
    <div>
      <p style={{ fontSize: "12px", color: "#9ca3af", marginBottom: "14px" }}>
        Paste a job description to send it to the web app.
      </p>

      <div style={{ marginBottom: "10px" }}>
        <label style={labelStyle}>Job Title (optional)</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Auto-detected by AI"
          style={inputStyle}
        />
      </div>

      <div style={{ marginBottom: "10px" }}>
        <label style={labelStyle}>Company (optional)</label>
        <input
          type="text"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          placeholder="Auto-detected by AI"
          style={inputStyle}
        />
      </div>

      <div style={{ marginBottom: "12px" }}>
        <label style={labelStyle}>
          Job Description <span style={{ color: "#f87171" }}>*</span>
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Paste the full job description here..."
          rows={8}
          style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }}
        />
      </div>

      <button
        onClick={handleSend}
        disabled={!description.trim() || status === "sending"}
        style={btnStyle(!description.trim() || status === "sending")}
      >
        {status === "sending" ? "Sending..." : "Send to App"}
      </button>

      {status === "error" && (
        <div style={errorStyle}>{errorMsg}</div>
      )}

      {status === "sent" && (
        <div style={successStyle}>Sent! Job will appear in the web app within 5 seconds.</div>
      )}
    </div>
  );
}

// Styles
const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "11px",
  fontWeight: 500,
  color: "#9ca3af",
  marginBottom: "4px",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  background: "#1f2937",
  border: "1px solid #374151",
  borderRadius: "6px",
  fontSize: "12px",
  color: "#e5e7eb",
  outline: "none",
  boxSizing: "border-box",
};

function btnStyle(disabled: boolean): React.CSSProperties {
  return {
    width: "100%",
    padding: "9px 14px",
    borderRadius: "8px",
    border: "none",
    cursor: disabled ? "not-allowed" : "pointer",
    fontSize: "13px",
    fontWeight: 500,
    background: disabled ? "#374151" : "#4f46e5",
    color: disabled ? "#6b7280" : "#e5e7eb",
    transition: "all 0.15s",
  };
}

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
