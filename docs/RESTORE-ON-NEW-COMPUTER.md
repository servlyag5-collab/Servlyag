# Servly AG: set up the app on a new computer (from the backup)

The backup is a zip file on the external drive, in `D:\Servly-Backup\` (for example
`servly-app-backup-2026-10-28.zip`). It holds the whole app: every code file, the full git history,
the database scripts, the demo covers, the docs, and your `.env` settings file.

It does **not** hold `node_modules` (about 400 MB of downloaded tools); step 4 downloads them again.

---

## What lives online (safe even if the computer dies)
You don't need a backup of these; signing in is enough:
| Service | What it holds | Where |
|---|---|---|
| **Supabase** | The database (accounts, listings, messages, reviews, bookings) and all uploaded photos | supabase.com |
| **Netlify** | The website servlyag.com | app.netlify.com |
| **GoDaddy** | The domain servlyag.com and its settings | godaddy.com |
| **Expo** | Your Expo account (servlyag) for phone builds | expo.dev |

---

## Step by step

1. **Install the tools** (each is free; use the default options):
   - **Node.js** (the "LTS" version): https://nodejs.org
   - **Git**: https://git-scm.com
   - **The Claude desktop app** (to keep working with Claude): https://claude.ai/download
   - On your phone: **Expo Go** (App Store / Play Store).

2. **Copy the backup** from the external drive to the new computer, for example into your
   `Downloads` folder. Right-click the zip > **Extract All**. You get a folder called `servly-app`.
   (It's best to put it at `Downloads\servly-ag-starter\servly-app`, the same place as before.)

3. **Open a terminal in that folder**: open the `servly-app` folder in File Explorer, click the address
   bar, type `powershell` and press Enter. (Or, in the Claude app, open the folder and use its terminal.)

4. **Download the app's tools** (a few minutes):
   ```bash
   npm install
   ```

5. **Check the settings file.** The backup includes `.env` (it's hidden in some views). If it's missing,
   create a file called `.env` in `servly-app` with these three lines, copying the values from
   Supabase > Project Settings > API (use the **publishable / anon** key, never the secret one):
   ```
   EXPO_PUBLIC_SUPABASE_URL=your project URL
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your publishable (anon) key
   EXPO_PUBLIC_PAY_URL=
   ```

6. **Check everything works:**
   ```bash
   npm run typecheck
   npm test
   ```
   Both should pass.

7. **Start the app:**
   ```bash
   npx expo start --tunnel ngrok -c
   ```
   Scan the QR code with your phone (Expo Go), or open http://localhost:8081 in a browser.

8. **Sign in to Expo** (only needed for phone builds and notifications):
   ```bash
   npx eas-cli login
   ```

9. **Update the website** whenever the app changes:
   ```bash
   npm run build:web
   ```
   Then drag the new `dist` folder onto Netlify > your site > **Deploys**.

10. **Keep working with Claude:** in the Claude app, open the `servly-app` folder. Claude reads
    `CLAUDE.md` (the project notes) and `docs/OWNER-GUIDE.md`, so it knows how everything works.

---

## Good to know
- The **git history** comes with the backup, so every saved version is still there.
- Your `.env` file holds your Supabase address and **publishable** key. They're not secret passwords, but
  keep the backup private anyway.
- **Make a fresh backup** after big changes: ask Claude to "make a new backup on the external drive".
- For an automatic online backup as well, the project can be put in a **private GitHub repository**
  (ask Claude to set it up).
