import React, { useState } from "react";
import { useRouter } from "next/router";
import { initializeApp, getApps } from "firebase/app";
import { getAuth, sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../lib/firebase-client";


export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const router = useRouter();

  const handleRegisterClick = () => router.push("/register");
  const handleLoginClick = () => router.push("/login");

  const mapFirebaseError = (code) => {
    switch (code) {
      case "auth/invalid-email":
        return "Invalid email address.";
      case "auth/user-not-found":
        return "No account found with this email.";
      case "auth/too-many-requests":
        return "Too many attempts. Try again later.";
      default:
        return "Failed to send reset email.";
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setSuccess("Verification link sent. Check your email.");
    } catch (err) {
      setError(err?.code ? mapFirebaseError(err.code) : err.message || "Error sending link.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      fontFamily: "Arial, sans-serif",
      background: "#d3d3d3",
      minHeight: "100vh",
      margin: 0,
      padding: 0
    }}>
      <header style={{ backgroundColor: 'white', padding: '10px 20px', borderBottom: '1px solid #ddd', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', fontSize: '18px', fontWeight: 'bold' }}>
          <button
            onClick={() => router.push('/')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: 'transparent',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              fontSize: '18px',
              fontWeight: 'bold'
            }} aria-label="Go to home">
            <span style={{ marginRight: 5 }}>♦</span>
            <span>NeoSummary</span>
          </button>
        </div>
        <div>
          <button onClick={handleRegisterClick} style={{ marginRight: "10px", padding: "8px 16px", background: "transparent", border: "none", cursor: "pointer" }}>Register</button>
          <button onClick={handleLoginClick} style={{ marginRight: "10px", padding: "8px 16px", background: "transparent", border: "none", cursor: "pointer" }}>Login</button>
          <button style={{ padding: "8px 12px", background: "transparent", border: "none", cursor: "pointer" }}>👤</button>
        </div>
      </header>

      <div style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "calc(100vh - 60px)"
      }}>
        <form onSubmit={handleSubmit} style={{
          background: "white",
          width: "420px",
          padding: "48px 32px",
          borderRadius: "4px",
          boxShadow: "0 0 0 rgba(0,0,0,0.05)"
        }}>
          <h1 style={{ textAlign: "center", fontWeight: "bold", fontSize: "2.2rem", marginBottom: "10px" }}>Forgot Password?</h1>
          <div style={{ textAlign: "center", marginBottom: "20px", fontSize: "16px" }}>
            You can <strong>reset</strong> your password with email here!
          </div>

          {error && <div style={{ color: "red", textAlign: "center", marginBottom: "12px" }}>{error}</div>}
          {success && <div style={{ color: "green", textAlign: "center", marginBottom: "12px" }}>{success}</div>}

          <div style={{ marginBottom: "18px" }}>
            <label style={{ fontWeight: "bold", fontSize: "14px" }}>Your Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Enter your email address"
              required
              style={{
                width: "100%",
                padding: "10px",
                marginTop: "6px",
                border: "1px solid #333",
                borderRadius: "4px",
                fontSize: "14px",
                boxSizing: "border-box"
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "12px",
              background: "#444",
              color: "white",
              border: "none",
              borderRadius: "20px",
              fontSize: "16px",
              fontWeight: "bold",
              cursor: loading ? "not-allowed" : "pointer"
            }}
          >
            {loading ? "Sending..." : "Send Verification Link"}
          </button>
        </form>
      </div>
    </div>
  );
}