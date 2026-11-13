# legacy/

Files from the original AI Studio export that the new app does not use. They are kept only for reference. Nothing here is bundled, compiled or type-checked (`tsconfig.json` only includes `src/`).

| File | What it was |
| --- | --- |
| `src/firebase.ts`, `src/firebase-sync.ts`, `src/firebaseSync.ts` | Firebase Auth and Firestore sync |
| `src/components/LoginScreen.tsx` | Google sign-in screen |
| `server.ts` | Express server with the `/api/send-otp` SMS relay (Twilio, with the Textbelt free tier as a fallback) and a health check |
| `firestore.rules`, `firebase-blueprint.json` | Firestore security rules and data model |
| `env.example` | Environment variables the old server expected (Gemini, Twilio) |

## Things to know

* **`firebase-applet-config.json` was left out on purpose.** It held your Firebase web API key. Firebase web keys are meant to be public, but they only stay safe if your Firestore rules and the key's restrictions are tight. If you are no longer using that Firebase project, restrict or delete the key in the Google Cloud console. The file is still in your original zip. `firebase.ts` imports it, so it will not compile on its own.
* **The SMS relay is gone.** The old `/api/send-otp` endpoint accepted a phone number and a code from any caller and sent a real SMS through your Twilio account, or through Textbelt when Twilio was not configured. It had no authentication and no rate limiting of its own. The new app has no accounts and no server, so there is nothing to relay.
* **Cloud sync is gone.** The new app is local-first and keeps data in the browser. Use Settings, then Backup to move data between devices.
