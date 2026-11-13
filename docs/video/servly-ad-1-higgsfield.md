# Servly ad 1: "Stop paying to be ignored" (Higgsfield prompts)

> **Now made in code instead (2026-11-09):** `docs/video/code/ad1.html` draws all nine scenes on one 38 s
> timeline (exact Servly colours, real flag ribbon, headlines and card words spelled right, dark-to-bright
> sunrise at scene 4). Record with `node docs/video/code/record-frames.cjs docs/video/code/ad1.html
> docs/video/out/servly-ad-1-full.mp4 38 30 8` from PowerShell (needs Edge and ffmpeg-static via TOOLS_DIR).
> Output: `docs/video/out/` (full video + one clip per scene). Trades shown: hair salons, nail technicians,
> caterers, photographers; never barbers (owner's rule). Captions and the voice are still added in CapCut.
> The Higgsfield prompts below stay as a fallback.

Vertical 9:16, about 38 seconds, 9 scenes. Animation copied from the reference clip (cream background,
pop-in cards, blur-out transitions, typed headline with one coloured word, word-by-word captions), in
Servly's colours. Made 2026-11-09.

How to make it:
1. In Higgsfield, make one clip per scene: paste the STYLE BLOCK, then that scene's prompt. 9:16, 5 seconds.
   If Higgsfield offers image-to-video, make one still first and start every clip from it, so they match.
2. AI video misspells words, so the prompts ask for NO text. Add the headline and captions in CapCut
   (Text > headline at the top; Auto captions for the word-by-word captions, highlight colour Servly blue).
3. Record the voice (you, Yonnie) reading the script below, or use CapCut's voice tool. Lay it under the clips
   and trim each clip to its line.

---

## STYLE BLOCK (paste at the start of every prompt)

Vertical 9:16 motion-graphics explainer, flat 2D product-demo style. Deep harbour-navy background, slightly
darker towards the bottom, with a large warm golden-yellow sun glowing in the top-right corner with a few
soft rays, and faint thin horizontal sea lines near the bottom. Clean rounded white cards and pill-shaped
search bars with soft dark drop shadows that pop off the navy; simple thin line-art icons in navy. Accents:
bright royal blue for icons and pins, golden yellow for highlights, outlines and glows. Elements pop in one
after another with a gentle scale-up and tiny overshoot, then settle and float very slightly. Camera locked,
very slow push-in. At the end of the clip the whole frame softly gaussian-blurs and fades out. Bold,
confident, premium, minimal. Leave the top quarter (except the sun) and the bottom fifth of the frame empty
for titles and captions. All cards are blank: no writing, no words, no letters, no numbers, no codes,
icons only. No logos, no real brand names, no human faces, no stripes or bands along the edges.

(Test 1, 2026-11-09, Kling: the look was right, but it printed the colour code "FCD111" as words on the card
and drew the flag stripe in the wrong colours. So this block has no colour codes and no stripe. Add the flag
ribbon afterwards in CapCut as a picture: docs/video/refs/servly-flag-ribbon.png.)

(Style B "harbour night", chosen by the owner 2026-11-09. Reference pictures to upload in Higgsfield are
BACKGROUND ONLY, so each scene's prompt decides what appears, and the sun "rises" through the ad (a quiet
before/after story; same background throughout so it feels like one story):
- scenes 1-3 (the problem): docs/video/refs/servly-bg-1-early-sun-scenes-1-3.png (sun just peeking in the corner)
- scenes 4-9 (Servly): docs/video/refs/servly-bg-2-full-sun-scenes-4-9.png (full bright sun)
For scenes 1-3, change "a large warm golden-yellow sun glowing in the top-right corner" in the style block to
"a softer golden sun only peeking in from the top-right corner, partly hidden".
Older style pictures (A, B, B-no-ribbon, C) are in the same folder.)

---

## BEFORE and AFTER style blocks (owner's choice 2026-11-09: these REPLACE the single block above)

