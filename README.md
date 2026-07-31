# codeti-baseball-aggregator

Visits every Baseball Reference player directory (a-z), finds players whose
displayed name contains **exactly three** occurrences of the letter `a`
(case-insensitive), reads the **Frequently Asked Questions** section on each
matching player's page, and aggregates the unique questions — treating a
question as the same one regardless of casing or which player's name appears
in it — together with how many matching players each question appeared on.

## Requirements

- Node.js 20+
- npm

## Install

```bash
npm install
```

## Commands

```bash
npm run start                       # use cached HTML where available, fetch only what's missing
npm run refresh                      # ignore the cache and re-download every page
npm run start -- --allow-partial   # write output even if some player pages failed (see below)
npm test                              # run the test suite (fixtures only, no network access)
npm run typecheck                   # tsc --noEmit
npm run build                         # compile to dist/
```

`npm run start` writes `output/results.json`. By default, a run only writes
output if **every** matching player's page was fetched successfully — if any
page fails after retries, the script prints the failures and exits non-zero
without touching `output/results.json`, so a partial crawl can never
silently produce a result that looks complete but isn't.

Passing `--allow-partial` writes the output anyway, using whichever matching
players' pages were fetched successfully. The file is never silently
partial: `totalPlayers` is still the true count of all name-matching players
(known exactly from directory parsing alone, independent of how many player
pages succeeded), while `complete` and `playersWithFaqData` make explicit
that the `questions` aggregation only covers a subset. See
[Output schema](#output-schema).

## How it works

1. **Directories** — fetches `/players/{a..z}/`, parses each player's
   displayed name, profile URL and player ID from `#div_players_`, and
   de-duplicates by player ID (a player can be cross-listed).
2. **Name filter** — keeps players whose displayed name has exactly three
   case-insensitive occurrences of the letter `a`
   (`David Aardsma` → 4 → excluded, `Tal Abernathy` → 3 → included).
   Only matching players' pages are fetched — the crawl never downloads
   every player page.
3. **FAQ extraction** — for each matching player, loads their page and reads
   the `<h3>` question headings inside `#div_faq` (the "Frequently Asked
   Questions" section). Answers (`<p>`) are ignored. This section is present
   directly in the DOM, not HTML-comment-wrapped, so no headless browser is
   needed.
4. **Normalization** — for each question: collapse whitespace, replace the
   player's exact displayed name with the placeholder `<player>`
   (case-insensitive, whole-name match only — a first name is never replaced
   on its own, so a player like "Will Smith" doesn't corrupt unrelated
   sentences containing "will"), then lowercase. Punctuation is preserved —
   the brief only asks to ignore casing and the player's name, not
   punctuation, so no additional equivalence rules are invented.

   Two name-matching details surfaced by testing against real pages, both
   still squarely inside "ignore the player's actual name":
   - The grammatically correct possessive of a name ending in "s" (e.g.
     "Adams'") and the "'s" form used for other names (e.g. "Acosta's") are
     both normalized to `<player>'s`, otherwise the same conceptual
     question would split into two entries purely because of how one
     player's name happens to end.
   - Name matching is diacritic-insensitive, because the site itself is
     inconsistent: a player's directory listing can render their name
     without an accent (e.g. "Gabe Alvarez") while their own page uses the
     accented form ("Gabe Álvarez"). Diacritics are only stripped for the
     purpose of *finding* the name to redact — the exactly-three-`a`s
     filter still counts letters in the literal directory name.
5. **Aggregation** — for each player, their normalized questions are put in
   a `Set` before counting, so a duplicate question on one player's page
   only increments that question's count once. `playerCount` is therefore
   "number of players this question appeared on," not "number of raw
   occurrences." Players with zero FAQ questions still count toward
   `totalPlayers`.
6. **Output** — questions are sorted alphabetically so the JSON is
   deterministic across runs.

## Caching

Every fetched page (directory and player) is saved under `data/raw/` keyed
by letter or player ID. `npm run start` reads from this cache before
touching the network; `npm run refresh` bypasses it. `data/raw/` is
git-ignored — only the small hand-built fixtures under `tests/fixtures/`
are committed, so tests never make network requests.

## Being polite to the source site

Baseball Reference rate-limits and, under sustained load, presents a
Cloudflare bot challenge (`403` + `cf-mitigated` header) that a plain HTTP
client cannot solve. The fetcher accounts for this:

- A single shared pacing gate (`MIN_REQUEST_INTERVAL_MS`) serializes actual
  request dispatch across all concurrent fetches, regardless of
  `CONCURRENCY`.
- On `429`, it honors `Retry-After` when present, otherwise backs off for
  `RATE_LIMIT_COOLDOWN_MS` — and that cooldown applies to *all* in-flight
  and future requests, not just the one that got rate-limited.
- If a Cloudflare challenge is detected, the crawl stops issuing further
  requests immediately instead of retrying against a block it cannot
  resolve, and reports which players were skipped as a result.
- Each request has both an `AbortController` timeout and an outer hard
  timeout as a second line of defense against a connection that never
  settles.

## Output schema

```json
{
  "generatedAt": "2026-07-30T12:00:00.000Z",
  "source": "https://www.baseball-reference.com/players/",
  "complete": true,
  "totalPlayers": 874,
  "playersWithFaqData": 874,
  "questions": [
    { "question": "how tall was <player>?", "playerCount": 812 },
    { "question": "when was <player> born?", "playerCount": 874 }
  ]
}
```

- `totalPlayers` — count of players whose name has exactly three `a`s. This
  is always exact, since it only requires parsing the 26 directory pages.
- `complete` — `true` only if every one of those players' pages was
  successfully fetched. `false` means the run used `--allow-partial`.
- `playersWithFaqData` — how many players' FAQ questions actually went into
  `questions` below. Equal to `totalPlayers` when `complete` is `true`.
- `questions` — every distinct normalized question, sorted alphabetically,
  with the number of matching players (out of `playersWithFaqData`, not
  necessarily `totalPlayers`) whose FAQ included it.

## Assumptions

- "First and last name" means the full displayed name on the directory page
  (e.g. "Henry Aaron"), used as-is — no attempt is made to guess separate
  first/middle/last components, and accented characters (e.g. `á`) are not
  treated as `a`, per the brief's literal wording.
- Name replacement in a question only matches the player's exact full
  displayed name, not first/last name independently, since FAQ questions on
  Baseball Reference consistently use the full name and a partial match
  risks corrupting unrelated words.
- Only questions are extracted; answers are discarded entirely, as the
  brief asks only for the questions and does not require answers or a
  per-player breakdown in the final output.

## Known limitations

- The crawl needs ~900 HTTP requests (26 directories + one page per
  matching player). The committed `output/results.json` in this repo has
  `complete: false` — during development this IP got flagged by Baseball
  Reference's Cloudflare bot mitigation (a JS challenge a plain HTTP client
  cannot solve) after earlier debugging runs sent far more traffic than the
  task needed. `totalPlayers` (874) is exact; `playersWithFaqData` covers
  the 101 players whose pages were fetched before the block. Re-running
  `npm run start` from a clean, low-volume network resumes from cache and
  only needs to fetch the remaining players.
- FAQ questions are matched by heading position (`#div_faq h3`), not by
  exact question text, so a template change on the site would need the
  selector in `src/playerParser.ts` revisited.

## Tests

`npm test` runs against committed HTML fixtures under `tests/fixtures/` —
no network access required. Coverage focuses on the business rules most
likely to be wrong silently: the exact-three-`a`s filter, question
normalization (casing, whitespace, name replacement, punctuation
preservation), aggregation (per-player dedup, zero-FAQ players, alphabetical
sort), and the directory/FAQ parsers against real page structure (including
a player ID containing a dot, as Baseball Reference occasionally produces
for disambiguated names).
