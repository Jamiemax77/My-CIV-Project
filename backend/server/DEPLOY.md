# Deploying to a Hostinger VPS with CloudPanel

This is a plain Node.js + Express + MySQL API — no Docker needed. CloudPanel
manages the reverse proxy, SSL, and process for you.

## 1. Create the database

In CloudPanel: **Databases → Add Database**. Give it a name (e.g.
`civ_project`), CloudPanel creates a matching MySQL user + password — note
both down, you'll need them for `.env`.

Then import the schema. Easiest via CloudPanel's **phpMyAdmin/Adminer**
link on the database page (Import tab → upload `schema.sql`), or via SSH:

```bash
mysql -u civ_user -p civ_project < schema.sql
```

## 2. Create the site

**Sites → Add Site → Node.js**. Pick a domain/subdomain (e.g.
`api.yourdomain.com`), Node.js version 18+ (whatever CloudPanel offers is
fine, the code has no version-specific features), and note the site's home
directory (something like `/home/civ-project/htdocs/api.yourdomain.com`).

## 3. Upload the code

From your machine, push just the `backend/server/` folder's contents to
that directory — via Git (`git clone`/`pull` on the VPS, recommended) or
SFTP (CloudPanel gives you SFTP credentials per site under **Site → File
Manager / FTP**).

## 4. Install dependencies and configure

SSH into the VPS (`ssh root@<your-ip>`), then:

```bash
cd /home/civ-project/htdocs/api.yourdomain.com
npm install --omit=dev
cp .env.example .env
nano .env   # fill DB_NAME/DB_USER/DB_PASSWORD from step 1, and:
            #   JWT_SECRET=$(openssl rand -hex 32)
            #   STORAGE_DIR=/home/civ-project/storage   (outside htdocs — not web-servable)
mkdir -p /home/civ-project/storage
```

Keeping `STORAGE_DIR` outside `htdocs/` matters: anything inside the site's
web root could theoretically become directly downloadable if the reverse
proxy config ever changes. Files must only ever be reachable through
`GET /api/files/:id`, which checks the caller's session first.

## 5. Point CloudPanel at the app

In the site's **Node.js** settings: set the startup file to `src/index.js`
and the app port to whatever your app listens on (matches `PORT` in
`.env`, default `3000`). CloudPanel's built-in process manager restarts it
on crash and on server reboot — no separate PM2 setup needed.

Enable **SSL** for the site (free Let's Encrypt, one click) so the app
always gets `https://`.

## 6. Seed demo accounts

PINs are bcrypt-hashed, never stored in plaintext:

```bash
node scripts/hash-pin.js 123456
```

Copy the printed hash into a new row's `pin_hash` column in the `profiles`
table (via phpMyAdmin/Adminer, or a quick `INSERT` over SSH). `id` can be
any unique string (e.g. `p-001`); `role` must be exactly `participant` or
`admin`. Leave `failed_attempts` at `0` and `locked_until` empty.

## 7. Point the app at it

In the RN project root: copy `.env.example` to `.env` and set

```
EXPO_PUBLIC_API_URL=https://api.yourdomain.com/api
```

Restart the Expo dev server after changing `.env` (env vars are inlined at
bundle time, not read at runtime).

## Verifying it works

- `curl https://api.yourdomain.com/api/health` → `{"ok":true,"data":{"status":"My CIV-Project API is running"}}`.
- Log in from the app with a seeded account. If it fails, check the app's
  stdout log — CloudPanel's Node.js site page has a **Logs** tab that tails it.

## Firewall note

The VPS summary showed **0 firewall rules**. Since CloudPanel's reverse
proxy already terminates HTTP(S) on 80/443, the Node app itself only needs
to be reachable from `localhost` (which is how CloudPanel's proxy talks to
it) — it shouldn't need a separate inbound port opened at all. Worth
setting up basic firewall rules (allow 22/80/443, deny everything else)
regardless, since this server now holds real PINs and files.
