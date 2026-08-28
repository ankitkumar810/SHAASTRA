"use client";

import { useState, FormEvent, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

type TabMode = "signin" | "signup";

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo");

  const [mode, setMode] = useState<TabMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [requestedRole, setRequestedRole] = useState("CITIZEN");
  const [districtName, setDistrictName] = useState("Ernakulam");

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const supabase = createClient();

  async function handleSignIn(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setErrorMessage(error.message);
        setLoading(false);
        return;
      }

      if (data.user) {
        setSuccessMessage("Signed in successfully. Redirecting...");
        const role = data.user.user_metadata?.requested_role || "CITIZEN";
        const rolePath =
          role === "SYSTEM_ADMIN"
            ? "/dashboard/admin"
            : role === "DISTRICT_AUTHORITY"
            ? "/dashboard/authority"
            : role === "SHELTER_ADMIN"
            ? "/dashboard/shelter"
            : "/dashboard/citizen";

        const target = redirectTo || rolePath;
        router.push(target);
        router.refresh();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An error occurred while signing in.";
      setErrorMessage(msg);
      setLoading(false);
    }
  }

  async function handleSignUp(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            phone: phone,
            requested_role: "CITIZEN",
            district_name: districtName,
          },
        },
      });

      if (error) {
        setErrorMessage(error.message);
        setLoading(false);
        return;
      }

      if (data.user) {
        if (data.session) {
          setSuccessMessage("Account created successfully. Redirecting to citizen dashboard...");
          router.push("/dashboard/citizen");
          router.refresh();
        } else {
          setSuccessMessage("Account registered! Please check your email for a verification link.");
          setLoading(false);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An error occurred during registration.";
      setErrorMessage(msg);
      setLoading(false);
    }
  }

  return (
    <div style={{ background: "white", border: "1px solid #dce7e6", borderRadius: "14px", padding: "28px", boxShadow: "0 4px 20px rgba(0,0,0,0.04)" }}>
      <div style={{ display: "flex", borderBottom: "1px solid #dce7e6", marginBottom: "22px" }}>
        <button
          type="button"
          onClick={() => { setMode("signin"); setErrorMessage(""); setSuccessMessage(""); }}
          style={{
            flex: 1,
            padding: "12px",
            border: 0,
            background: "transparent",
            font: "600 15px 'DM Sans', sans-serif",
            color: mode === "signin" ? "#087d7a" : "#71858a",
            borderBottom: mode === "signin" ? "3px solid #087d7a" : "3px solid transparent",
            cursor: "pointer",
          }}
        >
          Sign In
        </button>
        <button
          type="button"
          onClick={() => { setMode("signup"); setErrorMessage(""); setSuccessMessage(""); }}
          style={{
            flex: 1,
            padding: "12px",
            border: 0,
            background: "transparent",
            font: "600 15px 'DM Sans', sans-serif",
            color: mode === "signup" ? "#087d7a" : "#71858a",
            borderBottom: mode === "signup" ? "3px solid #087d7a" : "3px solid transparent",
            cursor: "pointer",
          }}
        >
          Register
        </button>
      </div>

      {errorMessage && (
        <div style={{ background: "#fee8e4", border: "1px solid #f8b4ab", color: "#b64b3d", padding: "12px 14px", borderRadius: "8px", fontSize: "13px", marginBottom: "18px" }}>
          ⚠️ {errorMessage}
        </div>
      )}

      {successMessage && (
        <div style={{ background: "#e2f6ed", border: "1px solid #9ae2c5", color: "#087b68", padding: "12px 14px", borderRadius: "8px", fontSize: "13px", marginBottom: "18px" }}>
          ✓ {successMessage}
        </div>
      )}

      {mode === "signin" ? (
        <form onSubmit={handleSignIn} style={{ display: "grid", gap: "16px" }}>
          <label style={{ display: "grid", gap: "6px", fontSize: "13px", fontWeight: 600 }}>
            Email address
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              required
              style={{ padding: "11px 13px", borderRadius: "8px", border: "1px solid #dce7e6", fontSize: "14px" }}
            />
          </label>

          <label style={{ display: "grid", gap: "6px", fontSize: "13px", fontWeight: 600 }}>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={{ padding: "11px 13px", borderRadius: "8px", border: "1px solid #dce7e6", fontSize: "14px" }}
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: "8px",
              background: "#087d7a",
              color: "white",
              border: 0,
              borderRadius: "8px",
              padding: "13px",
              font: "600 15px 'DM Sans', sans-serif",
              cursor: loading ? "wait" : "pointer",
            }}
          >
            {loading ? "Signing in..." : "Sign In to SHAASTRA →"}
          </button>
        </form>
      ) : (
        <form onSubmit={handleSignUp} style={{ display: "grid", gap: "14px" }}>
          <label style={{ display: "grid", gap: "6px", fontSize: "13px", fontWeight: 600 }}>
            Full Name
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Dr. Rajesh Sharma"
              required
              style={{ padding: "11px 13px", borderRadius: "8px", border: "1px solid #dce7e6", fontSize: "14px" }}
            />
          </label>

          <label style={{ display: "grid", gap: "6px", fontSize: "13px", fontWeight: 600 }}>
            Email address
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="official@domain.gov.in"
              required
              style={{ padding: "11px 13px", borderRadius: "8px", border: "1px solid #dce7e6", fontSize: "14px" }}
            />
          </label>

          <label style={{ display: "grid", gap: "6px", fontSize: "13px", fontWeight: 600 }}>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              minLength={6}
              required
              style={{ padding: "11px 13px", borderRadius: "8px", border: "1px solid #dce7e6", fontSize: "14px" }}
            />
          </label>

          <label style={{ display: "grid", gap: "6px", fontSize: "13px", fontWeight: 600 }}>
            District
            <select
              value={districtName}
              onChange={(e) => setDistrictName(e.target.value)}
              style={{ padding: "11px", borderRadius: "8px", border: "1px solid #dce7e6", fontSize: "13px" }}
            >
              <option value="Ernakulam">Ernakulam</option>
              <option value="Kozhikode">Kozhikode</option>
              <option value="Thiruvananthapuram">Thiruvananthapuram</option>
              <option value="Wayanad">Wayanad</option>
            </select>
          </label>

          <label style={{ display: "grid", gap: "6px", fontSize: "13px", fontWeight: 600 }}>
            Mobile Number (Optional)
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="10-digit mobile number"
              style={{ padding: "11px 13px", borderRadius: "8px", border: "1px solid #dce7e6", fontSize: "14px" }}
            />
          </label>

          <div style={{ background: "#e9f7f4", padding: "10px 12px", borderRadius: "8px", fontSize: "12px", color: "#507376", lineHeight: 1.4 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#087d7a" strokeWidth="2" style={{ verticalAlign: "middle", marginRight: "6px" }}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>
            <strong>Registration Policy:</strong> Public registration creates a secure Citizen Safety account. Privileged responder & authority credentials are explicitly provisioned by System Administrators.
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: "6px",
              background: "#087d7a",
              color: "white",
              border: 0,
              borderRadius: "8px",
              padding: "13px",
              font: "600 15px 'DM Sans', sans-serif",
              cursor: loading ? "wait" : "pointer",
            }}
          >
            {loading ? "Creating Account..." : "Create Account →"}
          </button>
        </form>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="app-shell" style={{ minHeight: "100vh", background: "#f7fbfa" }}>
      <main style={{ margin: 0, width: "100%", padding: "40px 20px", display: "grid", placeItems: "center" }}>
        <div style={{ maxWidth: "460px", width: "100%" }}>
          <div style={{ textAlign: "center", marginBottom: "28px" }}>
            <Link href="/" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "10px", color: "#17323b" }}>
              <span className="brand-mark" style={{ background: "#087d7a", color: "white", width: "38px", height: "38px", borderRadius: "10px", display: "grid", placeItems: "center", fontWeight: "bold", fontSize: "22px" }}>S</span>
              <span style={{ font: "700 26px Outfit", letterSpacing: "0.5px" }}>SHAASTRA</span>
            </Link>
            <p style={{ margin: "6px 0 0", color: "#71858a", fontSize: "14px" }}>
              Real-time disaster management & operational coordination
            </p>
          </div>

          <Suspense fallback={<div style={{ textAlign: "center", padding: "20px", color: "#71858a" }}>Loading form...</div>}>
            <LoginFormContent />
          </Suspense>

          <div style={{ textAlign: "center", marginTop: "20px", fontSize: "13px", color: "#71858a" }}>
            <Link href="/" style={{ color: "#087d7a", textDecoration: "none", fontWeight: 600 }}>
              ← Return to SHAASTRA Public Portal
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}