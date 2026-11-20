"use client";

import { useState, type FormEvent, type ReactNode } from "react";

type Requirement = {
  requirement: string;
  importance: "required" | "preferred";
  status: "matched" | "partial" | "not_evidenced";
};

type Citation = {
  start: number;
  end: number;
  title: string;
  url: string;
};

type ResearchBlock = {
  text: string;
  citations: Citation[];
};

type LearningPlan = {
  skill: string;
  generatedAt: string;
  blocks: ResearchBlock[];
  hasCitations: boolean;
  notice: string;
};

type Preferences = {
  level: "beginner" | "intermediate" | "advanced";
  hoursPerWeek: number;
  format: "reading" | "video" | "either";
};

function isWebUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}
export function CitedText({ block }: { block: ResearchBlock }) {
  const parts: ReactNode[] = [];
  let position = 0;

  const citations = [...block.citations].sort((a, b) => a.start - b.start);

  for (const [index, citation] of citations.entries()) {
    if (
      !isWebUrl(citation.url) ||
      !Number.isInteger(citation.start) ||
      !Number.isInteger(citation.end) ||
      citation.start < position ||
      citation.end <= citation.start ||
      citation.end > block.text.length
    ) {
      continue;
    }

    parts.push(block.text.slice(position, citation.start));

    parts.push(
      <a
        key={`citation-${index}`}
        href={citation.url}
        target="_blank"
        rel="noopener noreferrer"
        title={citation.title}
        className="font-medium text-teal-300 underline underline-offset-4"
      >
        [{citation.title || "Source"}]
        <span className="sr-only"> (opens in a new tab)</span>
      </a>,
    );

    position = citation.end;
  }

  parts.push(block.text.slice(position));

  return (
    <div className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-300">
      {parts}
    </div>
  );
}

