# Text career coach

The saved-assessment page now has an **Ask your AI career coach** panel. It supports typed questions and follow-up messages about the resume, job fit, interviews, and learning priorities. It uses the existing OpenAI integration. ElevenLabs, microphone access, SMS, and telephone calls are no longer used.

## Setup

1. Run `supabase/migrations/006_text_coach.sql` in the project's Supabase SQL Editor. This creates a protected message quota and retires the old browser voice function. It preserves historical records and old migration files. Migrations 004 and 005 do not need to be rerun for text chat.
2. Keep the existing `OPENAI_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in `.env.local`. Optional `OPENAI_COACH_MODEL` overrides `OPENAI_MODEL`; otherwise the default is `gpt-4.1-mini`. An OpenAI API account with model access and available quota is required; API usage may cost money.
3. Restart `npm run dev`, sign in, open a saved assessment, type a question, and click **Send question**. Clicking a suggested question only fills the input; it does not send automatically.

## Why these files exist

- `src/components/TextCareerCoach.tsx`: question input, starter prompts, conversation display, loading/error states, and Clear chat. Failed requests leave the question available for retry. The last five turns are included as follow-up context. The UI holds up to twenty turns; clearing/reloading/navigating away removes local chat state.
- `src/app/api/coach/chat/route.ts`: authenticates the user, validates input, reloads their saved profile, job description, assessment and learning plan from Supabase, then asks OpenAI for an answer. The client cannot choose another user's assessment or supply system/developer message roles. All client history and saved text are treated as untrusted reference data.
- `supabase/migrations/006_text_coach.sql`: limits each user to thirty attempts per hour with a three-second gap. The database derives the user ID from the authenticated session and serializes quota updates. Failed provider requests count toward the limit. No service-role key is needed.
- `tests/text-coach.test.cjs`: mocked checks for sign-in, ownership, origin, validation, quota failures, provider failures, incomplete answers and follow-up context. No paid model request is made by these tests.

The coach does not browse the web, apply to jobs, place calls, or modify saved assessments. Current resource research remains in the existing Learning Resources feature. Scores describe requirement alignment, not selection probabilities. Draft resume bullets must use supplied facts or explicit placeholders.

Chat messages are not written to the application database. OpenAI requests use `store: false`; provider abuse-monitoring retention may still apply according to account settings. Questions and the saved assessment are sent to OpenAI when the user submits a message. No API key is sent to the browser or logged.

## Deployment and verification

Configure the same environment variables in Vercel, apply migration 006 to the target Supabase project, and run `node --test tests/text-coach.test.cjs` plus a production build. Test an actual signed-in conversation after deployment, including a follow-up question, Clear chat, and switching assessments.

Remove unused `ELEVENLABS_*` environment entries from Vercel. Local ElevenLabs settings and the React SDK have been removed. External ElevenLabs, Exotel, Twilio, or OmniDimension accounts/subscriptions are not cancelled by this code change.
