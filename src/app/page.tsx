"use client";

import { useState, type FormEvent } from "react";
import LearningResources from "@/components/LearningResources";
import ResumeUpload from "@/components/ResumeUpload";
import JobSearch from "@/components/JobSearch";
import AccountControls from "@/components/AccountControls";
import SaveAssessment from "@/components/SaveAssessment";
import Link from "next/link";

type AssessmentInput = {
  targetRole: string;
  location: string;
  profile: string;
  jobDescription: string;
};

type AssessmentResult = {
  summary: string;
  matchScore: number | null;
  scoringNote: string;
  requirements: {
    requirement: string;
    importance: "required" | "preferred";
    status: "matched" | "partial" | "not_evidenced";
    profileEvidence: string | null;
    explanation: string;
  }[];
  eligibilityChecks: {
    requirement: string;
    status: "met" | "not_met" | "unknown";
    explanation: string;
  }[];
  nextSteps: string[];
};

const statusLabels = {
  matched: "Matched",
  partial: "Partial evidence",
  not_evidenced: "Not evidenced",
  met: "Met",
  not_met: "Not met",
  unknown: "Needs confirmation",
};

const statusStyles = {
  matched: "border-teal-800 bg-teal-950 text-teal-200",
  partial: "border-amber-800 bg-amber-950 text-amber-200",
  not_evidenced: "border-slate-600 bg-slate-800 text-slate-300",
  met: "border-teal-800 bg-teal-950 text-teal-200",
  not_met: "border-rose-800 bg-rose-950 text-rose-200",
  unknown: "border-amber-800 bg-amber-950 text-amber-200",
};

const inputClasses =
  "mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 " +
  "text-slate-100 placeholder:text-slate-500 focus:outline-none " +
  "focus:ring-2 focus:ring-teal-400 disabled:cursor-wait disabled:opacity-60";

