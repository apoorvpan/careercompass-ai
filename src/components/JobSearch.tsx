"use client";

import { useState } from "react";
import { z } from "zod";

const WebUrlSchema = z
  .string()
  .url()
  .refine((value) => {
    const protocol = new URL(value).protocol;
    return protocol === "https:" || protocol === "http:";
  });

const JobSchema = z.object({
  id: z.string(),
  title: z.string(),
  company: z.string(),
  location: z.string(),
  locationEligibility: z.string(),
  seniority: z.array(z.string()),
  description: z.string(),
  url: WebUrlSchema,
  sourceUrl: WebUrlSchema,
});

const SearchResponseSchema = z.object({
  jobs: z.array(JobSchema),
  notice: z.string(),
});

type Job = z.infer<typeof JobSchema>;

export default function JobSearch({
  targetRole,
  profile,
  disabled,
  onSelect,
}: {
  targetRole: string;
  profile: string;
  disabled: boolean;
  onSelect: (description: string) => void;
}) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [searched, setSearched] = useState(false);
  const [searchedRole, setSearchedRole] = useState("");
  const [selectionMessage, setSelectionMessage] = useState("");

  async function findJobs() {
    if (loading || disabled) return;

    const keywords = targetRole.trim();

    setError("");
    setSelectionMessage("");

    if (keywords.length < 2) {
      setError("Enter a target role in the form above first.");
      return;
    }

    if (profile.trim().length < 80) {
      setError(
        "Upload and review your résumé, or enter at least 80 characters describing your experience.",
      );
      return;
    }

    setLoading(true);
    setSearched(false);
    setJobs([]);
    setNotice("");

    try {
      const response = await fetch("/api/jobs/discover", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          targetRole: keywords,
          profile,
        }),
      });

      if (!response.headers.get("content-type")?.includes("application/json")) {
        throw new Error("The server returned an unexpected response.");
      }

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          typeof result?.error === "string"
            ? result.error
            : "Unable to search for jobs.",
        );
      }

      const validated = SearchResponseSchema.safeParse(result);

      if (!validated.success) {
        throw new Error("The job results have an unexpected format.");
      }

      setJobs(validated.data.jobs);
      setNotice(validated.data.notice);
      setSearchedRole(keywords);
      setSearched(true);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Job search failed. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  function selectJob(job: Job) {
    setError("");
    setSelectionMessage("");

    const description = [
      `Job title: ${job.title}`,
      `Company: ${job.company}`,
      `Location restrictions: ${job.location}`,
      `Seniority: ${job.seniority.join(", ") || "Not provided"}`,
      "",
      job.description,
    ].join("\n");

    if (job.description.trim().length < 80) {
      setError(
        "This listing has too little description text. Open the source and enter the full requirements manually.",
      );
      return;
    }

    if (description.length > 16000) {
      setError(
        "This description exceeds the current 16,000-character limit. Open the source and paste the relevant responsibilities and requirements into the form.",
      );
      return;
    }

    onSelect(description);

    setSelectionMessage(
      `Loaded ${job.title} at ${job.company}. Review the job description above, then click Assess job match.`,
    );
  }

  return (
    <section
      aria-labelledby="job-search-heading"
      className="rounded-2xl border border-slate-800 bg-slate-900 p-6"
    >
      <h2 id="job-search-heading" className="text-xl font-semibold">
        Find remote jobs
      </h2>

      <p className="mt-3 text-sm leading-6 text-slate-400">
        Find remote opportunities based on your experience and target role.
        Review each listing and follow its application link to apply.
      </p>

      <button
        type="button"
        onClick={findJobs}
        disabled={disabled || loading}
        className="mt-5 rounded-xl bg-teal-400 px-5 py-3 font-semibold text-slate-950 hover:bg-teal-300 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Searching jobs..." : "Search remote jobs"}
      </button>

      <p role="status" className="mt-3 text-sm text-teal-300">
        {loading
          ? "Retrieving job listings..."
          : searched
            ? `${jobs.length} results for “${searchedRole}”.`
            : ""}
      </p>

      {error && (
        <p
          role="alert"
          className="mt-4 rounded-xl bg-red-950 p-4 text-sm text-red-200"
        >
          {error}
        </p>
      )}

      <p role="status" className="mt-3 text-sm text-teal-200">
        {selectionMessage}
      </p>

      {searched && jobs.length === 0 && (
        <p className="mt-4 text-sm text-slate-400">
          No listings were returned. Try a broader target role.
        </p>
      )}

      <div className="mt-5 space-y-4">
        {jobs.map((job) => (
          <article
            key={job.id}
            className="rounded-xl border border-slate-700 bg-slate-950 p-5"
          >
            <h3 className="text-lg font-semibold">{job.title}</h3>

            <p className="mt-1 text-sm text-teal-300">{job.company}</p>

            <p className="mt-3 text-sm text-slate-400">
              Location: {job.location}
            </p>

            <p className="mt-1 text-sm text-slate-400">
              {job.locationEligibility}
            </p>

            {job.seniority.length > 0 && (
              <p className="mt-1 text-sm text-slate-400">
                Level: {job.seniority.join(", ")}
              </p>
            )}

            <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-300">
              {job.description.slice(0, 450)}
              {job.description.length > 450 ? "…" : ""}
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-4">
              <button
                type="button"
                disabled={disabled || loading}
                onClick={() => selectJob(job)}
                className="rounded-lg border border-teal-700 px-4 py-2 text-sm font-medium text-teal-200 hover:bg-teal-950 disabled:opacity-50"
              >
                Use this job description
              </button>

              <a
                href={job.url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg bg-teal-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-teal-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-300"
              >
                Apply for this job
                <span className="sr-only">: {job.title} at {job.company} (opens in a new tab)</span>
              </a>

              <a
                href={job.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-teal-300 underline underline-offset-4"
              >
                View job details
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            </div>

            <p className="mt-4 text-xs text-slate-500">Source: Himalayas</p>
          </article>
        ))}
      </div>

      {notice && (
        <p className="mt-5 text-xs leading-6 text-slate-400">{notice}</p>
      )}
    </section>
  );
}
