import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { auth } from "../lib/firebase-client";
import { onAuthStateChanged, signOut } from "firebase/auth";

export default function Settings() {
  const router = useRouter();
  const menuRef = useRef(null);
  const [user, setUser] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("general");
  const [saveStatus, setSaveStatus] = useState("");

  // General settings
  const [language, setLanguage] = useState("en");
  const [fontSize, setFontSize] = useState(14);
  
  // Summary settings
  const [defaultSummaryLength, setDefaultSummaryLength] = useState(50);
  const [defaultSummaryStyle, setDefaultSummaryStyle] = useState("balanced");
  
  // Translation settings
  const [defaultTranslateLang, setDefaultTranslateLang] = useState("");
  const [autoTranslate, setAutoTranslate] = useState(false);
  
  // Export settings
  const [defaultExportFormat, setDefaultExportFormat] = useState("txt");
  const [defaultExportKind, setDefaultExportKind] = useState("summary");
  
  // Notification settings
  const [emailNotif, setEmailNotif] = useState(true);

  // Helper to namespace settings per user
  const getSettingsKey = (uid) => (uid ? `neoSettings_${uid}` : "neoSettings");
  const clampFontSize = (size) => {
    const n = Number.isFinite(size) ? size : 14;
    return Math.min(20, Math.max(12, n));
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) {
        router.push("/login");
      }
    });
    return () => unsub();
  }, [router]);

  useEffect(() => {
    // Load saved settings from localStorage (namespaced by user)
    try {
      const saved = JSON.parse(localStorage.getItem(getSettingsKey(user?.uid)) || "{}");
      if (saved.language) setLanguage(saved.language);
      if (saved.fontSize) setFontSize(clampFontSize(saved.fontSize));
      if (saved.defaultSummaryLength) setDefaultSummaryLength(saved.defaultSummaryLength);
      if (saved.defaultSummaryStyle) setDefaultSummaryStyle(saved.defaultSummaryStyle);
      if (saved.defaultTranslateLang !== undefined) setDefaultTranslateLang(saved.defaultTranslateLang);
      if (typeof saved.autoTranslate === "boolean") setAutoTranslate(saved.autoTranslate);
      if (saved.defaultExportFormat) setDefaultExportFormat(saved.defaultExportFormat);
      if (saved.defaultExportKind) setDefaultExportKind(saved.defaultExportKind);
      if (typeof saved.emailNotif === "boolean") setEmailNotif(saved.emailNotif);
    } catch (e) {
      console.error("Failed to load settings:", e);
    }
  }, [user?.uid]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    }
    if (menuOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  const saveSettings = () => {
    try {
      const settings = {
        language,
        fontSize: clampFontSize(fontSize),
        defaultSummaryLength,
        defaultSummaryStyle,
        defaultTranslateLang,
        autoTranslate,
        defaultExportFormat,
        defaultExportKind,
        emailNotif,
      };
      localStorage.setItem(getSettingsKey(user?.uid), JSON.stringify(settings));
      setSaveStatus("✓ Settings saved successfully!");
      setTimeout(() => setSaveStatus(""), 3000);
    } catch (e) {
      setSaveStatus("✗ Failed to save settings: " + (e.message || e));
    }
  };

  const resetSettings = () => {
    if (confirm("Reset all settings to default values?")) {
      localStorage.removeItem(getSettingsKey(user?.uid));
      setLanguage("en");
      setFontSize(14);
      setDefaultSummaryLength(50);
      setDefaultSummaryStyle("balanced");
      setDefaultTranslateLang("");
      setAutoTranslate(false);
      setDefaultExportFormat("txt");
      setDefaultExportKind("summary");
      setEmailNotif(true);
      setSaveStatus("✓ Settings reset to defaults!");
      setTimeout(() => setSaveStatus(""), 3000);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setMenuOpen(false);
      router.push("/login");
    } catch (e) {
      console.error("Logout failed", e);
    }
  };

  return (
    <div style={{ fontFamily: "Arial, sans-serif", background: "#f0f0f0", minHeight: "100vh" }}>
      {/* Header */}
      <header style={{ background: "#fff", padding: "10px 20px", borderBottom: "1px solid #ddd", display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative" }}>
        <button onClick={() => router.push("/")} style={{ display: "flex", alignItems: "center", gap: 8, background: "transparent", border: "none", cursor: "pointer", fontSize: 18, fontWeight: "bold" }}>
          <span style={{ marginRight: 5 }}>♦</span>
          <span>NeoSummary</span>
        </button>

        <div style={{ display: "flex", alignItems: "center", position: "relative" }} ref={menuRef}>
          <button style={linkBtn} onClick={() => router.push("/summary-history")}>Summary History</button>
          <button onClick={() => setMenuOpen((v) => !v)} style={{ ...iconBtn, marginLeft: 8 }}>
            {user?.photoURL ? (
              <img src={user.photoURL} alt="User" style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", border: "1px solid #ddd" }} />
            ) : (
              "👤"
            )}
          </button>

          {menuOpen && (
            <div style={dropdown}>
              <button onClick={() => router.push("/profile")} style={menuItemStyle}>Profile</button>
              <button onClick={() => router.push("/settings")} style={menuItemStyle}>Settings</button>
              <div style={{ height: 1, background: "#f0f0f0" }} />
              <button onClick={handleLogout} style={{ ...menuItemStyle, color: "#d9534f" }}>Logout</button>
            </div>
          )}
        </div>
      </header>

      {/* Main */}
      <div style={{ display: "flex", height: "calc(100vh - 60px)" }}>
        {/* Sidebar */}
        <aside style={{ width: 200, background: "#666", color: "#fff", padding: 20 }}>
          <div style={{ marginBottom: 20, textAlign: "center" }}>
            <div style={{ width: 60, height: 60, background: "#888", borderRadius: "50%", margin: "0 auto 10px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 24 }}>⚙️</span>
            </div>
            <div style={{ fontSize: 13, opacity: 0.9 }}>Settings</div>
          </div>

          <nav style={{ display: "grid", gap: 8 }}>
            <button onClick={() => setActiveTab("general")} style={activeTab === "general" ? sideBtnActive : sideBtn}>General</button>
            <button onClick={() => setActiveTab("summary")} style={activeTab === "summary" ? sideBtnActive : sideBtn}>Summary</button>
            <button onClick={() => setActiveTab("translation")} style={activeTab === "translation" ? sideBtnActive : sideBtn}>Translation</button>
            <button onClick={() => setActiveTab("export")} style={activeTab === "export" ? sideBtnActive : sideBtn}>Export</button>
            <button onClick={() => setActiveTab("notifications")} style={activeTab === "notifications" ? sideBtnActive : sideBtn}>Notifications</button>
            <button onClick={() => router.push("/")} style={sideBtn}>Back to Home</button>
          </nav>
        </aside>

        {/* Content */}
        <main style={{ flex: 1, padding: 20, display: "grid", gap: 20, alignContent: "start", overflowY: "auto" }}>
          {/* General Tab */}
          {activeTab === "general" && (
            <section style={card}>
              <div style={{ fontWeight: 700, marginBottom: 16, fontSize: 18 }}>General Settings</div>
              <div style={fieldRow}>
                <label style={label}>Interface Language</label>
                <select value={language} onChange={(e) => setLanguage(e.target.value)} style={input}>
                  <option value="en">English</option>
                  <option value="zh">Chinese</option>
                  <option value="ms">Malay</option>
                </select>
              </div>
              <div style={fieldRow}>
                <label style={label}>Font Size</label>
                <input type="number" min={12} max={20} value={fontSize} onChange={(e) => setFontSize(clampFontSize(Number(e.target.value)))} style={{ ...input, width: 100 }} />
                <span style={{ color: "#666", fontSize: 12 }}>px</span>
              </div>
            </section>
          )}

          {/* Summary Tab */}
          {activeTab === "summary" && (
            <section style={card}>
              <div style={{ fontWeight: 700, marginBottom: 16, fontSize: 18 }}>Summary Settings</div>
              <div style={fieldRow}>
                <label style={label}>Default Summary Length</label>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
                  <input
                    type="range"
                    min={20}
                    max={80}
                    value={defaultSummaryLength}
                    onChange={(e) => setDefaultSummaryLength(Number(e.target.value))}
                    style={{ flex: 1 }}
                  />
                  <span style={{ minWidth: 50, textAlign: "right" }}>{defaultSummaryLength}%</span>
                </div>
              </div>
              <div style={fieldRow}>
                <label style={label}>Default Summary Style</label>
                <select value={defaultSummaryStyle} onChange={(e) => setDefaultSummaryStyle(e.target.value)} style={input}>
                  <option value="balanced">Balanced</option>
                  <option value="priority">Priority-based</option>
                </select>
              </div>
            </section>
          )}

          {/* Translation Tab */}
          {activeTab === "translation" && (
            <section style={card}>
              <div style={{ fontWeight: 700, marginBottom: 16, fontSize: 18 }}>Translation Settings</div>
              <div style={fieldRow}>
                <label style={label}>Default Target Language</label>
                <select value={defaultTranslateLang} onChange={(e) => setDefaultTranslateLang(e.target.value)} style={input}>
                  <option value="">None (select manually)</option>
                  <option value="en">English</option>
                  <option value="zh">Chinese</option>
                  <option value="ms">Malay</option>
                </select>
              </div>
              <div style={fieldRow}>
                <label style={label}>Auto-translate after summary</label>
                <label style={toggleContainer}>
                  <input type="checkbox" checked={autoTranslate} onChange={(e) => setAutoTranslate(e.target.checked)} style={{ display: "none" }} />
                  <span style={{ ...toggleSwitch, background: autoTranslate ? "#4CAF50" : "#ccc" }}>
                    <span style={{ ...toggleSlider, left: autoTranslate ? "22px" : "2px" }} />
                  </span>
                </label>
              </div>
            </section>
          )}

          {/* Export Tab */}
          {activeTab === "export" && (
            <section style={card}>
              <div style={{ fontWeight: 700, marginBottom: 16, fontSize: 18 }}>Export Settings</div>
              <div style={fieldRow}>
                <label style={label}>Default Export Format</label>
                <select value={defaultExportFormat} onChange={(e) => setDefaultExportFormat(e.target.value)} style={input}>
                  <option value="txt">TXT</option>
                  <option value="doc">DOC</option>
                  <option value="pdf">PDF</option>
                </select>
              </div>
              <div style={fieldRow}>
                <label style={label}>Default Export Content</label>
                <select value={defaultExportKind} onChange={(e) => setDefaultExportKind(e.target.value)} style={input}>
                  <option value="summary">Summary</option>
                  <option value="translated">Translated</option>
                  <option value="bullets">Bullets</option>
                </select>
              </div>
            </section>
          )}

          {/* Notifications Tab */}
          {activeTab === "notifications" && (
            <section style={card}>
              <div style={{ fontWeight: 700, marginBottom: 16, fontSize: 18 }}>Notifications</div>
              <div style={fieldRow}>
                <label style={label}>Email Notifications</label>
                <label style={toggleContainer}>
                  <input type="checkbox" checked={emailNotif} onChange={(e) => setEmailNotif(e.target.checked)} style={{ display: "none" }} />
                  <span style={{ ...toggleSwitch, background: emailNotif ? "#4CAF50" : "#ccc" }}>
                    <span style={{ ...toggleSlider, left: emailNotif ? "22px" : "2px" }} />
                  </span>
                </label>
              </div>
            </section>
          )}

          {/* Action Buttons */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button style={primaryBtn} onClick={saveSettings}>Save Settings</button>
            <button style={secondaryBtn} onClick={resetSettings}>Reset to Defaults</button>
            <button style={secondaryBtn} onClick={() => router.push("/")}>Cancel</button>
          </div>
          {saveStatus && (
            <div style={{ fontSize: 13, color: saveStatus.includes("✓") ? "#4CAF50" : "#d9534f" }}>{saveStatus}</div>
          )}
        </main>
      </div>
    </div>
  );
}

const linkBtn = { marginRight: "10px", padding: "8px 16px", background: "transparent", border: "none", cursor: "pointer" };
const iconBtn = { padding: "8px 12px", background: "transparent", border: "none", cursor: "pointer" };
const dropdown = { position: "absolute", right: 0, top: 56, background: "#fff", border: "1px solid #e5e5e5", boxShadow: "0 6px 18px rgba(0,0,0,0.08)", borderRadius: 8, width: 180, zIndex: 50, overflow: "hidden" };
const menuItemStyle = { display: "block", width: "100%", padding: "10px 14px", textAlign: "left", background: "transparent", border: "none", cursor: "pointer", fontSize: 14 };

const sideBtn = { width: "100%", textAlign: "left", padding: "8px 10px", background: "rgba(255,255,255,0.1)", border: "none", color: "#fff", borderRadius: 6, cursor: "pointer" };
const sideBtnActive = { ...sideBtn, background: "#4CAF50" };

const card = { background: "#fff", border: "1px solid #ddd", borderRadius: 8, padding: 20 };
const fieldRow = { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderTop: "1px solid #f1f1f1", gap: 16 };
const label = { color: "#666", minWidth: 200, display: "inline-block" };
const input = { padding: "8px 12px", border: "1px solid #ddd", borderRadius: 6, background: "#fff", flex: 1, minWidth: 200, fontSize: 14 };

const primaryBtn = { padding: "10px 20px", background: "#666", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 14 };
const secondaryBtn = { padding: "10px 20px", background: "#eee", color: "#333", border: "1px solid #ddd", borderRadius: 6, cursor: "pointer", fontSize: 14 };

const toggleContainer = { display: "inline-block", cursor: "pointer" };
const toggleSwitch = { position: "relative", display: "inline-block", width: "44px", height: "24px", borderRadius: "12px", transition: "background-color 0.3s" };
const toggleSlider = { position: "absolute", width: "20px", height: "20px", borderRadius: "50%", background: "#fff", bottom: "2px", transition: "left 0.3s" };
