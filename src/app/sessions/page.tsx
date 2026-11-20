import { Suspense } from "react";
import Link from "next/link";
import { io } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function SavedAssessments() {
  await io();

  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  const { data: sessions, error } = await supabase
    .from("career_sessions")
    .select("id, target_role, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return (
      <p role="alert" className="mt-6 text-red-300">
        Unable to load saved assessments. Please refresh and try again.
      </p>
    );
  }

  if (!sessions?.length) {
    return (
      <div className="mt-6 rounded-xl border border-slate-700 p-6">
        <p className="text-slate-300">You haven’t saved any assessments yet.</p>

        <Link href="/" className="mt-4 inline-block text-teal-300 underline">
          Create your first assessment
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-4">
      <p className="text-sm text-slate-400">
        Showing your latest {sessions.length} saved assessments. Times are
        displayed in IST.
      </p>

      {sessions.map((session) => (
        <article
          key={session.id}
          className="rounded-xl border border-slate-700 bg-slate-900 p-5"
        >
          <h2 className="text-lg font-semibold">{session.target_role}</h2>

          <p className="mt-2 text-sm text-slate-400">
            {new Intl.DateTimeFormat("en-IN", {
              dateStyle: "medium",
              timeStyle: "short",
              timeZone: "Asia/Kolkata",
            }).format(new Date(session.created_at))}
          </p>

          <Link
            href={`/sessions/${session.id}`}
            className="mt-4 inline-block text-sm text-teal-300 underline"
          >
            View assessment
          </Link>
        </article>
      ))}
    </div>
  );
}

export default function SessionsPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-5 py-12 text-slate-100">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="text-sm text-teal-300 underline">
          Back to GrowPath
        </Link>

        <h1 className="mt-6 text-3xl font-bold">Saved assessments</h1>

        <Suspense
          fallback={
            <p role="status" className="mt-6 text-slate-400">
              Loading your assessments...
            </p>
          }
        >
          <SavedAssessments />
        </Suspense>
      </div>
    </main>
  );
}
