import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const AssessmentSchema = z.object({
  summary: z.string().max(12000),
  matchScore: z.number().int().min(0).max(100).nullable(),
  scoringNote: z.string().max(2000),
  requirements: z
    .array(
      z.object({
        requirement: z.string().max(2000),
        importance: z.enum(["required", "preferred"]),
        status: z.enum(["matched", "partial", "not_evidenced"]),
        profileEvidence: z.string().max(12000).nullable(),
        explanation: z.string().max(4000),
      }),
    )
    .max(30),
  eligibilityChecks: z
    .array(
      z.object({
        requirement: z.string().max(2000),
        status: z.enum(["met", "not_met", "unknown"]),
        explanation: z.string().max(4000),
      }),
    )
    .max(30),
  nextSteps: z.array(z.string().max(4000)).max(20),
});

const SaveSchema = z.object({
  targetRole: z.string().trim().min(2).max(120),
  profile: z.string().trim().min(80).max(12000),
  jobDescription: z.string().trim().min(80).max(16000),
  assessment: AssessmentSchema,
});

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: "Please sign in to save assessments." },
      { status: 401 },
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Send a valid JSON request." },
      { status: 400 },
    );
  }

  const parsed = SaveSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "The assessment could not be saved because its data is invalid." },
      { status: 400 },
    );
  }

  const input = parsed.data;

  const { data, error } = await supabase
    .from("career_sessions")
    .insert({
      user_id: user.id,
      target_role: input.targetRole,
      profile_text: input.profile,
      job_description: input.jobDescription,
      assessment: input.assessment,
    })
    .select("id")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: "Unable to save the assessment. Please try again." },
      { status: 500 },
    );
  }

  return NextResponse.json(
    { id: data.id },
    {
      status: 201,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