function StatusBadge({ status }: { status: keyof typeof statusLabels }) {
  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-medium ${statusStyles[status]}`}
    >
      {statusLabels[status]}
    </span>
  );
}

export default function Home() {
  const [form, setForm] = useState<AssessmentInput>({
    targetRole: "",
    location: "",
    profile: "",
    jobDescription: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [assessment, setAssessment] = useState<AssessmentResult | null>(null);
  const [resumeLoading, setResumeLoading] = useState(false);
  function updateField(field: keyof AssessmentInput, value: string) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));

    setAssessment(null);
    setError("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (loading || resumeLoading) return;

    setError("");
    setAssessment(null);

    if (
      !form.targetRole.trim() ||
      form.profile.trim().length < 80 ||
      form.jobDescription.trim().length < 80
    ) {
      setError(
        "Enter a target role and at least 80 characters each for your profile and job description.",
      );
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/assess", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      if (!response.headers.get("content-type")?.includes("application/json")) {
        throw new Error(
          "The server returned an unexpected response. Please try again.",
        );
      }

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          typeof result?.error === "string"
            ? result.error
            : "Unable to assess this profile.",
        );
      }

      setAssessment(result);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-12 text-slate-100">
      <div className="mx-auto max-w-6xl">
        <AccountControls />
        <header className="mb-10">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-teal-400">
            AppyJiyooss Career Conselor
          </p>

          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Find your fit.
            <br />
            Build your next skill.
          </h1>

          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-400">
            Compare your experience with a job, understand the gaps, and plan
            what to learn next.
          </p>
        </header>

        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="min-w-0 space-y-8">
            <section
              aria-labelledby="assessment-heading"
              className="rounded-2xl border border-slate-800 bg-slate-900 p-6"
            >
              <h2 id="assessment-heading" className="text-xl font-semibold">
                Start with a job you’re interested in
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-400">
                Paste your experience and a job description. Leave out contact
                details and sensitive information.
              </p>

              <form
                onSubmit={handleSubmit}
                aria-busy={loading}
                className="mt-6 space-y-6"
              >
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="targetRole" className="text-sm font-medium">
                      Target role
                    </label>

                    <input
                      id="targetRole"
                      value={form.targetRole}
                      disabled={loading || resumeLoading}
                      onChange={(event) =>
                        updateField("targetRole", event.target.value)
                      }
                      placeholder="Junior AI engineer"
                      maxLength={120}
                      required
                      className={inputClasses}
                    />
                  </div>

                  <div>
                    <label htmlFor="location" className="text-sm font-medium">
                      Preferred location
                      <span className="text-slate-400"> (optional)</span>
                    </label>

                    <input
                      id="location"
                      value={form.location}
                      disabled={loading || resumeLoading}
                      onChange={(event) =>
                        updateField("location", event.target.value)
                      }
                      placeholder="India, remote"
                      maxLength={160}
                      className={inputClasses}
                    />
                  </div>
                </div>

                <ResumeUpload
                  disabled={loading}
                  onBusyChange={setResumeLoading}
                  onExtracted={(profile) => updateField("profile", profile)}
                />

                <div>
                  <label htmlFor="profile" className="text-sm font-medium">
                    Your skills and experience
                  </label>

                  <textarea
                    id="profile"
                    rows={7}
                    value={form.profile}
                    disabled={loading || resumeLoading}
                    onChange={(event) =>
                      updateField("profile", event.target.value)
                    }
                    placeholder="Describe your skills, projects, education, and work experience. Include examples of what you have built."
                    minLength={80}
                    maxLength={12000}
                    required
                    aria-describedby="profile-help"
                    className={inputClasses}
                  />

                  <p id="profile-help" className="mt-2 text-xs text-slate-400">
                    {form.profile.length} / 12,000 characters. Minimum 80
                    characters.
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="jobDescription"
                    className="text-sm font-medium"
                  >
                    Job description
                  </label>

                  <textarea
                    id="jobDescription"
                    rows={7}
                    value={form.jobDescription}
                    disabled={loading || resumeLoading}
                    onChange={(event) =>
                      updateField("jobDescription", event.target.value)
                    }
                    placeholder="Paste the responsibilities, required qualifications, and preferred skills from the job listing."
                    minLength={80}
                    maxLength={16000}
                    required
                    aria-describedby="job-help"
                    className={inputClasses}
                  />

                  <p id="job-help" className="mt-2 text-xs text-slate-400">
                    {form.jobDescription.length} / 16,000 characters. Minimum 80
                    characters.
                  </p>
                </div>

                {error && (
                  <p
                    role="alert"
                    className="rounded-xl border border-red-900 bg-red-950 p-4 text-sm text-red-200"
                  >
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading || resumeLoading}
                  className="w-full rounded-xl bg-teal-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-teal-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-400 disabled:cursor-wait disabled:opacity-60"
                >
                  {loading ? "Assessing your profile..." : "Assess job match"}
                </button>

                <p className="text-xs leading-5 text-slate-400">
                  Compare your experience with the job requirements.
                  Leave out sensitive personal information.
                </p>
              </form>
            </section>
            <JobSearch
              disabled={loading || resumeLoading}
              onSelect={(description) =>
                updateField("jobDescription", description)
              }
            />
            <p role="status" className="sr-only">
              {loading
                ? "Assessment in progress."
                : assessment
                  ? "Assessment complete. Results appear below."
                  : ""}
            </p>

            {assessment && (
              <section aria-labelledby="results-heading" className="space-y-6">
                <div className="rounded-2xl border border-teal-800 bg-teal-950/30 p-6">
                  <p className="text-sm font-medium text-teal-300">
                    Assessment complete
                  </p>

                  <h2 id="results-heading" className="mt-2 text-2xl font-bold">
                    Your documented job fit
                  </h2>

                  <div className="mt-5 flex flex-wrap items-end gap-3">
                    <span className="text-5xl font-bold text-teal-300">
                      {assessment.matchScore === null
                        ? "N/A"
                        : `${assessment.matchScore}%`}
                    </span>

                    <span className="pb-1 text-sm text-slate-400">
                      Evidence-based match
                    </span>
                  </div>

                  <p className="mt-5 leading-7 text-slate-200">
                    {assessment.summary}
                  </p>

                  <p className="mt-4 text-xs leading-6 text-slate-400">
                    {assessment.scoringNote}
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold">
                    Requirements and evidence
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    “Not evidenced” means your profile does not demonstrate the
                    requirement. It does not prove that you lack the skill.
                  </p>

                  <div className="mt-4 space-y-4">
                    {assessment.requirements.length === 0 && (
                      <p className="text-sm text-slate-400">
                        No assessable skill requirements were identified.
                      </p>
                    )}

                    {assessment.requirements.map((item, index) => (
                      <article
                        key={`${item.requirement}-${index}`}
                        className="rounded-xl border border-slate-700 bg-slate-900 p-5"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <h4 className="font-semibold">{item.requirement}</h4>
                          <StatusBadge status={item.status} />
                        </div>

                        <p className="mt-2 text-xs font-medium uppercase tracking-wide text-slate-400">
                          {item.importance}
                        </p>

                        <p className="mt-3 text-sm leading-6 text-slate-300">
                          {item.explanation}
                        </p>

                        {item.profileEvidence && (
                          <blockquote className="mt-4 border-l-2 border-teal-500 pl-4 text-sm leading-6 text-slate-400">
                            <p className="mb-1 font-medium text-teal-300">
                              Evidence from your profile
                            </p>
                            <p>{item.profileEvidence}</p>
                          </blockquote>
                        )}
                      </article>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-700 p-5">
                  <h3 className="text-lg font-semibold">Eligibility checks</h3>

                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    These conditions are separate from the match score. A high
                    score does not override an unmet mandatory requirement.
                  </p>

                  {assessment.eligibilityChecks.length === 0 ? (
                    <p className="mt-4 text-sm text-slate-300">
                      No separate eligibility conditions were extracted. Check
                      the original listing before applying.
                    </p>
                  ) : (
                    <ul className="mt-4 space-y-5">
                      {assessment.eligibilityChecks.map((item, index) => (
                        <li key={`${item.requirement}-${index}`}>
                          <div className="flex flex-wrap items-center gap-3">
                            <h4 className="font-medium">{item.requirement}</h4>
                            <StatusBadge status={item.status} />
                          </div>

                          <p className="mt-2 text-sm leading-6 text-slate-400">
                            {item.explanation}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="rounded-xl border border-slate-700 p-5">
                  <h3 className="text-lg font-semibold">Your next steps</h3>

                  {assessment.nextSteps.length === 0 ? (
                    <p className="mt-3 text-sm text-slate-400">
                      No next steps were returned.
                    </p>
                  ) : (
                    <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-6 text-slate-300">
                      {assessment.nextSteps.map((step, index) => (
                        <li key={index}>{step}</li>
                      ))}
                    </ol>
                  )}
                </div>

                <SaveAssessment
                  payload={{
                    targetRole: form.targetRole,
                    profile: form.profile,
                    jobDescription: form.jobDescription,
                    assessment,
                  }}
                />

                <LearningResources
                  requirements={assessment.requirements}
                  targetRole={form.targetRole}
                />
              </section>
            )}
          </div>

          <aside className="space-y-5">
            <section
              aria-labelledby="coach-heading"
              className="rounded-2xl border border-teal-800 bg-teal-950/40 p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2
                  id="coach-heading"
                  className="font-semibold text-teal-100"
                >
                  Ask your AI career coach
                </h2>

                <span className="rounded-full bg-teal-900 px-3 py-1 text-xs font-medium text-teal-200">
                  Text chat
                </span>
              </div>

              <p className="mt-4 text-sm leading-6 text-slate-300">
                Ask questions about your saved résumé assessment, job matches, skill
                gaps, and learning plans with your AI career coach.
              </p>

              <ul className="mt-4 space-y-2 text-sm leading-6 text-slate-400">
                <li>Type questions and get practical feedback.</li>
                <li>Discuss your saved assessment after signing in.</li>
                <li>AI assistance, not a human adviser.</li>
                <li>Explore résumé improvements and interview practice.</li>
              </ul>

              <Link
                href="/sessions"
                className="mt-5 block w-full rounded-xl bg-teal-400 px-4 py-3 text-center text-sm font-semibold text-slate-950 hover:bg-teal-300"
              >
                Open saved assessments
              </Link>

              <p
                className="mt-3 text-xs leading-5 text-slate-400"
              >
                Open a saved assessment to start text chat.
              </p>
            </section>

            <section className="rounded-2xl border border-slate-800 p-5">
              <h2 className="font-semibold">Understand your match</h2>

              <p className="mt-3 text-sm leading-6 text-slate-400">
                Your score describes how the evidence in your profile aligns
                with extracted job requirements. It does not predict your
                probability of getting hired.
              </p>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