The ad gets brighter when Servly arrives: dark night before (the problem), a sunrise at scene 4 (Servly),
a bright airy morning after. Same navy sea at the bottom all the way through, so it still feels like one
story. Brightness reads as "better" without a word, and the change at scene 4 marks the turning point.

**BEFORE block: scenes 1, 2, 3** (reference picture: refs/servly-bg-BEFORE-scenes-1-3.png)

Vertical 9:16 motion-graphics explainer, flat 2D product-demo style. Dark night-time navy background, deeper
towards the bottom, with a dim golden sun only peeking in from the top-right corner, mostly hidden, and faint
thin horizontal sea lines near the bottom. Moody, quiet, a little lonely. Clean rounded white cards and
pill-shaped search bars with soft dark drop shadows that pop off the dark navy; simple thin line-art icons in
navy. Accents: bright royal blue for icons, golden yellow for small highlights. Elements pop in one after
another with a gentle scale-up and tiny overshoot, then settle and float very slightly. Camera locked, very
slow push-in. At the end of the clip the whole frame softly gaussian-blurs and fades out. Leave the top
quarter and the bottom fifth of the frame empty for titles and captions. All cards are blank: no writing, no
words, no letters, no numbers, no codes, icons only. No logos, no real brand names, no human faces, no
stripes or bands along the edges.

**AFTER block: scenes 5 to 9** (reference picture: refs/servly-bg-AFTER-scenes-5-9.png)

Vertical 9:16 motion-graphics explainer, flat 2D product-demo style. Bright, airy morning background: soft
pale sky blue at the top, fading to a clear bright blue in the middle and the deep navy sea at the bottom,
with a large radiant golden-yellow sun high in the top-right corner, a warm glow and long soft rays, and
light sea lines near the bottom. Fresh, hopeful, open. Clean rounded white cards and pill-shaped search bars
with soft drop shadows; simple thin line-art icons in navy. Accents: royal blue for icons and pins, golden
yellow for highlights, outlines and glows. Elements pop in one after another with a gentle scale-up and tiny
overshoot, then settle and float very slightly. Camera locked, very slow push-in. At the end of the clip the
whole frame softly gaussian-blurs and fades out. Leave the top quarter (except the sun) and the bottom fifth
of the frame empty for titles and captions. All cards are blank: no writing, no words, no letters, no
numbers, no codes, icons only. No logos, no real brand names, no human faces, no stripes or bands along the
edges.

**Scene 4 (the sunrise)** uses its own prompt below with NO style block, and the BEFORE picture as the start.

## Scenes

| # | Time | Voice (script) | Headline (add in CapCut; blue word in caps) |
|---|---|---|---|
| 1 | 0-4 s | Run a service business in Antigua or Barbuda? You posted on Facebook today... | Antigua & Barbuda BUSINESSES |
| 2 | 4-9 s | Most posts reach under 5 percent of your followers. To reach the rest, you pay for ads. Again and again. | Under 5% SEE it |
| 3 | 9-13 s | On Google, fewer than 1 in 100 people ever click to page two. | Page 2 = INVISIBLE |
| 4 | 13-16 s | Servly is different. | Meet SERVLY |
| 5 | 16-21 s | People open Servly for one reason: to hire someone, right here at home. | Ready to HIRE |
| 6 | 21-26 s | Search for your service, and your business shows up. No feed, no algorithm burying your posts. | You SHOW UP |
| 7 | 26-30 s | Customers call you, message you, or book you, in one tap. | Call. Message. BOOK. |
| 8 | 30-34 s | Stop paying to be ignored. Get found when locals are ready to hire. | Get FOUND |
| 9 | 34-38 s | I'm Yonnie, and this is Servly. List your business at servlyag.com. | servlyag.COM |

### On-screen words (added in CapCut, never in Higgsfield)

