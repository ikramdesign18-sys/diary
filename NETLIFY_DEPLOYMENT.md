# Netlify Functions Deployment

This deploys the Amanat Diary Groq proxy and optional automatic future-email delivery. The Express API in `artifacts/api-server` remains available for local development.

## Endpoints

- `GET /api/healthz`
- `POST /api/ai/theme-detect`
- `POST /api/ai/voice-polish`
- `POST /api/ai/transcribe-audio` returns the existing safe `501` placeholder
- `POST /api/future-email/schedule`
- `GET /api/future-email/list`
- `POST /api/future-email/update`
- `POST /api/future-email/cancel`
- `POST /api/process-future-emails` protected by `CRON_SECRET`
- Hourly scheduled function: `process-future-emails`

The Netlify functions reuse the same Groq client, request validation, and AI response validation as the Express routes.

## Required Netlify Environment Variables

Add this in **Netlify → Site configuration → Environment variables**:

```text
GROQ_API_KEY=your_real_groq_key
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
RESEND_API_KEY=your_resend_api_key
EMAIL_FROM=Amanat Diary <memories@your-verified-domain.com>
CRON_SECRET=your_long_random_secret
```

Do not add backend keys to the Expo app, `netlify.toml`, or any committed file. See `FUTURE_EMAIL_DELIVERY.md` for migration, Resend, and testing steps.

## Deploy From Git

1. Push this repository to GitHub, GitLab, or Bitbucket.
2. In Netlify, choose **Add new site → Import an existing project**.
3. Select the repository.
4. Keep the repository root as the base directory.
5. Netlify reads these values from `netlify.toml`:
   - Build command: `pnpm exec tsc -p netlify/tsconfig.json --noEmit`
   - Publish directory: `netlify/public`
   - Functions directory: `netlify/functions`
6. Add `GROQ_API_KEY` in Netlify environment variables.
7. Deploy the site.
8. Test:

```bash
curl https://your-netlify-site.netlify.app/api/healthz
```

## Deploy With Netlify CLI

From the repository root:

```bash
pnpm --package=netlify-cli dlx netlify login
pnpm --package=netlify-cli dlx netlify init
pnpm --package=netlify-cli dlx netlify env:set GROQ_API_KEY
pnpm --package=netlify-cli dlx netlify deploy --build
pnpm --package=netlify-cli dlx netlify deploy --build --prod
```

When `env:set` prompts for a value, paste the real Groq key. Do not place it directly in shell history.

## Run Locally With Netlify CLI

The ignored backend `.env` already uses the required `GROQ_API_KEY` name. From the repository root:

```bash
pnpm --package=netlify-cli dlx netlify dev --filter @workspace/api-server
```

Then test the functions:

```bash
curl http://localhost:8888/api/healthz

curl -X POST http://localhost:8888/api/ai/theme-detect \
  -H "Content-Type: application/json" \
  -d '{"title":"Quiet morning","body":"I feel grateful today.","availableThemes":["classic-cream-diary","golden-gratitude"]}'

curl -X POST http://localhost:8888/api/ai/voice-polish \
  -H "Content-Type: application/json" \
  -d '{"transcript":"today i completed my work and felt happy","style":"grammar_only"}'

curl -X POST http://localhost:8888/api/ai/transcribe-audio \
  -H "Content-Type: application/json" \
  -d '{}'
```

## Expo Configuration

After Netlify deployment, set only this API value in `artifacts/amanat-diary/.env`:

```text
EXPO_PUBLIC_API_BASE_URL=https://your-netlify-site.netlify.app
```

Do not append `/api`; the frontend already calls `/api/ai/...`.

Restart Expo after changing the value:

```bash
pnpm --filter @workspace/amanat-diary exec expo start -c
```

When Netlify or Groq is unavailable, the app keeps its existing local/offline AI fallbacks.
