import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { auth } from "../lib/firebase-client";
import {
  onAuthStateChanged,
  signOut,
  updateProfile,
  reload,
  deleteUser,
  sendEmailVerification,
  updatePassword,
  updateEmail,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from "firebase/auth";

export default function Profile() {
  const router = useRouter();
  const menuRef = useRef(null);
  const [user, setUser] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  
  // Profile fields
  const [displayName, setDisplayName] = useState("");
  const [photoURL, setPhotoURL] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  
  // Password change
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordStatus, setPasswordStatus] = useState("");
  
  // Email change
  const [newEmail, setNewEmail] = useState("");
  const [emailStatus, setEmailStatus] = useState("");
  
  // Statistics
  const [summaryCount, setSummaryCount] = useState(0);
  const [loadingStats, setLoadingStats] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        await reload(u).catch(() => {});
        setDisplayName(u.displayName || "");
        setPhotoURL(u.photoURL || "");
        setNewEmail(u.email || "");
        fetchUserStats(u.uid);
      } else {
        setDisplayName("");
        setPhotoURL("");
        setNewEmail("");
        setSummaryCount(0);
        router.push("/login");
      }
    });
    return () => unsub();
  }, [router]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    }
    if (menuOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  const fetchUserStats = async (userId) => {
    setLoadingStats(true);
    try {
      const response = await fetch(`/api/get-summaries?userId=${userId}`);
      const data = await response.json();
      if (data.summaries) {
        setSummaryCount(data.summaries.length);
      }
    } catch (err) {
      console.error("Failed to fetch stats:", err);
    } finally {
      setLoadingStats(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setMenuOpen(false);
      router.push("/login");
    } catch (e) {
      console.error("Logout failed", e);
      alert("Logout failed: " + (e.message || e));
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setBusy(true);
    setStatus("");
    try {
      await updateProfile(user, {
        displayName: displayName.trim() || null,
        photoURL: photoURL.trim() || null,
      });
      await reload(user);
      setUser({ ...auth.currentUser });
      setStatus("✓ Profile updated successfully!");
      setTimeout(() => setStatus(""), 3000);
    } catch (e) {
      setStatus(`✗ Update failed: ${e.message || e}`);
    } finally {
      setBusy(false);
    }
  };

  const handleSendVerification = async () => {
    if (!user) return;
    setBusy(true);
    setStatus("");
    try {
      await sendEmailVerification(user);
      setStatus("✓ Verification email sent! Please check your inbox.");
      setTimeout(() => setStatus(""), 5000);
    } catch (e) {
      setStatus(`✗ Failed to send verification: ${e.message || e}`);
    } finally {
      setBusy(false);
    }
  };

  const handleChangePassword = async () => {
    if (!user || !currentPassword || !newPassword) {
      setPasswordStatus("✗ Please fill in all password fields.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordStatus("✗ New passwords do not match.");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordStatus("✗ Password must be at least 6 characters.");
      return;
    }

    setBusy(true);
    setPasswordStatus("");
    try {
      // Re-authenticate user
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      
      // Update password
      await updatePassword(user, newPassword);
      setPasswordStatus("✓ Password updated successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPasswordStatus(""), 3000);
    } catch (e) {
      if (e.code === "auth/wrong-password") {
        setPasswordStatus("✗ Current password is incorrect.");
      } else if (e.code === "auth/weak-password") {
        setPasswordStatus("✗ Password is too weak.");
      } else {
        setPasswordStatus(`✗ Failed: ${e.message || e}`);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleChangeEmail = async () => {
    if (!user || !newEmail || newEmail === user.email) {
      setEmailStatus("✗ Please enter a new email address.");
      return;
    }
    if (!newEmail.includes("@")) {
      setEmailStatus("✗ Please enter a valid email address.");
      return;
    }

    setBusy(true);
    setEmailStatus("");
    try {
      await updateEmail(user, newEmail);
      await reload(user);
      setUser({ ...auth.currentUser });
      setEmailStatus("✓ Email updated successfully! Please verify your new email.");
      setTimeout(() => setEmailStatus(""), 5000);
    } catch (e) {
      if (e.code === "auth/requires-recent-login") {
        setEmailStatus("✗ Please log out and log back in, then try again.");
      } else {
        setEmailStatus(`✗ Failed: ${e.message || e}`);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    const confirm1 = prompt("Type 'DELETE' to confirm account deletion:");
    if (confirm1 !== "DELETE") {
      return;
    }
    const ok = confirm("This will permanently delete your account and all your data. This cannot be undone. Continue?");
    if (!ok) return;
    
    setBusy(true);
    setStatus("");
    try {
      await deleteUser(user);
      router.push("/register");
    } catch (e) {
      setStatus(
        e?.code === "auth/requires-recent-login"
          ? "✗ Delete requires a recent login. Please log out and log back in first."
          : `✗ Delete failed: ${e.message || e}`
      );
    } finally {
      setBusy(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    try {
      const date = new Date(dateString);
      return date.toLocaleString();
    } catch {
      return dateString;
    }
  };

  if (!user) {
    return (
      <div style={{ fontFamily: "Arial, sans-serif", background: "#f0f0f0", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "Arial, sans-serif", background: "#f0f0f0", minHeight: "100vh" }}>
      {/* Header */}
      <header style={{ background: "#fff", padding: "10px 20px", borderBottom: "1px solid #ddd", display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative" }}>
        <button onClick={() => router.push("/")} style={{ display: "flex", alignItems: "center", gap: 8, background: "transparent", border: "none", cursor: "pointer", fontSize: 18, fontWeight: "bold" }} aria-label="Go to home">
          <span style={{ marginRight: 5 }}>♦</span>
          <span>NeoSummary</span>
        </button>

        <div style={{ display: "flex", alignItems: "center", position: "relative" }} ref={menuRef}>
          <button style={linkBtn} onClick={() => router.push("/summary-history")}>Summary History</button>
          <button onClick={() => setMenuOpen((v) => !v)} style={{ ...iconBtn, marginLeft: 8 }}>
            {user.photoURL ? (
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
            <div style={{ width: 60, height: 60, background: "#888", borderRadius: "50%", margin: "0 auto 10px", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
              {user.photoURL ? (
                <img src={user.photoURL} alt="User" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <span style={{ fontSize: 24 }}>👤</span>
              )}
            </div>
            <div style={{ fontSize: 13, opacity: 0.9 }}>{user.email || "Guest"}</div>
          </div>

          <nav style={{ display: "grid", gap: 8 }}>
            <button onClick={() => setActiveTab("overview")} style={activeTab === "overview" ? sideBtnActive : sideBtn}>Overview</button>
            <button onClick={() => setActiveTab("account")} style={activeTab === "account" ? sideBtnActive : sideBtn}>Account</button>
            <button onClick={() => setActiveTab("security")} style={activeTab === "security" ? sideBtnActive : sideBtn}>Security</button>
            <button onClick={() => router.push("/")} style={sideBtn}>Back to Home</button>
          </nav>
        </aside>

        {/* Content */}
        <main style={{ flex: 1, padding: 20, display: "grid", gap: 20, alignContent: "start", overflowY: "auto" }}>
          {/* Overview Tab */}
          {activeTab === "overview" && (
            <>
              {/* Profile card */}
              <section style={card}>
                <div style={{ fontWeight: 700, marginBottom: 16, fontSize: 18 }}>Profile Information</div>
                <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
                  <div style={{ width: 72, height: 72, borderRadius: "50%", background: "#eee", border: "1px solid #ddd", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, overflow: "hidden" }}>
                    {photoURL ? <img src={photoURL} alt="User" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "👤"}
                  </div>
                  <div style={{ flex: 1, minWidth: 220 }}>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>{displayName || user.email || "Your name"}</div>
                    <div style={{ color: "#666", marginTop: 4 }}>{user.email || "No email"}</div>
                    <div style={{ color: user?.emailVerified ? "#4CAF50" : "#d9534f", fontSize: 12, marginTop: 6 }}>
                      {user?.emailVerified ? "✓ Email verified" : "✗ Email not verified"}
                    </div>
                  </div>
                </div>
                {status && <div style={{ marginTop: 12, fontSize: 13, color: status.includes("✓") ? "#4CAF50" : "#d9534f" }}>{status}</div>}
              </section>

              {/* Statistics */}
              <section style={card}>
                <div style={{ fontWeight: 700, marginBottom: 12 }}>Statistics</div>
                {loadingStats ? (
                  <div style={{ color: "#666" }}>Loading...</div>
                ) : (
                  <div style={row}>
                    <span style={label}>Total Summaries</span>
                    <span style={{ fontWeight: 600 }}>{summaryCount}</span>
                  </div>
                )}
                <div style={row}>
                  <span style={label}>Account Created</span>
                  <span>{formatDate(user.metadata?.creationTime)}</span>
                </div>
                <div style={row}>
                  <span style={label}>Last Sign In</span>
                  <span>{formatDate(user.metadata?.lastSignInTime)}</span>
                </div>
              </section>
            </>
          )}

          {/* Account Tab */}
          {activeTab === "account" && (
            <>
              <section style={card}>
                <div style={{ fontWeight: 700, marginBottom: 16, fontSize: 18 }}>Edit Profile</div>
                <div style={fieldRow}>
                  <label style={label}>Display Name</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Enter your name"
                    style={input}
                    disabled={busy}
                  />
                </div>
                <div style={fieldRow}>
                  <label style={label}>Photo URL</label>
                  <input
                    type="url"
                    value={photoURL}
                    onChange={(e) => setPhotoURL(e.target.value)}
                    placeholder="https://example.com/photo.jpg"
                    style={input}
                    disabled={busy}
                  />
                </div>
                <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                  <button style={primaryBtn} onClick={handleSaveProfile} disabled={busy}>
                    {busy ? "Saving..." : "Save Changes"}
                  </button>
                </div>
                {status && <div style={{ marginTop: 12, fontSize: 13, color: status.includes("✓") ? "#4CAF50" : "#d9534f" }}>{status}</div>}
              </section>

              <section style={card}>
                <div style={{ fontWeight: 700, marginBottom: 16, fontSize: 18 }}>Email Verification</div>
                <div style={row}>
                  <span style={label}>Email Status</span>
                  <span style={{ color: user?.emailVerified ? "#4CAF50" : "#d9534f" }}>
                    {user?.emailVerified ? "✓ Verified" : "✗ Not Verified"}
                  </span>
                </div>
                {!user?.emailVerified && (
                  <div style={{ marginTop: 12 }}>
                    <button style={primaryBtn} onClick={handleSendVerification} disabled={busy}>
                      {busy ? "Sending..." : "Send Verification Email"}
                    </button>
                  </div>
                )}
                {status && status.includes("verification") && (
                  <div style={{ marginTop: 12, fontSize: 13, color: status.includes("✓") ? "#4CAF50" : "#d9534f" }}>{status}</div>
                )}
              </section>

              <section style={card}>
                <div style={{ fontWeight: 700, marginBottom: 16, fontSize: 18 }}>Change Email</div>
                <div style={fieldRow}>
                  <label style={label}>New Email</label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="new@example.com"
                    style={input}
                    disabled={busy}
                  />
                </div>
                <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                  <button style={primaryBtn} onClick={handleChangeEmail} disabled={busy || newEmail === user.email}>
                    {busy ? "Updating..." : "Update Email"}
                  </button>
                </div>
                {emailStatus && <div style={{ marginTop: 12, fontSize: 13, color: emailStatus.includes("✓") ? "#4CAF50" : "#d9534f" }}>{emailStatus}</div>}
              </section>
            </>
          )}

          {/* Security Tab */}
          {activeTab === "security" && (
            <>
              <section style={card}>
                <div style={{ fontWeight: 700, marginBottom: 16, fontSize: 18 }}>Change Password</div>
                <div style={fieldRow}>
                  <label style={label}>Current Password</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    style={input}
                    disabled={busy}
                  />
                </div>
                <div style={fieldRow}>
                  <label style={label}>New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password (min 6 characters)"
                    style={input}
                    disabled={busy}
                  />
                </div>
                <div style={fieldRow}>
                  <label style={label}>Confirm Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    style={input}
                    disabled={busy}
                  />
                </div>
                <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                  <button style={primaryBtn} onClick={handleChangePassword} disabled={busy}>
                    {busy ? "Updating..." : "Update Password"}
                  </button>
                </div>
                {passwordStatus && <div style={{ marginTop: 12, fontSize: 13, color: passwordStatus.includes("✓") ? "#4CAF50" : "#d9534f" }}>{passwordStatus}</div>}
              </section>

              <section style={card}>
                <div style={{ fontWeight: 700, marginBottom: 12 }}>Account Details</div>
                <div style={row}><span style={label}>User ID</span><span style={{ fontFamily: "monospace", fontSize: 12 }}>{user.uid}</span></div>
                <div style={row}><span style={label}>Provider</span><span>{user.providerData?.[0]?.providerId || "Email/Password"}</span></div>
              </section>

              {/* Danger Zone */}
              <section style={card}>
                <div style={{ fontWeight: 700, marginBottom: 12, color: "#d9534f" }}>Danger Zone</div>
                <div style={{ color: "#666", fontSize: 13, marginBottom: 16 }}>
                  Deleting your account will permanently remove all your data, including saved summaries. This action cannot be undone.
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button style={dangerBtn} onClick={handleDeleteAccount} disabled={busy}>
                    {busy ? "Deleting..." : "Delete Account"}
                  </button>
                  <button style={secondaryBtn} onClick={handleLogout}>Sign Out</button>
                </div>
                {status && status.includes("Delete") && (
                  <div style={{ marginTop: 12, fontSize: 13, color: "#d9534f" }}>{status}</div>
                )}
              </section>
            </>
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
const row = { display: "flex", justifyContent: "space-between", padding: "10px 0", borderTop: "1px solid #f1f1f1" };
const label = { color: "#666", minWidth: 160, display: "inline-block" };
const fieldRow = { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderTop: "1px solid #f1f1f1", gap: 16 };
const input = { padding: "8px 12px", border: "1px solid #ddd", borderRadius: 6, background: "#fff", flex: 1, minWidth: 200, fontSize: 14 };

const primaryBtn = { padding: "10px 20px", background: "#666", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 14 };
const secondaryBtn = { padding: "10px 20px", background: "#eee", color: "#333", border: "1px solid #ddd", borderRadius: 6, cursor: "pointer", fontSize: 14 };
const dangerBtn = { padding: "10px 20px", background: "#d9534f", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 14 };