Three layers of words, each with its own job:
1. **Headline** (top quarter): 2-4 words from the table, appearing word by word in time with the voice; the
   key word in Servly blue or gold. Pops in like the cards and blurs out with the scene.
2. **Card words** (on the cards Higgsfield draws): 2-4 words that make the picture's meaning obvious. Add each
   one about 0.3 s after its card lands, with the same small pop, and cut it when the scene blurs out.
3. **Captions** (bottom): CapCut Auto captions, word by word, highlighted word in Servly blue.

Card words per scene (fictional names, no real businesses):
| Scene | Card | Words |
|---|---|---|
| 1 | the post card | Weekend special! Book now |
| 2 | the receipt card | Boost post: $$$ |
| 3 | search bar | hairdresser near me |
| 5 | search bar | photographer |
| 6 | the 3 business cards | Coral Lens · YOUR BUSINESS (the gold one) · Fix-It Pro |
| 7 | under the 3 buttons | Call · Message · Book |
| 8 | notification cards | New message · New booking · New call |
| 9 | under the pin | servlyag.com |

Why: words and pictures together are understood and remembered better than either alone (Mayer, multimedia
learning), but short labels work better than repeating the whole voice-over on screen (Mayer's redundancy
principle). Captions matter because most feed video is watched muted: 69% of people watch with the sound off
in public, and 80% are more likely to finish a video that has captions (Verizon Media and Publicis Media, 2019).

### 1 · The hook
BEFORE BLOCK + A single plain blank white card pops in at the centre, with only a small heart icon and a
paper-plane icon along its bottom edge: no profile picture, no name, no dots, nothing written. A tiny blue
tick appears. The card waits; a faint golden pulse ripples out from it and fades to nothing, as if no one is
there. Then the card slowly fades to a dull grey, as if ignored. Ends with the blur-out.
(Tests 2026-11-09: when the prompt said "social-media post", Kling added a profile dot and a made-up name
"on" with a heart; the version where the card turned grey worked best.)

### 2 · Almost nobody sees it
STYLE BLOCK + A neat grid of 100 small dim white circle avatars pops in row by row. Then only 3 of them light
up in bright gold with a soft glow; the rest stay dim. A small gold coin drops from above into a white card with
a thin receipt that slides out and grows longer. Ends with the blur-out.

### 3 · Page two of search
BEFORE BLOCK + A rounded white search bar pops in near the top with a blue magnifying-glass icon. Below it, a
column of five blank white result cards slides up one by one. The top card gets a warm golden glow. Then the
cards below it turn grey one after another, shrink slightly and slowly sink down out of the bottom of the
frame, as if nobody ever reaches them; only the glowing top card stays. Ends with the blur-out.
(Test 2026-11-09: when scenes 1 and 3 were made in ONE clip, each got only 2.5 seconds and the jump between
them had no blur. Make every scene as its own 5-second clip.)

### 4 · Meet Servly (the sunrise: the turning point)
(No style block; reference/start picture: refs/servly-bg-BEFORE-scenes-1-3.png; end picture, if Higgsfield
offers one: refs/servly-bg-AFTER-scenes-5-9.png.)
Vertical 9:16 flat 2D motion-graphics animation. It starts on a dark night-time navy background with a dim
golden sun peeking from the top-right corner and faint sea lines at the bottom. A large royal-blue map-pin
icon with a white circle in its middle drops from above into the centre, bounces twice and settles with a
soft shadow. As the pin lands, the sun rises fully into the top-right corner, glowing brighter, its rays
spreading, and the whole sky smoothly brightens from dark navy to a bright, airy morning blue, pale at the
top, while the sea at the bottom stays deep navy and catches light. Warm, hopeful, uplifting. Camera locked,
slow gentle push-in. No text, no letters, no logos, no human faces, no stripes along the edges.
(Add the flag ribbon picture under the pin in CapCut.)

