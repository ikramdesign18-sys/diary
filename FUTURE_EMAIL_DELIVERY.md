# Automatic Future Email Delivery

Automatic email delivery is optional. Local reminders and manual sharing continue to work without login or network access.

## 1. Apply the Supabase migration

Open **Supabase Dashboard → SQL Editor**, paste the complete contents of:

```text
supabase/migrations/20260612190000_future_email_deliveries.sql
```

Run it once. It creates `future_email_deliveries`, indexes, status constraints, and RLS policies.

The mobile client can read its own rows and can only update rows that are still `scheduled`. It cannot mark a delivery as `processing` or `delivered`. Netlify uses the service role to process deliveries.

## 2. Configure Resend

1. Create a Resend account.
2. Add and verify a sending domain in Resend.
3. Create a Resend API key.
4. Choose an address on the verified domain, for example:

```text
Amanat Diary <memories@yourdomain.com>
```

## 3. Add Netlify environment variables

In **Netlify → Site configuration → Environment variables**, add:

```text
RESEND_API_KEY
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
EMAIL_FROM
CRON_SECRET
```

Keep the existing `GROQ_API_KEY`.

`SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, and `CRON_SECRET` are backend-only. Never add them to the Expo `.env`, `eas.json`, or any `EXPO_PUBLIC_` variable.

CLI setup from the repository root:

```bash
pnpm --package=netlify-cli dlx netlify env:set RESEND_API_KEY
pnpm --package=netlify-cli dlx netlify env:set SUPABASE_URL
pnpm --package=netlify-cli dlx netlify env:set SUPABASE_SERVICE_ROLE_KEY
pnpm --package=netlify-cli dlx netlify env:set EMAIL_FROM
pnpm --package=netlify-cli dlx netlify env:set CRON_SECRET
```

Let each command prompt for its value so secrets do not enter shell history.

## 4. API endpoints

Authenticated user endpoints require the Supabase session access token:

```text
POST /api/future-email/schedule
GET  /api/future-email/list
POST /api/future-email/update
POST /api/future-email/cancel
```

The protected manual processor is:

```text
POST /api/process-future-emails
X-Cron-Secret: your CRON_SECRET
```

The scheduled Netlify Function runs every hour and processes up to 25 due, consented deliveries.

## 5. Test delivery in about five minutes

1. Deploy the migration and Netlify environment variables.
2. Redeploy Netlify.
3. In the app, sign in with a verified email.
4. Open Future Letters → Loved One → Send automatically by email.
5. Enter a delivery timestamp a few minutes in the future, confirm consent, and schedule.
6. After the timestamp passes, trigger the protected processor:

```bash
curl -X POST https://amanat-diary.netlify.app/api/process-future-emails \
  -H "X-Cron-Secret: your_CRON_SECRET"
```

Expected summary:

```json
{"processed":1,"delivered":1,"failed":0,"retried":0}
```

Confirm the email arrived and the app status changes to `delivered` after reopening Future Letters. Without the manual call, the hourly scheduled function processes it during the next hourly run.

## Safety behavior

- Logged-out users cannot schedule automatic email, but local reminders and manual sharing still work.
- A failed first schedule is kept locally and clearly marked failed.
- Existing scheduled server deliveries are not silently changed or cancelled while offline.
- Cancelled, unconsented, processing, or delivered rows are not selected for sending.
- Failed provider calls retry up to three total attempts.
- Logs contain delivery IDs and statuses only, never message text, recipient email, tokens, or keys.
