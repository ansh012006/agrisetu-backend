# AgriSetu Backend (Android-scoped rebuild)

A Node.js/Express/MongoDB backend, rebuilt to exactly match what the AgriSetu Android app calls.

## Read this first — what this is and isn't

**This is not a restoration of your original, larger backend.** That project (built across many
earlier sessions) had 140+ files covering marketplace, machinery rental, government schemes,
admin/officer dashboards, and more. This sandbox session started fresh with none of those files
present, and reconstructing all of that from memory risked being both incomplete and
inconsistent with whatever you'd actually built and modified since.

Instead, this is a **complete, real backend scoped precisely to the 6 modules the Android app
actually calls**: Auth, Land, Disease Detection, Mandi Prices, Coupons/Subsidy, Weather. Every
endpoint, every request/response field, was hand-checked against the Android app's actual Kotlin
model classes (`AuthResponse`, `DiseaseAnalysisResponse`, `MyLimitsResponse`, etc.) and
`ApiService.kt` — they should match exactly.

## Verification status — please read before assuming this "just works"

- **Full syntax check**: all 33 `.js` files pass `node --check`, run twice across two rounds of
  edits.
- **Full import/export cross-check**: every internal `import`/`export` between files resolves
  correctly, checked programmatically.
- **Field-by-field response shape check**: every controller's JSON response was manually compared
  against the Android app's data models. This caught two real bugs before delivery — one was a
  bad dynamic re-import, the other more serious: `generateCoupon` was returning `land` as a raw
  unpopulated MongoDB ID (a string) where the Android app's `Coupon` model expects a `{landName}`
  object — that would have thrown a JSON parsing crash the instant someone generated a coupon.
  Both fixed.

**What I could NOT verify**: this specific sandbox session hit a network restriction blocking
*all* npm package installs (not just Google's package — even unrelated ones like `bcryptjs`
failed with the same error), so **the server has never actually been booted, and never
connected to your real MongoDB cluster, in this environment.** That's a meaningfully lower bar
of confidence than "syntax-checked" — it's the difference between a spell-checked essay and one
someone has actually read start to finish. Your own machine won't have this restriction, but you
are genuinely the first one to run this end-to-end.

## Setup

```bash
cd backend
npm install
```

Your real credentials are already filled into `.env` (not committed anywhere — it's just a local
file). If `npm install` fails on your machine too, that's a different, real problem worth
investigating (proxy/firewall, npm registry access) — see the troubleshooting we already worked
through for Android Studio's Gradle downloads, since it can be the same root cause (a network
that blocks certain external domains).

```bash
npm run dev
```

Watch for:
```
[MongoDB] Connected: ...
[Server] Running on port 5000 in development mode
```

If you see a MongoDB connection error instead, double check the `MONGO_URI` in `.env` — in
particular, that your current IP is whitelisted in MongoDB Atlas under Network Access (a past
issue in this conversation).

### Optional: seed sample subsidy rules so Coupons has something to match

```bash
npm run seed:input-rules
```

Seeds 8 land-proportional rules (Urea/DAP for Wheat, Rice, Cotton, Sugarcane, Maize, Potato)
using real ICAR-recommended dosage-per-hectare figures — the same ones from earlier in this
build. Try generating a coupon for "Urea", category "fertilizer", crop "Wheat" on a farmer
account with land on file.

### Optional: create an admin account

```bash
npm run seed:admin
```
Creates `admin@agrisetu.local` / `AdminPass123` — not actually needed for anything in this
reduced-scope backend (no admin-only routes exist here), but harmless to have.

## Endpoints (exactly matching the Android app)

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/api/auth/register` | Public | farmer/buyer/dealer/machinery_owner only |
| POST | `/api/auth/login` | Public | |
| GET | `/api/auth/me` | JWT | |
| GET | `/api/lands` | JWT, farmer | |
| POST | `/api/lands` | JWT, farmer | not called by the app yet, included for completeness |
| POST | `/api/disease/analyze` | JWT, farmer | multipart field name: `cropImage` |
| GET | `/api/disease/history` | JWT, farmer | |
| GET | `/api/mandi/prices` | JWT, farmer | `?commodity=&state=&district=` |
| GET | `/api/coupons/mine` | JWT, farmer | `?status=` |
| GET | `/api/coupons/my-limits` | JWT, farmer | the land-proportional entitlement summary |
| POST | `/api/coupons` | JWT, farmer | `{landId, product, productCategory, quantityValue, crop?}` |
| GET | `/api/weather` | JWT, farmer | `?lat=&lng=` |

## What's deliberately not here

Marketplace, machinery rental, government schemes content, input rates beyond mandi, admin/
officer dashboards, notifications. None of these are called by the current Android app. Adding
them back follows the exact same pattern already established: a model in `models/`, a controller
in `controllers/`, a route in `routes/` mounted in `server.js`, and — if the Android app needs to
call it too — a matching endpoint added to `ApiService.kt` on the Android side.

## The Gemini key format note

Your `.env` has a key starting with `AQ.Ab...`, not the older `AIzaSy...` format. This is
correct — Google began issuing this new format in mid-2026 (after my training cutoff, which is
why I initially and wrongly questioned it earlier in this conversation). `utils/gemini.js` passes
the key straight to the official `@google/generative-ai` SDK with no format validation of its
own, so both key formats work identically here.
