import { NextResponse } from "next/server";
import {
  JobSearchError,
  JobSearchInputSchema,
  searchJobs,
} from "@/lib/tools/search-jobs";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Send a valid JSON request." },
      { status: 400 },
    );
  }

  const parsed = JobSearchInputSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Enter a target job between 2 and 120 characters.",
      },
      { status: 400 },
    );
  }

  try {
    const result = await searchJobs(parsed.data);

    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof JobSearchError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    if (error instanceof Error && error.name === "TimeoutError") {
      return NextResponse.json(
        { error: "The job search timed out. Please try again." },
        { status: 504 },
      );
    }

    return NextResponse.json(
      { error: "Job search failed. Please try again later." },
      { status: 502 },
    );
  }
}
