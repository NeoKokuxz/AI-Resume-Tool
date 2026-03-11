import { useState } from "react";
import AutoScan from "./AutoScan";
import Manual from "./Manual";

type Tab = "scan" | "manual";

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("scan");

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Header */}
      <div
        style={{
          padding: "16px 16px 0",
          borderBottom: "1px solid #1f2937",
        }}
      >
        <div style={{ marginBottom: "12px" }}>
          <h1
            style={{
              margin: 0,
              fontSize: "15px",
              fontWeight: 700,
              color: "#f9fafb",
              letterSpacing: "-0.01em",
            }}
          >
            AI Resume Tool
          </h1>
          <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#6b7280" }}>
            Save jobs to your tracker
          </p>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: "4px" }}>
          {(["scan", "manual"] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: "6px 14px",
                borderRadius: "6px 6px 0 0",
                border: "none",
                cursor: "pointer",
                fontSize: "13px",
                fontWeight: 500,
                background:
                  activeTab === tab ? "#111827" : "transparent",
                color: activeTab === tab ? "#e5e7eb" : "#6b7280",
                transition: "all 0.15s",
              }}
            >
              {tab === "scan" ? "Auto Scan" : "Manual"}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: "16px", background: "#111827" }}>
        {activeTab === "scan" ? <AutoScan /> : <Manual />}
      </div>
    </div>
  );
}
