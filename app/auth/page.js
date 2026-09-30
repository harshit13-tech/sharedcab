"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function AuthPage() {
  const supabase = createClient();
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setMessage("");
    setBusy(true);

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setMessage(error.message);
      else setMessage("Account created. Check your email if confirmation is enabled, then sign in.");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMessage(error.message);
      else window.location.href = "/";
    }
    setBusy(false);
  }

  return (
    <main className="authPage">
      <div className="authCard">
        <a href="/" className="back">← Back to SharedRide</a>
        <p className="eyebrow">SHAREDRIDE ACCOUNT</p>
        <h1>{mode === "login" ? "Welcome back" : "Create your account"}</h1>
        <p className="sub">Use your email to create and join shared rides.</p>
        <form className="form" onSubmit={submit}>
          <label>Email<input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" /></label>
          <label>Password<input type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 6 characters" /></label>
          <button className="primary" disabled={busy}>{busy ? "Please wait…" : mode === "login" ? "Sign in →" : "Create account →"}</button>
        </form>
        {message && <div className="success">{message}</div>}
        <button className="textButton" onClick={() => { setMode(mode === "login" ? "signup" : "login"); setMessage(""); }}>
          {mode === "login" ? "New here? Create an account" : "Already have an account? Sign in"}
        </button>
      </div>
    </main>
  );
}
