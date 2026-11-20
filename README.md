# CareerCompass AI

A career-assistance app for finding remote jobs, comparing resume evidence with job requirements, researching learning resources, and asking follow-up questions through a text coach.

## Features

- **Resume extraction:** upload a PDF or DOCX and review the extracted profile before assessment.
- **Job discovery:** search remote listings from Himalayas using an AI-assisted search workflow.
- **Evidence-based assessment:** identify matched requirements and missing evidence, with a documented job-fit score. This score is not a probability of being selected.
- **Learning resources:** research learning plans with web-search citations and save a plan with an assessment.
- **Text career coach:** ask questions about a saved assessment, resume improvements, interview preparation, and learning priorities.
- **Private saved assessments:** Supabase authentication and row-level security restrict access by owner.

SMS, telephone callbacks, and browser voice have been removed. Text coaching uses OpenAI; no ElevenLabs or telephone-provider account is required.

## Stack

Next.js App Router, TypeScript, React, Tailwind CSS, OpenAI Responses API, Supabase Auth/Postgres, and Himalayas job data.

## Local setup

1. Install a Node.js version supported by the installed Next.js release and run `npm ci`.
2. Copy `.env.example` to `.env.local` and fill in the three required values. Never commit real credentials.
3. Configure Supabase email authentication and redirect URLs for `http://localhost:3000` and `/login`.
4. Prepare the database:
   - For a **new empty database**, apply the files under `supabase/migrations` in numeric order. Later migrations retire historical phone/voice access without deleting records.
   - For an **existing database**, apply only migrations not already applied. Do not recreate `career_sessions` or rewrite old migrations. The current text coach requires `006_text_coach.sql`.
5. Run `npm run dev` and open `http://localhost:3000`.

The application needs a usable OpenAI API key with model access and quota. A ChatGPT subscription does not itself provide API credits. The active application does not need a Supabase service-role key.

## Checks

```sh
npm test
npm run lint
npm run build
```

The automated text-coach tests use mocked services; they do not prove live provider connectivity or database permissions. Test sign-in, resume extraction, job selection, assessment saving, learning plans, and a text-chat follow-up on the running app.

## Deploy to Vercel

1. Confirm a production build succeeds locally.
2. Push the repository to GitHub with `.env.local` excluded.
3. Import it into Vercel and configure the values documented in `.env.example`.
4. Apply pending migrations to the production Supabase project.
5. Add the deployed site's URL and login redirect to Supabase Auth URL configuration.
6. Test the complete user flow on the deployed site before sharing it.

## Project layout

```text
src/app/api/          Authenticated API routes
src/app/sessions/     Saved assessments and text coach
src/components/       Forms and interactive panels
src/lib/agents/       Job-search and learning workflows
src/lib/tools/        Job-provider integration
src/lib/supabase/     Browser and server Supabase clients
supabase/migrations/  Versioned database changes, including historical retirements
tests/               Mocked API tests
docs/text-coach.md    Text-coach design and setup details
```

## Data and limitations

AI requests can send the reviewed profile, job description, or questions to OpenAI. API usage may incur charges. Model output should be reviewed for accuracy. Job availability and learning-resource access can change.

Chat history stays in the page's memory and clears on navigation/reload. Requests use `store: false`, but provider retention policies may still apply. The text coach does not browse, apply to jobs, or alter saved assessments. Resource research is handled by the separate Learning Resources feature.

See [text-coach setup](docs/text-coach.md) for implementation details, limits, and deployment verification.
