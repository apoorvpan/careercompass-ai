"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (loading) return;

    setError("");
    setMessage("");
    if (mode === "signup" && password.length < 8) {
      setError("Use at least 8 characters for your password.");
      return;
    }
    setLoading(true);

    try {
      const supabase = createClient();

      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/login`,
          },
        });

        if (error) throw error;

        setPassword("");

        if (data.session) {
          router.replace("/");
          router.refresh();
          return;
        }

        setMessage(
          "If signup is available for this address, check your email to confirm it. Then return here and sign in.",
        );
        setMode("login");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) throw error;

        setPassword("");
        router.replace("/");
        router.refresh();
      }
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Authentication failed. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  function switchMode() {
    setMode((current) => (current === "login" ? "signup" : "login"));
    setPassword("");
    setError("");
    setMessage("");
  }

  const fieldClasses =
    "mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 " +
    "text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-400";

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-16 text-slate-100">
      <div className="mx-auto max-w-md">
        <Link href="/" className="text-sm text-teal-300 underline">
          Back to AppyJiyooss Career Conselor
        </Link>

        <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h1 className="text-2xl font-bold">
            {mode === "login" ? "Sign in" : "Create your account"}
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-400">
            Your account will keep your saved career assessments separate from
            other users’ records.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <div>
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>

              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                maxLength={254}
                disabled={loading}
                className={fieldClasses}
              />
            </div>

            <div>
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>

              <input
                id="password"
                type="password"
                autoComplete={
                  mode === "signup" ? "new-password" : "current-password"
                }
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={mode === "signup" ? 8 : undefined}
                required
                disabled={loading}
                className={fieldClasses}
              />

              {mode === "signup" && (
                <p className="mt-2 text-xs text-slate-400">
                  Use at least 8 characters.
                </p>
              )}
            </div>

            {error && (
              <p role="alert" className="text-sm text-red-300">
                {error}
              </p>
            )}

            <p role="status" className="text-sm text-teal-300">
              {message}
            </p>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-teal-400 px-5 py-3 font-semibold text-slate-950 hover:bg-teal-300 disabled:opacity-50"
            >
              {loading
                ? "Please wait..."
                : mode === "login"
                  ? "Sign in"
                  : "Create account"}
            </button>
          </form>

          <button
            type="button"
            onClick={switchMode}
            disabled={loading}
            className="mt-5 text-sm text-teal-300 underline"
          >
            {mode === "login"
              ? "New here? Create an account"
              : "Already registered? Sign in"}
          </button>
        </section>
      </div>
    </main>
  );
}