export default function LearningResources({
  requirements,
  targetRole,
  sessionId,
}: {
  requirements: Requirement[];
  targetRole: string;
  sessionId?: string;
}) {
  const gaps = requirements
    .filter((item) => item.status !== "matched")
    .sort(
      (a, b) =>
        Number(b.importance === "required") -
        Number(a.importance === "required"),
    );

  const [skill, setSkill] = useState(gaps[0]?.requirement ?? "");
  const [saveMessage, setSaveMessage] = useState("");
  const [preferences, setPreferences] = useState<Preferences>({
    level: "beginner",
    hoursPerWeek: 5,
    format: "either",
  });

  const [plan, setPlan] = useState<LearningPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function clearResult() {
    setPlan(null);
    setError("");
    setSaveMessage("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (loading) return;

    clearResult();
    setLoading(true);

    try {
      const endpoint = sessionId
        ? `/api/sessions/${encodeURIComponent(sessionId)}/learning-plan`
        : "/api/learning-plan";

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          skill,
          targetRole,
          ...preferences,
        }),
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
            : "Unable to research learning resources.",
        );
      }

      if (
        !result ||
        typeof result.skill !== "string" ||
        !Array.isArray(result.blocks) ||
        !result.blocks.every(
          (block: ResearchBlock) =>
            block &&
            typeof block.text === "string" &&
            Array.isArray(block.citations) &&
            block.citations.every(
              (citation) =>
                citation &&
                typeof citation.url === "string" &&
                typeof citation.title === "string" &&
                Number.isInteger(citation.start) &&
                Number.isInteger(citation.end),
            ),
        )
      ) {
        throw new Error("The learning service returned an invalid result.");
      }

      setPlan(result);
      if (sessionId) {
        setSaveMessage(
          result.saved
            ? "This learning plan was saved to the assessment."
            : "The plan was generated but could not be saved. Keep this page open to review it.",
        );
      }
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Research failed. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  if (gaps.length === 0) {
    return (
      <section className="rounded-xl border border-slate-700 p-5">
        <h3 className="text-lg font-semibold">Learning Resources Agent</h3>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          No skill gaps were identified in the extracted requirements. Review
          the assessment against the original listing.
        </p>
      </section>
    );
  }

  const fieldClasses =
    "mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 " +
    "p-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-400";

  return (
    <section
      aria-labelledby="learning-heading"
      className="rounded-xl border border-slate-700 bg-slate-900 p-5"
    >
      <h3 id="learning-heading" className="text-lg font-semibold">
        Learning Resources Agent
      </h3>

      <p className="mt-3 text-sm leading-6 text-slate-400">
        Choose a skill and your learning preferences. The agent will search for
        relevant resources and suggest a practice plan. If you already have the
        skill, consider adding evidence to your profile instead.
      </p>
      {sessionId && (
        <p className="mt-3 text-xs leading-6 text-amber-200">
          Generating a plan here saves it to this assessment and replaces any
          previously saved learning plan.
        </p>
      )}
      <form onSubmit={handleSubmit} className="mt-5">
        <fieldset disabled={loading} className="space-y-5">
          <legend className="sr-only">Learning preferences</legend>

          <div>
            <label htmlFor="learning-skill" className="text-sm font-medium">
              Skill or requirement to explore
            </label>

            <select
              id="learning-skill"
              value={skill}
              onChange={(event) => {
                setSkill(event.target.value);
                clearResult();
              }}
              required
              className={fieldClasses}
            >
              {gaps.map((gap, index) => (
                <option
                  key={`${gap.requirement}-${index}`}
                  value={gap.requirement}
                >
                  {gap.requirement} ({gap.importance})
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="learning-level" className="text-sm font-medium">
                Current level
              </label>

              <select
                id="learning-level"
                value={preferences.level}
                onChange={(event) => {
                  setPreferences((previous) => ({
                    ...previous,
                    level: event.target.value as Preferences["level"],
                  }));
                  clearResult();
                }}
                className={fieldClasses}
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>

            <div>
              <label htmlFor="learning-format" className="text-sm font-medium">
                Preferred format
              </label>

              <select
                id="learning-format"
                value={preferences.format}
                onChange={(event) => {
                  setPreferences((previous) => ({
                    ...previous,
                    format: event.target.value as Preferences["format"],
                  }));
                  clearResult();
                }}
                className={fieldClasses}
              >
                <option value="either">Reading or video</option>
                <option value="reading">Reading</option>
                <option value="video">Video</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="learning-hours" className="text-sm font-medium">
              Hours available per week
            </label>

            <input
              id="learning-hours"
              type="number"
              min={1}
              max={40}
              step={1}
              required
              value={preferences.hoursPerWeek || ""}
              onChange={(event) => {
                setPreferences((previous) => ({
                  ...previous,
                  hoursPerWeek: Number(event.target.value),
                }));
                clearResult();
              }}
              className={fieldClasses}
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-xl bg-teal-400 px-5 py-3 font-semibold text-slate-950 hover:bg-teal-300 disabled:cursor-wait disabled:opacity-60"
          >
            {loading ? "Researching resources..." : "Build my learning plan"}
          </button>
        </fieldset>
      </form>
      <p role="status" className="mt-3 text-sm text-teal-300">
        {saveMessage}
      </p>

      <p className="mt-3 text-xs leading-5 text-slate-400">
        This sends the selected requirement, target role, and learning
        preferences to our research service. It does not send your full profile.
        Each request uses paid AI and web-search services.
      </p>

      <p role="status" className="mt-3 text-sm text-teal-300">
        {loading
          ? "Searching for resources and preparing your plan..."
          : plan
            ? "Your learning plan is ready."
            : ""}
      </p>

      {error && (
        <p
          role="alert"
          className="mt-4 rounded-xl border border-red-900 bg-red-950 p-4 text-sm text-red-200"
        >
          {error}
        </p>
      )}

      {plan && (
        <div className="mt-6 space-y-5 border-t border-slate-700 pt-6">
          <h4 className="text-lg font-semibold text-teal-200">
            Learning plan: {plan.skill}
          </h4>

          {!plan.hasCitations && (
            <p className="rounded-lg bg-amber-950 p-3 text-sm text-amber-200">
              No source citations were returned. Treat external-resource claims
              as unverified.
            </p>
          )}

          {plan.blocks.map((block, index) => (
            <CitedText key={index} block={block} />
          ))}

          <p className="border-t border-slate-800 pt-4 text-xs leading-6 text-slate-400">
            {plan.notice}
          </p>
        </div>
      )}
    </section>
  );
}
