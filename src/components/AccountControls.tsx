"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function AccountControls() {
  const [email, setEmail] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const supabase = createClient();
    let active = true;

    async function loadUser() {
      try {
        const { data, error } = await supabase.auth.getUser();

        if (!active) return;

        if (error) {
          setEmail(null);
        } else {
          setEmail(data.user?.email ?? null);
        }
      } catch {
        if (active) setError("Unable to check your account.");
      } finally {
        if (active) setChecking(false);
      }
    }

    void loadUser();

    return () => {
      active = false;
    };
  }, []);

  async function signOut() {
    setBusy(true);
    setError("");

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signOut();

      if (error) throw error;

      // Reload to clear the profile and results held in React state.
      window.location.replace("/login");
    } catch {
      setError("Unable to sign out. Please try again.");
      setBusy(false);
    }
  }

  return (
    <div className="mb-8 rounded-xl border border-slate-800 p-4">
      {checking ? (
        <p className="text-sm text-slate-400">Checking account...</p>
      ) : email ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="break-all text-sm text-slate-300">
            Signed in as {email}
          </p>
          <Link href="/sessions" className="text-sm text-teal-300 underline">
            Saved assessments
          </Link>
          <button
            type="button"
            onClick={signOut}
            disabled={busy}
            className="text-sm text-teal-300 underline disabled:opacity-50"
          >
            {busy ? "Signing out..." : "Sign out"}
          </button>
        </div>
      ) : (
        <Link href="/login" className="text-sm text-teal-300 underline">
          Sign in or create an account
        </Link>
      )}

      {error && (
        <p role="alert" className="mt-3 text-sm text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}
