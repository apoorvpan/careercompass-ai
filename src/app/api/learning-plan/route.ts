import OpenAI from "openai";
import { NextResponse } from "next/server";
import {
  LearningInputSchema,
  runLearningAgent,
} from "@/lib/agents/learning-agent";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createSupabaseClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: "Please sign in to use this feature." },
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

  const parsed = LearningInputSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          "Provide a skill, target role, valid learning level, format, and 1–40 hours per week.",
      },
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
    const plan = await runLearningAgent(parsed.data);

    return NextResponse.json(plan, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof OpenAI.AuthenticationError) {
      return NextResponse.json(
        { error: "The learning service has an authentication problem." },
        { status: 503 },
      );
    }

    if (error instanceof OpenAI.RateLimitError) {
      return NextResponse.json(
        { error: "A usage limit was reached. Please try again later." },
        { status: 429 },
      );
    }

    if (error instanceof OpenAI.APIConnectionTimeoutError) {
      return NextResponse.json(
        { error: "Research timed out. Please try again." },
        { status: 504 },
      );
    }

    return NextResponse.json(
      { error: "Learning research failed. Please try again." },
      { status: 502 },
    );
  }
}
