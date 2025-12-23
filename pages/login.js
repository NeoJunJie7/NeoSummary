import React, { useState } from "react";
import { useRouter } from "next/router";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../lib/firebase-client";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const mapFirebaseError = (code) => {
    switch (code) {
      case "auth/invalid-email": return "Invalid email.";
      case "auth/user-disabled": return "User disabled.";
      case "auth/user-not-found": return "User not found.";
      case "auth/wrong-password": return "Wrong password.";
      default: return "Login failed.";
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/");
    } catch (err) {
      setError(err?.code ? mapFirebaseError(err.code) : err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ fontFamily: "Arial, sans-serif", background: "#d3d3d3", minHeight: "100vh" }}>
      <header style={{ background: "white", padding: "10px 20px", borderBottom: "1px solid #ddd", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button
          onClick={() => router.push("/")}
          style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, fontWeight: "bold", display: "flex", alignItems: "center", gap: 8 }}
        >
          <span>♦</span> <span>NeoSummary</span>
        </button>
        <div>
          <button onClick={() => router.push("/register")} style={{ padding: "8px 16px", background: "transparent", border: "none", cursor: "pointer" }}>Register</button>
          <button onClick={() => router.push("/login")} style={{ padding: "8px 16px", background: "transparent", border: "none", cursor: "pointer" }}>Login</button>
          <button style={{ padding: "8px 12px", background: "transparent", border: "none", cursor: "pointer" }}>👤</button>
        </div>
      </header>

      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "calc(100vh - 60px)" }}>
        <form onSubmit={handleSubmit} style={{ background: "white", width: 420, padding: "48px 32px", borderRadius: 4 }}>
          <h1 style={{ textAlign: "center", fontWeight: "bold", fontSize: "2.2rem", marginBottom: 10 }}>Login</h1>
          <div style={{ textAlign: "center", marginBottom: 24,fontSize: "18px" }}>No account? <a href="/register" style={{ color: "#1a0dab", textDecoration: "none",fontWeight: "500" }}>Register</a></div>
          {error && <div style={{ color: "red", textAlign: "center", marginBottom: 12 }}>{error}</div>}

            <label style={{ fontWeight: "bold" }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              style={{ width: "100%", padding: 10, margin: "6px 0 18px", border: "1px solid #333", borderRadius: 4 }}
            />

            <label style={{ fontWeight: "bold" }}>Password</label>
            <div style={{ position: "relative", marginBottom: 8 }}>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                style={{ width: "100%", padding: "10px 40px 10px 10px", marginTop: 6, border: "1px solid #333", borderRadius: 4 }}
              />
              <span
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", cursor: "pointer" }}
                title={showPassword ? "Hide" : "Show"}
              >
                {showPassword ? "🙈" : "👁️"}
              </span>
            </div>

          <div style={{ textAlign: "right", marginBottom: 24 }}>
            <button
              type="button"
              onClick={() => router.push("/forgotPassword")}
              style={{ background: "none", border: "none", color: "#1a0dab", cursor: "pointer" }}
            >
              Forgot Password?
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%", padding: 12, background: "#444", color: "white",
              border: "none", borderRadius: 20, fontSize: 18, fontWeight: "bold",
              cursor: loading ? "not-allowed" : "pointer"
            }}
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}