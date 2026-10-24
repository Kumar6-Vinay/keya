# Keya (MVP)

A learning town for CBSE Classes 1 to 3: maths for every class, and English for Class 1. Children help the townspeople by doing maths inside four short games, guided by Keya the myna, in Hindi or English. The town grows as skills are mastered. Built from the design plan's MVP scope (section 10).

| Game | Class · NCERT chapter | Skills |
| --- | --- | --- |
| Sabzi Cart | 1 · Joyful Mathematics: Mango Treat†, Vegetable Farm†, How Many?† | Count to 10, to 20 with a bundle of 10, more and less |
| Laddoo Box | 1 · Joyful Mathematics: Making 10, How Many?†, Lina's Family† | Number bonds to 10, add and take away within 10 and 20 |
| Find the Furry Cat | 1 · Joyful Mathematics: Finding the Furry Cat!, Utsav† | Position words, naming shapes, shapes around us |
| Rangoli Patterns | 1 · Joyful Mathematics: Utsav† | Continue patterns, find the mistake |
| Sound Garden | 1 · Mridang (English), all units | First sounds, letters and sounds, first letter of a word |
| Cap Seller's Caps | 1 · Mridang: The Cap Seller and the Monkeys, A Farm | Read and build 3-letter words |
| Listen and Tap | 1 · Mridang: Two Little Hands, Greetings, A Farm, The Food We Eat, The Four Seasons | Book words, short sentences, sight words |
| Bead Mala | 2 · Joyful Mathematics, Fun with Numbers | Make, read and compare 2-digit numbers |
| Fair Stall | 2 · Joyful Mathematics, Fun at the Fair | Add prices (without and with carrying); give change |
| Fair Share | 3 · Maths Mela, Fair Share | Share equally; remainders; halves and quarters |
| House of Hundreds | 3 · Maths Mela, House of Hundreds I and II | 3-digit place value; add and subtract with trading |

## Run

```bash
npm install
npm run dev          # http://localhost:5173
npm test             # engine, learner model, session and report tests
npm run build        # installable offline app in dist/
npm run build:preview  # one self-contained HTML file in dist-preview/ (no offline support)
```

## Deploy (free)

Cloudflare Pages: connect the repo, build command `npm run build`, output folder `dist`. The app is static; it works without any backend, keeping everything on the phone.

## Optional cloud backup (Supabase)

1. Create a Supabase project in the Mumbai region.
2. Run `supabase/schema.sql` in the SQL editor. Each family can only read its own rows (row-level security). Optionally schedule the 90-day attempt clean-up shown at the end of the file.
3. Enable email sign-in (one-time code) under Authentication.
4. Copy `.env.example` to `.env` and fill in the project URL and anon key, then build.

With the keys set, the parent area shows "Cloud backup": email code sign-in, "Back up now" and "Delete cloud copy". Without them it says backup isn't available and nothing leaves the phone.

## How it is built

```
src/engine/   pure logic, unit-tested
  skills.ts     12 skills, their chapters, parent and child wording, what grows in the town
  items.ts      rule-based item generators (no answer repeats in a session), checks, mistake detection, hints, Hindi + English prompts
  column.ts     column add/subtract for 2–3 digits, checked one column at a time
  learner.ts    knowledge tracing; states not started → learning → practised → mastered → secure; reviews at 2/7/21/60 days; misconceptions
  session.ts    one play session: warm-up reviews, adaptive steps, mastery check (3 fresh items, no help), time limit
src/ui/       Preact screens: Keya, games, play loop, parent area, cloud backup
src/store.ts  local storage, weekly report, 90-day pruning
src/sync.ts   optional Supabase backup over its REST API
supabase/     database schema with row-level security
```

Teaching rules that are enforced in code:

- Mistakes raise the hint level only up to 3 (picture aid, then a worked step). The answer for a step (level 4) appears only when the child presses Help.
- After 3 tries the answer is shown and play moves on. There is no "game over", timer or lives.
- Two misses in a row give an easier step; three unaided successes give a harder one.
- Mastery needs a passed check of 3 fresh items with no help, and a high estimated probability. "Secure" needs passed reviews days later. Heavy help on a mastered skill moves it back down.
- No points, coins, stars, streaks or error buzzer. Progress is shown as the town growing and a skill book.
- Answer timing is used only within a session and is not stored.

## Needs a teacher's review

- Chapters marked † (topic inferred from a story title).
- Every Hindi line, especially shape words (गोला, तिकोना, चौकोर, आयत) and the Class 1 instructions.
- The English word lists, sentences and sight words against the Mridang book.

## Not done yet

- **Recorded letter sounds.** Phone speech cannot say a single sound like /k/, so Keya teaches sounds through words ("cat starts with c"). Put recordings in `public/audio/` when you have them.
- **Recorded voice.** Keya uses the phone's built-in speech for now. Hindi speech needs a Hindi voice on the phone. Every line is also shown as text.
- **Verifiable parental consent** (DPDP Rule 10, from about May 2027). Today it is a recorded tick box behind a parent PIN.
- **Teacher review** of every item, hint and Hindi line, and of the chapter mappings.
- **Cloud backup** is written against Supabase's documented REST API, but it hasn't been tested against a live project.
- **Classes 1, 4 and 5**, and the shapes, measurement, patterns and data games (release 2).
- **Play Store** packaging; the pilot measures (pre-test and delayed test screens).
- **Fonts** load from Google Fonts on first use. The offline build caches them after that.
# keya
# keya
