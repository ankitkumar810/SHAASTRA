"use client";

import { useState, FormEvent, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

type TabMode = "signin" | "signup";

interface PendingVerificationInfo {
  role: string;
  email: string;
  district?: string;
}

function formatRoleName(role: string): string {
  switch (role) {
    case "SHELTER_ADMIN":
      return "Shelter Administrator";
    case "DISTRICT_AUTHORITY":
      return "District Authority";
    case "SYSTEM_ADMIN":
      return "System Administrator";
    case "CITIZEN":
    default:
      return "Citizen";
  }
}

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo");
  const queryPendingRole = searchParams.get("pendingRole");

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

  const [pendingVerification, setPendingVerification] = useState<PendingVerificationInfo | null>(
    queryPendingRole ? { role: queryPendingRole, email: "" } : null
  );

  const supabase = createClient();

  async function handleReturnToSignIn() {
    await supabase.auth.signOut();
    setPendingVerification(null);
    setMode("signin");
    setErrorMessage("");
    setSuccessMessage("");
    setEmail("");
    setPassword("");
  }

  async function handleSignIn(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");
    setPendingVerification(null);

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
        // Fetch DB profile to check actual verified role and verification status
        const res = await fetch("/api/auth/me");
        const meData = await res.json();
        const profile = meData?.data?.profile;

        const role = profile?.role || data.user.user_metadata?.requested_role || "CITIZEN";
        const verificationStatus = profile?.verificationStatus || (role === "CITIZEN" ? "VERIFIED" : "PENDING");

        if (verificationStatus === "PENDING" && role !== "CITIZEN") {
          setPendingVerification({
            role,
            email: data.user.email || email,
            district: profile?.district?.name || districtName,
          });
          setLoading(false);
          return;
        }

        setSuccessMessage("Signed in successfully. Redirecting...");
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
    setPendingVerification(null);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            phone: phone,
            requested_role: requestedRole,
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
        // Sync profile into DB
        if (data.session) {
          await fetch("/api/auth/me").catch(() => {});
        }

        if (requestedRole === "CITIZEN") {
          setSuccessMessage("Account created successfully. Redirecting to citizen portal...");
          router.push("/dashboard/citizen");
          router.refresh();
        } else {
          // Privileged role registration -> Route to Verification Pending screen
          setPendingVerification({
            role: requestedRole,
            email: data.user.email || email,
            district: districtName,
          });
          setLoading(false);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An error occurred during registration.";
      setErrorMessage(msg);
      setLoading(false);
    }
  }

  // Render Verification Pending Screen for privileged roles awaiting authorization
  if (pendingVerification) {
    return (
      <div style={{ background: "white", border: "1px solid #dce7e6", borderRadius: "14px", padding: "32px 28px", boxShadow: "0 4px 20px rgba(0,0,0,0.04)" }}>
        <div style={{ textAlign: "center", marginBottom: "22px" }}>
          <div
            style={{
              width: "56px",
              height: "56px",
              background: "#fff9eb",
              border: "2px solid #f2d28d",
              borderRadius: "50%",
              display: "grid",
              placeItems: "center",
              margin: "0 auto 16px",
              fontSize: "26px",
            }}
          >
            ⏳
          </div>
          <span
            style={{
              display: "inline-block",
              background: "#fff3d6",
              color: "#8a6d13",
              border: "1px solid #f2d28d",
              borderRadius: "20px",
              padding: "4px 14px",
              fontSize: "12px",
              fontWeight: 700,
              letterSpacing: "0.5px",
              marginBottom: "10px",
            }}
          >
            STATUS: VERIFICATION PENDING
          </span>
          <h2 style={{ font: "700 24px Outfit", margin: "4px 0 8px", color: "#17323b" }}>
            Verification Pending
          </h2>
          <p style={{ color: "#71858a", fontSize: "14px", margin: 0 }}>
            Elevated permissions require district authority approval before activation.
          </p>
        </div>

        <div style={{ background: "#f8fbfb", border: "1px solid #dce7e6", borderRadius: "10px", padding: "18px", marginBottom: "20px", display: "grid", gap: "12px", fontSize: "13px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #eef4f3", paddingBottom: "10px" }}>
            <span style={{ color: "#71858a" }}>Selected Role:</span>
            <strong style={{ color: "#087d7a", font: "700 14px Outfit" }}>
              {formatRoleName(pendingVerification.role)}
            </strong>
          </div>

          {pendingVerification.email && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #eef4f3", paddingBottom: "10px" }}>
              <span style={{ color: "#71858a" }}>Account Email:</span>
              <span style={{ fontWeight: 600, color: "#17323b" }}>{pendingVerification.email}</span>
            </div>
          )}

          {pendingVerification.district && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "#71858a" }}>District:</span>
              <span style={{ fontWeight: 600, color: "#17323b" }}>{pendingVerification.district}</span>
            </div>
          )}
        </div>

        <div style={{ background: "#fff9eb", border: "1px solid #f2d28d", borderRadius: "10px", padding: "14px 16px", marginBottom: "24px", color: "#8a6d13", fontSize: "13px", lineHeight: "1.5" }}>
          <div style={{ fontWeight: 700, marginBottom: "4px", color: "#6e5509", display: "flex", alignItems: "center", gap: "6px" }}>
            <span>⚠️</span> Security & Access Notice
          </div>
          <p style={{ margin: "0 0 6px" }}>
            • This account requires district verification before elevated permissions are activated.
          </p>
          <p style={{ margin: 0 }}>
            • You cannot access privileged functionality until your credentials have been reviewed and approved by a System Administrator.
          </p>
        </div>

        <button
          type="button"
          onClick={handleReturnToSignIn}
          style={{
            width: "100%",
            background: "#087d7a",
            color: "white",
            border: 0,
            borderRadius: "8px",
            padding: "13px",
            font: "600 15px 'DM Sans', sans-serif",
            cursor: "pointer",
          }}
        >
          ← Return to Sign In
        </button>
      </div>
    );
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
            Role
            <select
              value={requestedRole}
              onChange={(e) => setRequestedRole(e.target.value)}
              style={{ padding: "11px", borderRadius: "8px", border: "1px solid #dce7e6", fontSize: "13px" }}
            >
              <option value="CITIZEN">Citizen (Public / Family Safety)</option>
              <option value="SHELTER_ADMIN">Shelter Administrator</option>
              <option value="DISTRICT_AUTHORITY">District Authority</option>
              <option value="SYSTEM_ADMIN">System Administrator</option>
            </select>
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

          {requestedRole === "CITIZEN" ? (
            <div style={{ background: "#e9f7f4", padding: "10px 12px", borderRadius: "8px", fontSize: "12px", color: "#507376", lineHeight: 1.4 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#087d7a" strokeWidth="2" style={{ verticalAlign: "middle", marginRight: "6px" }}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>
              <strong>Registration Policy:</strong> Public registration creates a secure Citizen Safety account with immediate access to shelter discovery and safe registry.
            </div>
          ) : (
            <div style={{ background: "#fff9eb", border: "1px solid #f2d28d", padding: "10px 12px", borderRadius: "8px", fontSize: "12px", color: "#8a6d13", lineHeight: 1.4 }}>
              <span style={{ marginRight: "6px" }}>⚠️</span>
              <strong>District Verification Policy:</strong> Privileged roles ({formatRoleName(requestedRole)}) require district verification before elevated permissions are activated.
            </div>
          )}

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