### 5 · People ready to hire
STYLE BLOCK + A simple flat white outline map of two Caribbean islands pops in, one above the other: a larger,
rounder island at the bottom (Antigua) and a smaller, narrower island with a long lagoon on its west side at the
top (Barbuda), at their true relative sizes (Barbuda about half Antigua's area). Small blue location pins drop
onto them one after another, five on the bottom island and two on the top one, each with a tiny ripple.
(Owner's change 2026-11-12. The coded version, code/ad1.html, uses the real outlines; only the sea between the
islands is shortened, 41 km drawn as 10 km, so both fit.) A rounded white search bar floats above
the map with a blue magnifying-glass icon and a blinking cursor. Ends with the blur-out.

### 6 · You show up
STYLE BLOCK + A rounded white search bar at the top; below it, a row of white business cards slides in from
the right, each with a small line-art icon (camera, scissors, wrench, paint brush). The second card grows
slightly, gets a glowing gold outline and a small gold dot badge, as if it is the viewer's business. Ends with the
blur-out.

### 7 · One tap
STYLE BLOCK + Three round buttons pop in side by side with a bounce: a blue phone icon, a blue chat-bubble
icon, a blue calendar icon. Each one gets a gentle tap ripple in turn, left to right, and a small green tick
appears above the calendar. Ends with the blur-out.

### 8 · Get found
STYLE BLOCK + A white rounded phone screen in the centre. Small white notification cards slide in from the
top one after another, each with a blue phone or chat icon, stacking neatly, while a soft gold glow grows
behind the phone. Ends with the blur-out.

### 9 · Sign-off
STYLE BLOCK + The blue map-pin icon from scene 4 sits in the centre and gently turns like a coin, its shadow
narrowing and widening underneath. The flag-colour ribbon (blue, white, red, black, gold) draws itself in
beneath it. Leave plenty of empty space below for the web address. Gentle slow fade (no blur) at the very end.

---

## Changes from the owner's first script (and why)

- Facebook/Instagram: "2% to 4%" became "under 5 percent": recent studies put average organic reach around
  1-2% on Facebook and 3-5% on Instagram (Socialinsider), so "under 5%" is true for both.
- Google: "90% scroll past unless top 3" was replaced with "fewer than 1 in 100 people ever click to page
  two" (Backlinko, 4 million results: 0.63%). Accurate and easier to picture.
- Removed "100% of buyers see your listing" and "80%+ chance to be discovered": Servly can't promise those
  (there are no categories yet, and nobody can guarantee who scrolls). Made-up figures in an ad can break
  consumer-protection rules and Servly's own Terms on misleading listings.
- "Zero wasted impressions / every view is a buyer" became "People open Servly for one reason: to hire
  someone": same idea, without a claim we can't prove.
- Added "call, message or book, in one tap": shows what the app actually does.
- Hook for the whole country (owner, 2026-11-09): "Run a service business in Antigua or Barbuda?" calls out
  the viewer by who they are, as a question, so the right people stop scrolling. Other options: "Antigua and
  Barbuda business owners: your posts aren't being seen." / "Hairdressers, photographers, mechanics of
  Antigua and Barbuda: this one's for you." Scene 5 now says "right here at home" (no repeat of the names).
- Hook moved to the first 3 seconds (Meta advises grabbing attention in the first 3 seconds of a video ad).
- Loss framing "Stop paying to be ignored" (people react more strongly to losses than to equal gains:
  Kahneman and Tversky, prospect theory, 1979).
- "Right here in Antigua": local identity builds trust and belonging.
- One clear call to action at the end ("List your business at servlyag.com"): one option gets more action
  than several (choice overload: Iyengar and Lepper, 2000).
- Spoken name is "Servly"; written name "Servly AG" / servlyag.com.
- Optional, only once a promo is switched on: "The first 25 businesses get half price for 2 months"
  (LAUNCH50). Limited places push people to act (scarcity: Cialdini).
