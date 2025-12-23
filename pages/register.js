import React, { useState } from "react";
import { useRouter } from 'next/router';
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth } from "../lib/firebase-client";

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRegisterClick = () => {
    router.push("/register");
  };
  const handleLoginClick = () => {
    router.push("/login");
  };

  // Handle form submit and register with Firebase
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      // Set display name
      await updateProfile(userCredential.user, { displayName: name });
      setLoading(false);
      router.push("/login");
    } catch (err) {
      setError(err.message);
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
      {/* Header */}
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
          <button
            style={{ marginRight: "10px", padding: "8px 16px", background: "transparent", border: "none", cursor: "pointer" }}
            onClick={handleRegisterClick}>Register
          </button>
          <button
            style={{ marginRight: "10px", padding: "8px 16px", background: "transparent", border: "none", cursor: "pointer" }}
            onClick={handleLoginClick}>  Login
          </button>
          <button style={{ padding: "8px 12px", background: "transparent", border: "none", cursor: "pointer" }}>👤</button>
        </div>
      </header>

      {/* Register Card */}
      <div style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "calc(100vh - 60px)"
      }}>
        <form
          onSubmit={handleSubmit}
          style={{
            background: "white",
            width: "420px",
            padding: "48px 32px",
            borderRadius: "4px",
            boxShadow: "0 0 0 rgba(0,0,0,0.05)"
          }}>
          <h1 style={{ textAlign: "center", fontWeight: "bold", fontSize: "2.5rem", marginBottom: "10px" }}>Register Account</h1>
          <div style={{ textAlign: "center", marginBottom: "28px", fontSize: "18px" }}>
            Already registered? <a href="/login" style={{ color: "#1a0dab", textDecoration: "none", fontWeight: "500" }}>Login</a>
          </div>
          {error && (
            <div style={{ color: "red", marginBottom: "18px", textAlign: "center" }}>
              {error}
            </div>
          )}
          <div style={{ marginBottom: "18px" }}>
            <label style={{ fontWeight: "bold", fontSize: "16px" }}>Your Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Enter your username"
              required
              style={{
                width: "100%",
                padding: "10px",
                marginTop: "6px",
                border: "1px solid #333",
                borderRadius: "4px",
                fontSize: "16px",
                boxSizing: "border-box"
              }}
            />
          </div>
          <div style={{ marginBottom: "18px" }}>
            <label style={{ fontWeight: "bold", fontSize: "16px" }}>Your Email</label>
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
                fontSize: "16px",
                boxSizing: "border-box"
              }}
            />
          </div>
          <div style={{ marginBottom: "24px" }}>
            <label style={{ fontWeight: "bold", fontSize: "16px" }}>Your Password</label>
            <div style={{ position: "relative" }}>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                style={{
                  width: "100%",
                  padding: "10px 40px 10px 10px",
                  marginTop: "6px",
                  border: "1px solid #333",
                  borderRadius: "4px",
                  fontSize: "16px",
                  boxSizing: "border-box"
                }}
              />
              <span
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: "absolute",
                  right: "10px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  cursor: "pointer",
                  fontSize: "18px",
                  color: "#666"
                }}
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "🙈" : "👁️"}
              </span>
            </div>
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
              fontSize: "18px",
              fontWeight: "bold",
              cursor: loading ? "not-allowed" : "pointer"
            }}
          >
            {loading ? "Registering..." : "Register"}
          </button>
        </form>
      </div>
    </div>
  );
}