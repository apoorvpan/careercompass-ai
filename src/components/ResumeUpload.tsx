"use client";

import { useRef, useState } from "react";

type ResumeResult = {
  profile: string;
  warnings: string[];
};

export default function ResumeUpload({
  disabled,
  onExtracted,
  onBusyChange,
}: {
  disabled: boolean;
  onExtracted: (profile: string) => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [success, setSuccess] = useState(false);

  async function extractResume() {
    if (!file || loading || disabled) return;

    setError("");
    setWarnings([]);
    setSuccess(false);

    if (!/\.(pdf|docx)$/i.test(file.name)) {
      setError("Choose a PDF or DOCX file.");
      return;
    }

    if (file.size === 0 || file.size > 4 * 1024 * 1024) {
      setError("Choose a non-empty file no larger than 4 MB.");
      return;
    }

    setLoading(true);
    onBusyChange(true);

    try {
      const body = new FormData();
      body.append("resume", file);

      const response = await fetch("/api/resume", {
        method: "POST",
        body,
      });

      if (!response.headers.get("content-type")?.includes("application/json")) {
        throw new Error(
          "The server could not process the upload. Try a smaller file.",
        );
      }

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          typeof result?.error === "string"
            ? result.error
            : "Résumé extraction failed.",
        );
      }

      if (
        !result ||
        typeof result.profile !== "string" ||
        !Array.isArray(result.warnings) ||
        !result.warnings.every(
          (warning: unknown) => typeof warning === "string",
        )
      ) {
        throw new Error("The server returned an invalid profile.");
      }

      const extracted: ResumeResult = result;

      onExtracted(extracted.profile);
      setWarnings(extracted.warnings);
      setSuccess(true);
      setFile(null);

      if (inputRef.current) {
        inputRef.current.value = "";
      }
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to process the résumé.",
      );
    } finally {
      setLoading(false);
      onBusyChange(false);
    }
  }

  return (
    <section className="rounded-xl border border-slate-700 bg-slate-950 p-4">
      <h3 className="font-semibold">Fill your profile from a résumé</h3>

      <p id="resume-help" className="mt-2 text-sm leading-6 text-slate-400">
        Upload a PDF or DOCX up to 4 MB. Extraction replaces the profile text
        below. Review it before running an assessment.
      </p>

      <label htmlFor="resume-file" className="sr-only">
        Select your résumé
      </label>

      <input
        ref={inputRef}
        id="resume-file"
        type="file"
        accept=".pdf,.docx"
        disabled={disabled || loading}
        aria-describedby="resume-help resume-privacy"
        onChange={(event) => {
          setFile(event.target.files?.[0] ?? null);
          setError("");
          setWarnings([]);
          setSuccess(false);
        }}
        className="mt-4 block w-full text-sm text-slate-300 file:mr-4 file:rounded-lg file:border-0 file:bg-slate-800 file:px-4 file:py-2 file:text-slate-100"
      />

      <p id="resume-privacy" className="mt-3 text-xs leading-5 text-slate-400">
        Clicking Extract and fill sends your PDF or extracted DOCX text to
        OpenAI. Remove sensitive information before uploading. This application
        does not save the original file to a database.
      </p>

      <button
        type="button"
        onClick={extractResume}
        disabled={!file || disabled || loading}
        className="mt-4 rounded-xl bg-teal-400 px-4 py-2 font-semibold text-slate-950 hover:bg-teal-300 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "Extracting résumé..." : "Extract and fill profile"}
      </button>

      <p role="status" className="mt-3 text-sm text-teal-300">
        {loading
          ? "Reading your résumé..."
          : success
            ? "Profile filled. Review and correct the text below."
            : ""}
      </p>

      {error && (
        <p role="alert" className="mt-3 text-sm text-red-300">
          {error}
        </p>
      )}

      {warnings.length > 0 && (
        <div className="mt-4 rounded-lg bg-amber-950 p-3">
          <p className="text-sm font-medium text-amber-200">
            Review these extraction notes
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-100">
            {warnings.map((warning, index) => (
              <li key={index}>{warning}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
