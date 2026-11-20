import OpenAI from "openai";
import { NextResponse } from "next/server";
import {
  JobAgentInputSchema,
  runJobSearchAgent,
} from "@/lib/agents/job-search-agent";
import { JobSearchError } from "@/lib/tools/search-jobs";
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

  const parsed = JobAgentInputSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          "Enter a target role and a reviewed profile of at least 80 characters.",
      },
      { status: 400 },
    );
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "The job-search agent is not configured." },
      { status: 503 },
    );
  }

  try {
    const result = await runJobSearchAgent(parsed.data);

    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof JobSearchError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    if (error instanceof OpenAI.AuthenticationError) {
      return NextResponse.json(
        { error: "The AI service has an authentication problem." },
        { status: 503 },
      );
    }

    if (error instanceof OpenAI.RateLimitError) {
      return NextResponse.json(
        { error: "The AI service reached a usage limit." },
        { status: 429 },
      );
    }

    return NextResponse.json(
      { error: "Job discovery failed. Please try again." },
      { status: 502 },
    );
  }
}
