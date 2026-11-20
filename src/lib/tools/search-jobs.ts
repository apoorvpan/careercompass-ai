import { convert } from "html-to-text";
import { z } from "zod";

export const JobSearchInputSchema = z.object({
  keywords: z.string().trim().min(2).max(120),
  location: z.string().trim().max(120).default(""),
});

const JobSchema = z.object({
  title: z.string(),
  companyName: z.string(),
  description: z.string(),
  excerpt: z.string().nullish(),
  applicationLink: z.string(),
  guid: z.string(),
  locationRestrictions: z.array(z.string()).nullish(),
  timezoneRestrictions: z.array(z.union([z.number(), z.string()])).nullish(),
  seniority: z.array(z.string()).nullish(),
  pubDate: z.number().nullish(),
  expiryDate: z.number().nullish(),
});

const ResponseSchema = z.object({
  jobs: z.array(z.unknown()),
  totalCount: z.number().optional(),
});

export class JobSearchError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "JobSearchError";
  }
}

function safeWebUrl(value: string): string | null {
  try {
    const url = new URL(value);

    return ["https:", "http:"].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

function timestampToIso(seconds: number | null | undefined): string | null {
  if (seconds == null || !Number.isFinite(seconds)) return null;

  const date = new Date(seconds * 1000);

  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function mentionsIndia(value: string): boolean {
  return /^(india|in)$/i.test(value.trim());
}

function mentionsWorldwide(value: string): boolean {
  return /^(worldwide|anywhere|global|world)$/i.test(value.trim());
}

export async function searchJobs(input: z.infer<typeof JobSearchInputSchema>) {
  const url = new URL("https://himalayas.app/jobs/api/search");

  url.searchParams.set("q", input.keywords);
  url.searchParams.set("country", "IN");
  url.searchParams.set("sort", "relevant");
  url.searchParams.set("page", "1");

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
  });

  if (response.status === 429) {
    throw new JobSearchError(
      "The job provider's request limit was reached. Try again later.",
      429,
    );
  }

  if (!response.ok) {
    throw new JobSearchError(
      `Himalayas returned HTTP ${response.status}.`,
      502,
    );
  }

  const payload = ResponseSchema.safeParse(await response.json());

  if (!payload.success) {
    throw new JobSearchError(
      "Himalayas returned an unexpected response structure.",
      502,
    );
  }

  const jobs = [];
  const seen = new Set<string>();
  const nowInSeconds = Date.now() / 1000;

  let skippedCount = 0;

  for (const candidate of payload.data.jobs) {
    const parsedJob = JobSchema.safeParse(candidate);

    if (!parsedJob.success) {
      skippedCount++;
      continue;
    }

    const job = parsedJob.data;

    if (job.expiryDate != null && job.expiryDate <= nowInSeconds) {
      skippedCount++;
      continue;
    }

    const countries = job.locationRestrictions ?? [];
    const explicitlyIncludesIndia = countries.some(mentionsIndia);
    const worldwide = countries.some(mentionsWorldwide);

    // Keep absent restrictions as unknown, rather than claiming eligibility.
    if (countries.length > 0 && !explicitlyIncludesIndia && !worldwide) {
      skippedCount++;
      continue;
    }

    const sourceUrl = safeWebUrl(job.guid);
    const applicationUrl = safeWebUrl(job.applicationLink);

    if (!sourceUrl || !applicationUrl) {
      skippedCount++;
      continue;
    }

    if (seen.has(job.guid)) continue;
    seen.add(job.guid);

    const description = convert(job.description, {
      wordwrap: false,
      selectors: [
        { selector: "a", options: { ignoreHref: true } },
        { selector: "img", format: "skip" },
      ],
    }).trim();

    jobs.push({
      id: job.guid,
      title: job.title,
      company: job.companyName,
      location:
        countries.length > 0
          ? countries.join(", ")
          : "Location restrictions not provided",
      locationRestrictions: countries,
      timezoneRestrictions: job.timezoneRestrictions ?? [],
      locationEligibility: explicitlyIncludesIndia
        ? "India explicitly listed"
        : worldwide
          ? "Worldwide listed; confirm other restrictions"
          : "Needs confirmation",
      seniority: job.seniority ?? [],
      description,
      descriptionCompleteness: "provider_supplied",
      url: applicationUrl,
      sourceUrl,
      remote: true,
      providerPostedAt: timestampToIso(job.pubDate),
      expiresAt: timestampToIso(job.expiryDate),
      source: "Himalayas",
    });
  }

  return {
    query: input.keywords,
    country: "India",
    requestedLocation: input.location,
    searchScope: "Remote jobs; no city-level filtering applied",
    providerTotal: payload.data.totalCount ?? null,
    returnedCount: jobs.length,
    skippedCount,
    fetchedAt: new Date().toISOString(),
    jobs,
    notice:
      "Remote listings sourced from Himalayas. Verify location, timezone, availability, and other eligibility conditions on the original listing. The requested city is not used as a filter.",
  };
}
