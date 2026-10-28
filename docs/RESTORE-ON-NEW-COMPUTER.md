# Servly AG: set up the app on a new computer

There are **two copies** of the app outside this computer. Use either one:

| Copy | Where | What it holds |
|---|---|---|
| **GitHub** (online, private) | https://github.com/servlyag5-collab/Servlyag (sign in as servlyag5-collab) | All code and full history, always up to date when you "push". **Not** the `.env` settings file. |
| **Backup zip** (external drive) | `D:\Servly-Backup\` on the TOSHIBA drive, e.g. `servly-app-backup-2026-10-28.zip` | Everything, including the `.env` settings file, as of the date in its name. |

Neither holds `node_modules` (about 400 MB of downloaded tools); step 4 downloads them again.

**Quickest way back:** get the code from GitHub (always newest), and copy the `.env` file out of the
newest backup zip on the external drive.

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

2. **Get the app**, either way:
   - **From GitHub (newest):** open a terminal in your `Downloads` folder and run
     ```bash
     git clone https://github.com/servlyag5-collab/Servlyag.git servly-app
     ```
     A GitHub sign-in window opens the first time. Then copy the `.env` file from the newest backup zip
     (on the external drive) into the new `servly-app` folder.
   - **From the external drive:** copy the newest zip into your `Downloads` folder, right-click it >
     **Extract All**. You get a folder called `servly-app` (`.env` included).

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
- **Keep GitHub up to date:** after saving changes (a "commit"), send them to GitHub with
  ```bash
  git push
  ```
  or ask Claude to "commit and push to GitHub".
- **Make a fresh backup zip** after big changes: ask Claude to "make a new backup on the external drive".
- GitHub's **free** plan is enough: private repositories cost nothing.
