# Servly "Coming soon" website (servlyag.com until launch)

Built 2026-11-16. **Not online yet.** Nothing here is switched on until you follow the steps below.

## What it is
A small public website, separate from the Servly app:
- **Home page:** the harbour hero with the gold sun and flag ribbon, "Whatever you need, someone's ready.",
  "Coming soon to Antigua and Barbuda", and a sign-up form: name, WhatsApp number or email, customer or business,
  and a consent box. Sign-ups are saved in Supabase (`launch_signups`, database v38).
- **Run a business?** button: WhatsApp (if a number is set) or email.
- **Terms, Privacy, Refunds, Plans and pricing, Contact us:** the same text as the app (`src/lib/legal.ts`), so
  visitors and ACB can read them without a password.

The Servly app itself stays private on its own Netlify site (startling-crumble-f0ead8.netlify.app) until launch.

## Switching it on (only when you decide, e.g. after meeting ACB)
1. **Supabase > SQL Editor:** run `supabase/upgrade-v38-launch-list.sql`. The result should say `0` sign-ups.
2. **Optional, WhatsApp button:** add a line to `.env`: `COMING_SOON_WHATSAPP=2685551234` (your business
   WhatsApp). Without it, the button says "Email us to get listed".
3. **Build it:** `npm run build:coming-soon` (or ask Claude). It makes the folder `coming-soon/out`.
4. **Netlify > Add new site > Deploy manually:** drag the `coming-soon/out` folder. This makes a NEW site
   (leave its password protection OFF). Open its netlify.app address and try the form once with your own number.
   Then delete that test row in Supabase > Table Editor > `launch_signups`.
5. **Point servlyag.com at it:** in the NEW site, Domain management > Add a domain > `servlyag.com`, and follow
   Netlify's instructions in GoDaddy (DNS). Never add the domain to the private app site before launch.

## Seeing the sign-ups
Supabase > Table Editor > `launch_signups`, or in the SQL Editor:
`select created_at, name, contact, kind, notified_at from public.launch_signups order by created_at desc;`
If someone asks to be removed, delete their row. Fill in `notified_at` when you have sent them the launch notice.

## On launch day (7 January 2027)
1. Remove `servlyag.com` from the coming-soon site, add it to the app site, and make the app site Public.
2. Supabase: Site URL and the `APP_URL` secret become `https://servlyag.com`; `.env` `EXPO_PUBLIC_PAY_URL`
   becomes `https://servlyag.com/pay` (then rebuild the app/website).
3. Send the launch notice to everyone on the list (WhatsApp / email), then fill in `notified_at`.
4. After the notices are sent, the list has done its job: delete it (Privacy Policy: used only for the launch notice).

## Changing the page
Words and design: `coming-soon/index.template.html` (home) and `legal.template.html` (legal pages).
Legal text: `src/lib/legal.ts` (shared with the app). Then rebuild (step 3) and drag the new `out` folder onto the
same Netlify site.
