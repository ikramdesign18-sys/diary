# Supabase mobile auth redirects

In Supabase Dashboard, open **Authentication → URL Configuration**.

- Change **Site URL** so it does not point to localhost. Use a real website you control, or the deployed backend origin: `https://amanat-diary.netlify.app`.
- Add these **Redirect URLs**:
  - `amanatdiary://auth/callback`
  - `exp://localhost:8081/--/auth/callback` for local Expo testing

The app uses `Linking.createURL("auth/callback")`, so installed Android/iOS builds open the `amanatdiary` app scheme and Expo development builds can use their Expo URL.
