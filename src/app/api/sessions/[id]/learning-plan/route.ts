import OpenAI from "openai";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  LearningInputSchema,
  runLearningAgent,
} from "@/lib/agents/learning-agent";

const RequestSchema = LearningInputSchema.omit({
  targetRole: true,
});

const StoredAssessmentSchema = z.object({
  requirements: z.array(
    z.object({
      requirement: z.string(),
      status: z.enum(["matched", "partial", "not_evidenced"]),
    }),
  ),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json(
      { error: "Invalid assessment ID." },
      { status: 400 },
    );
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
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

  const parsed = RequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Check the skill and learning preferences." },
      { status: 400 },
    );
  }

  const { data: session, error: readError } = await supabase
    .from("career_sessions")
    .select("id, target_role, assessment")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (readError) {
    return NextResponse.json(
      { error: "Unable to load the assessment." },
      { status: 500 },
    );
  }

  if (!session) {
    return NextResponse.json(
      { error: "Assessment not found." },
      { status: 404 },
    );
  }

  const stored = StoredAssessmentSchema.safeParse(session.assessment);

  if (!stored.success) {
    return NextResponse.json(
      { error: "The saved assessment has an unsupported format." },
      { status: 422 },
    );
  }

  const matchingGap = stored.data.requirements.find(
    (item) =>
      item.status !== "matched" &&
      item.requirement.trim() === parsed.data.skill,
  );

  if (!matchingGap) {
    return NextResponse.json(
      { error: "Choose a skill gap from this saved assessment." },
      { status: 400 },
    );
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "The learning service is not configured." },
      { status: 503 },
    );
  }

  try {
    const plan = await runLearningAgent({
      ...parsed.data,
      targetRole: session.target_role,
    });

    const storedPlan = {
      ...plan,
      preferences: {
        level: parsed.data.level,
        hoursPerWeek: parsed.data.hoursPerWeek,
        format: parsed.data.format,
      },
    };

    const { data: updated, error: saveError } = await supabase
      .from("career_sessions")
      .update({ learning_plan: storedPlan })
      .eq("id", id)
      .eq("user_id", user.id)
      .select("id")
      .maybeSingle();

    // Return useful research even if saving fails.
    return NextResponse.json(
      {
        ...plan,
        saved: !saveError && Boolean(updated),
      },
      {
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch (error) {
    if (error instanceof OpenAI.RateLimitError) {
      return NextResponse.json(
        { error: "The learning service reached a usage limit." },
        { status: 429 },
      );
    }

    if (error instanceof OpenAI.AuthenticationError) {
      return NextResponse.json(
        { error: "The learning service has an authentication problem." },
        { status: 503 },
      );
    }

    return NextResponse.json(
      { error: "Learning research failed. Please try again." },
      { status: 502 },
    );
  }
}
