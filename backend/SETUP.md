# Setup: Google Sheets + Apps Script backend

This replaces the mock data store with a real backend, per §1B of
`PROMPT-DEV-CIV-PROJECT.md`: Google Sheets as the database, Google Drive for
files, and one Apps Script Web App as the only API layer in between. The app
never talks to Sheets/Drive directly.

## 1. Create the spreadsheet

1. Create a new Google Sheet, name it e.g. **My CIV-Project DB**.
2. Extensions → Apps Script. This opens a script project bound to the sheet.
3. Delete the default `Code.gs` content, then create these 6 script files
   (Files → New → Script) and paste in the matching content from
   `backend/apps-script/` in this repo:
   - `Sheets.gs`
   - `Auth.gs`
   - `Participant.gs`
   - `Admin.gs`
   - `Drive.gs`
   - `Code.gs`
   - `Setup.gs`
4. In the toolbar function dropdown, select **initSheets**, click Run once.
   Grant the permissions it asks for. This creates all 7 tabs (`profiles`,
   `scholarships`, `disbursements`, `reimbursements`, `reports`, `accounts`,
   `transfer_proofs`) with header rows, and removes the leftover default tab.

## 2. Set the HMAC secret

Session tokens are HMAC-signed, not stored server-side, so they need a secret:

1. Project Settings (gear icon) → Script Properties → Add property.
2. Key: `HMAC_SECRET`, Value: any long random string (e.g. generate one with
   `openssl rand -hex 32` or a password manager).
3. Run **checkConfig** to confirm it's picked up.

## 3. Seed demo accounts

PINs are never stored in plaintext — only `SHA-256(pin + salt)`. To seed a
user:

1. Select **seedPin** in the function dropdown. Edit the call at the bottom
   of `Setup.gs` temporarily, or run it from the built-in *Execution log* by
   calling `seedPin('123456')` from the Apps Script editor's console.
2. Copy the logged `pin_salt` and `pin_hash` values.
3. In the `profiles` tab, add a row by hand with those two values plus the
   rest of the profile (`id`, `role`, `full_name`, `id_number`, `email`, ...).
   `id` can be any unique string, e.g. `p-001`. `role` must be exactly
   `participant` or `admin`.
4. Leave `failed_attempts` as `0` and `locked_until` empty.

Repeat for each demo participant/admin (the app's old mock users — Andi
Pratama, Siti Rahma, Budi Wijaya, Rina Wijaya — are a reasonable starting
set to recreate here).

## 4. Deploy as a Web App

1. Deploy → New deployment → type **Web app**.
2. Execute as: **Me**. Who has access: **Anyone** (the app itself enforces
   auth via the session token — this setting just controls who can *reach*
   the endpoint at all).
3. Deploy, then copy the **Web app URL** (ends in `/exec`).
4. Every time you edit the script files afterwards, you must create a
   **new deployment version** (Deploy → Manage deployments → edit → new
   version) for changes to go live — saving the file alone isn't enough.

## 5. Point the app at it

In the RN project root, copy `.env.example` to `.env` and set:

```
EXPO_PUBLIC_API_URL=https://script.google.com/macros/s/XXXXXXXX/exec
```

Restart the Expo dev server after changing `.env` (env vars are inlined at
bundle time, not read at runtime).

## Verifying it works

- Visit the Web App URL directly in a browser — you should see
  `{"ok":true,"data":{"status":"My CIV-Project API is running"}}`.
- Log in from the app with a seeded participant's email/NIM + PIN. If it
  fails, check the Apps Script **Executions** log (left sidebar) for the
  thrown error message.

## What's wired up so far vs. what's still mock

As of this pass, **Auth (login/session) and the participant Dashboard**
call the real API. Reimbursement, Report, Accounts, Transfer Proof, and all
Admin screens still read/write the local Zustand mock store — they'll be
switched over to `listReimbursements` / `addReimbursement` / etc. (already
implemented server-side, see `Participant.gs` and `Admin.gs`) in a later
pass. `uploadFile` / `getFile` in `Drive.gs` are also implemented and ready,
but no screen calls them yet — that lands together with the Reimbursement/
Report/UploadTransferProof screens' wiring, since that's the first place a
real upload is needed.

## Known limitations (carried over from §1B of the spec)

- PIN hashing uses SHA-256 + per-user salt, not bcrypt/argon2 — weaker, but
  Apps Script has no native strong-KDF, mitigated by the lockout after 5
  failed attempts.
- No row-level security at the platform level — every handler in
  `Participant.gs`/`Admin.gs` manually filters by `participant_id` from the
  verified token. A bug in one handler could leak data across participants;
  review any new action carefully.
- Apps Script execution and UrlFetch quotas are fine for tens–hundreds of
  participants, not for scale beyond that.
- No realtime/offline sync — the app polls via React Query, not push
  updates.
- Single spreadsheet = single point of failure. Turn on Drive version
  history for it, and consider a periodic export/snapshot as the program
  grows.
