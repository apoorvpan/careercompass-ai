"use client";

import { useState } from "react";

type SavePayload = {
  targetRole: string;
  profile: string;
  jobDescription: string;
  assessment: unknown;
};

export default function SaveAssessment({
  payload,
}: {
  payload: SavePayload;
}) {
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function save() {
    if (saving || savedId) return;

    setSaving(true);
    setError("");

    try {
      const response = await fetch("/api/sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (
        !response.headers
          .get("content-type")
          ?.includes("application/json")
      ) {
        throw new Error("The server returned an unexpected response.");
      }

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          typeof result?.error === "string"
            ? result.error
            : "Unable to save the assessment.",
        );
      }

      if (typeof result.id !== "string") {
        throw new Error("No saved assessment ID was returned.");
      }

      setSavedId(result.id);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to save the assessment.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-700 p-5">
      <button
        type="button"
        onClick={save}
        disabled={saving || Boolean(savedId)}
        className="rounded-xl bg-teal-400 px-5 py-3 font-semibold text-slate-950 disabled:opacity-60"
      >
        {savedId
          ? "Assessment saved"
          : saving
            ? "Saving..."
            : "Save assessment"}
      </button>

      <p className="mt-3 text-xs leading-5 text-slate-400">
        Saves your reviewed profile, job description, and assessment to your
        account. The original résumé file is not saved here.
      </p>

      {savedId && (
        <p role="status" className="mt-3 text-sm text-teal-300">
          Saved to your account.
        </p>
      )}

      {error && (
        <p role="alert" className="mt-3 text-sm text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}
