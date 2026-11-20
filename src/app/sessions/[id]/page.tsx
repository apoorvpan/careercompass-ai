import { Suspense } from "react";
import Link from "next/link";
import { io } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import LearningResources, { CitedText } from "@/components/LearningResources";
import TextCareerCoach from "@/components/TextCareerCoach";

type PageProps = {
  params: Promise<{ id: string }>;
};

const SavedAssessmentSchema = z.object({
  summary: z.string(),
  matchScore: z.number().min(0).max(100).nullable(),
  scoringNote: z.string(),
  requirements: z.array(
    z.object({
      requirement: z.string(),
      importance: z.enum(["required", "preferred"]),
      status: z.enum(["matched", "partial", "not_evidenced"]),
      profileEvidence: z.string().nullable(),
      explanation: z.string(),
    }),
  ),
  eligibilityChecks: z.array(
    z.object({
      requirement: z.string(),
      status: z.enum(["met", "not_met", "unknown"]),
      explanation: z.string(),
    }),
  ),
  nextSteps: z.array(z.string()),
});
const SavedLearningPlanSchema = z.object({
  skill: z.string(),
  generatedAt: z.string(),
  notice: z.string(),
  blocks: z.array(
    z.object({
      text: z.string(),
      citations: z.array(
        z.object({
          start: z.number().int(),
          end: z.number().int(),
          title: z.string(),
          url: z.string(),
        }),
      ),
    }),
  ),
});

async function AssessmentDetails({ params }: PageProps) {
  await io();

  const { id } = await params;

  if (!z.string().uuid().safeParse(id).success) {
    notFound();
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  const { data: session, error } = await supabase
    .from("career_sessions")
    .select(
      "id, target_role, profile_text, job_description, assessment,learning_plan",
    )
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return (
      <p role="alert" className="mt-6 text-red-300">
        Unable to load this assessment. Please try again.
      </p>
    );
  }

  // Missing and other users' records produce the same response.
  if (!session) {
    notFound();
  }

  const parsed = SavedAssessmentSchema.safeParse(session.assessment);

  if (!parsed.success) {
    return (
      <p role="alert" className="mt-6 text-amber-200">
        This saved assessment has an unsupported format.
      </p>
    );
  }

  const assessment = parsed.data;
  const savedLearningPlan = SavedLearningPlanSchema.safeParse(
    session.learning_plan,
  );

  return (
    <div className="mt-6 space-y-6">
      <h1 className="text-3xl font-bold">{session.target_role}</h1>

      <section className="rounded-xl border border-teal-800 bg-teal-950/30 p-6">
        <h2 className="text-lg font-semibold">Documented job fit</h2>

        <p className="mt-3 text-4xl font-bold text-teal-300">
          {assessment.matchScore === null ? "N/A" : `${assessment.matchScore}%`}
        </p>

        <p className="mt-4 leading-7">{assessment.summary}</p>

        <p className="mt-4 text-xs leading-6 text-slate-400">
          {assessment.scoringNote}
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Requirements and evidence</h2>

        <div className="mt-4 space-y-4">
          {assessment.requirements.map((item, index) => (
            <article
              key={index}
              className="rounded-xl border border-slate-700 p-5"
            >
              <h3 className="font-semibold">{item.requirement}</h3>

              <p className="mt-2 text-sm text-teal-300">
                {item.importance} · {item.status.replaceAll("_", " ")}
              </p>

              <p className="mt-3 text-sm leading-6 text-slate-300">
                {item.explanation}
              </p>

              {item.profileEvidence && (
                <blockquote className="mt-3 border-l-2 border-teal-600 pl-4 text-sm text-slate-400">
                  {item.profileEvidence}
                </blockquote>
              )}
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-slate-700 p-5">
        <h2 className="text-xl font-semibold">Eligibility checks</h2>

        {assessment.eligibilityChecks.length === 0 ? (
          <p className="mt-3 text-sm text-slate-400">
            No separate eligibility conditions were extracted. Review the
            original listing.
          </p>
        ) : (
          <ul className="mt-4 space-y-4">
            {assessment.eligibilityChecks.map((item, index) => (
              <li key={index}>
                <h3 className="font-medium">{item.requirement}</h3>
                <p className="mt-1 text-sm text-teal-300">
                  {item.status.replaceAll("_", " ")}
                </p>
                <p className="mt-2 text-sm text-slate-400">
                  {item.explanation}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-slate-700 p-5">
        <h2 className="text-xl font-semibold">Next steps</h2>

        <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-6 text-slate-300">
          {assessment.nextSteps.map((step, index) => (
            <li key={index}>{step}</li>
          ))}
        </ol>
      </section>

      {savedLearningPlan.success && (
        <section className="rounded-xl border border-teal-800 p-5">
          <h2 className="text-xl font-semibold">
            Previously saved learning plan
          </h2>

          <p className="mt-3 font-medium text-teal-300">
            {savedLearningPlan.data.skill}
          </p>

          <div className="mt-4 space-y-5">
            {savedLearningPlan.data.blocks.map((block, index) => (
              <CitedText key={index} block={block} />
            ))}
          </div>

          <p className="mt-4 text-xs leading-6 text-slate-400">
            {savedLearningPlan.data.notice}
          </p>

          <p className="mt-2 text-xs text-slate-400">
            If you generate a replacement below, reload this page to update this
            saved-plan section.
          </p>
        </section>
      )}

      <LearningResources
        requirements={assessment.requirements}
        targetRole={session.target_role}
        sessionId={session.id}
      />

      <details className="rounded-xl border border-slate-700 p-5">
        <summary className="cursor-pointer font-semibold">
          Profile used for this assessment
        </summary>
        <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-300">
          {session.profile_text}
        </p>
      </details>

      <details className="rounded-xl border border-slate-700 p-5">
        <summary className="cursor-pointer font-semibold">
          Job description used for this assessment
        </summary>
        <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-300">
          {session.job_description}
        </p>
      </details>

      <TextCareerCoach key={session.id} sessionId={session.id} />
    </div>
  );
}

export default function SessionPage({ params }: PageProps) {
  return (
    <main className="min-h-screen bg-slate-950 px-5 py-12 text-slate-100">
      <div className="mx-auto max-w-3xl">
        <Link href="/sessions" className="text-sm text-teal-300 underline">
          Back to saved assessments
        </Link>

        <Suspense
          fallback={
            <p role="status" className="mt-6 text-slate-400">
              Loading assessment...
            </p>
          }
        >
          <AssessmentDetails params={params} />
        </Suspense>
      </div>
    </main>
  );
}
