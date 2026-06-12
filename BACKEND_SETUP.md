# Amanat Diary Backend Setup

## Architecture

The private API backend lives in `artifacts/api-server`. It is a separate Express service and must be deployed separately from the Expo app.

The diary remains local-first. SQLite, PIN/biometric locking, writing, reading, backup, and exports continue working when this backend is unavailable.

## Local Development

From the workspace root:

```bash
PORT=8080 GROQ_API_KEY=your_key pnpm --filter @workspace/api-server run dev
```

Check the server:

```bash
curl http://localhost:8080/api/healthz
```

Theme detection:

```bash
curl -X POST http://localhost:8080/api/ai/theme-detect \
  -H "Content-Type: application/json" \
  -d '{"title":"A peaceful morning","body":"I feel thankful for my family.","transcript":"","availableThemes":["classic-cream-diary","golden-gratitude","morning-sunshine"]}'
```

Voice transcript polish:

```bash
curl -X POST http://localhost:8080/api/ai/voice-polish \
  -H "Content-Type: application/json" \
  -d '{"transcript":"today i felt really happy and thankful","style":"beautiful_diary"}'
```

Audio transcription:

```bash
curl -X POST http://localhost:8080/api/ai/transcribe-audio \
  -F "language=auto" \
  -F "audio=@/absolute/path/to/voice-memory.m4a"
```

## Environment Variables

Frontend values belong in `artifacts/amanat-diary/.env`:

```env
EXPO_PUBLIC_SUPABASE_URL=replace_with_supabase_project_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=replace_with_supabase_anon_key
EXPO_PUBLIC_API_BASE_URL=http://localhost:8080
```

Backend secrets belong in the API server environment:

```env
GROQ_API_KEY=your_real_groq_key
PORT=8080
CORS_ORIGIN=*
```

For Android Emulator local development, use `http://10.0.2.2:8080` instead of `localhost`. A physical device needs an API URL reachable from that device.

## Deployment

1. Deploy `artifacts/api-server` separately.
2. Set `GROQ_API_KEY` through the hosting provider's secret manager.
3. Set `PORT=8080` if required by the provider.
4. Restrict `CORS_ORIGIN` to allowed web origins when appropriate.
5. Set the Expo app's `EXPO_PUBLIC_API_BASE_URL` to the deployed HTTPS API URL before building the mobile app.

The production backend starts from `artifacts/api-server/dist/index.mjs` after running:

```bash
pnpm --filter @workspace/api-server run build
PORT=8080 NODE_ENV=production pnpm --filter @workspace/api-server run start
```

## Security

- Never commit `.env` files.
- Never expose `GROQ_API_KEY` through an `EXPO_PUBLIC_` variable.
- Never put `SUPABASE_SERVICE_ROLE_KEY` in the Expo frontend.
- Supabase URL and anon key are public client configuration; enforce data access with Supabase Row Level Security.
- The API validates request sizes and returns fallback-safe errors without logging secrets.
