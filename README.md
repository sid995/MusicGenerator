# MusicGenerator

Full‑stack AI music generation app. The frontend (Next.js) lets users describe a song or provide prompts/lyrics, then queues an asynchronous generation job. The backend runs on Modal with GPUs using the ACE‑Step music model, Qwen LLM for prompt/lyrics generation, and SDXL Turbo for cover art. Final audio and thumbnails are stored on AWS S3. Users authenticate with Better Auth, purchase credits via Polar, and jobs are orchestrated with Inngest.

## Features

- Text‑to‑music generation using ACE‑Step
- Three modes: simple description, prompt + custom lyrics, prompt + described lyrics (auto‑generated lyrics)
- Auto cover art generation (SDXL Turbo)
- Secure storage on AWS S3 with presigned URLs
- Auth via Better Auth (Prisma adapter)
- Credit system and billing via Polar
- Background job orchestration via Inngest
- Postgres via Prisma ORM

## Repository layout

- `backend/`
  - `main.py`: Modal app. Defines GPU image, loads ACE‑Step, Qwen LLM, and SDXL pipeline; exposes FastAPI endpoints for generation; uploads results to S3
  - `requirements.txt`: runtime deps for Modal image
  - `prompts.py`: prompt templates for LLM prompt & lyrics generation
  - `ACE-Step/`: vendored ACE‑Step library (installed inside Modal image)
- `frontend/` (Next.js 15 + React 19 + Tailwind)
  - `src/app/(main)`: main UI (home feed, create flow)
  - `src/actions`: server actions for queueing songs, generating presigned URLs, likes/publish/rename
  - `src/inngest`: Inngest client and `functions.ts` background workflow
  - `src/lib/auth.ts`: Better Auth + Polar integration (checkout, portal, webhooks)
  - `src/server/db.ts`, `prisma/schema.prisma`: Prisma + Postgres models (`User`, `Song`, `Like`, `Category`)
  - `src/env.js`: Zod‑validated env loader (server vars)
  - `start-database.sh`: helper to run a local Postgres in Docker/Podman

## High‑level architecture

1) User creates a song from the UI
2) Frontend writes a `Song` row and enqueues `generate-song-event` (Inngest)
3) Inngest function:
   - verifies user credits
   - selects backend endpoint based on mode
   - calls Modal endpoint with `Modal-Key` and `Modal-Secret`
   - updates `Song` with S3 keys, categories, status; decrements credits on success
4) Audio/cover stored in S3; frontend fetches via presigned URLs

## Tech stack

- Frontend: Next.js 15, React 19, Tailwind, Zustand, Lucide
- Auth & Billing: Better Auth (+ Prisma adapter), Polar checkout/portal/webhooks
- Background jobs: Inngest (Next.js route handler)
- Database: Postgres + Prisma
- Storage: AWS S3 (+ presigned URLs via AWS SDK v3)
- Backend compute: Modal (GPU L40S), ACE‑Step, Qwen2‑7B‑Instruct, SDXL‑Turbo

## Environment variables

All server env vars are validated in `frontend/src/env.js`.

Database & runtime

- `DATABASE_URL`: Postgres connection URL
- `NODE_ENV`: development | test | production

Modal proxy auth (required by backend endpoints)

- `MODAL_KEY`
- `MODAL_SECRET`

AWS & S3

- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY_ID`
- `AWS_REGION`
- `S3_BUCKET_NAME`

Backend endpoints (Modal FastAPI endpoints)

- `GENERATE_FROM_DESCRIPTION` – POST URL to `/generate_from_description`
- `GENERATE_FROM_DESCRIBED_LYRICS` – POST URL to `/generate_with_described_lyrics`
- `GENERATE_WITH_LYRICS` – POST URL to `/generate_with_lyrics`

Auth & Billing

- `BETTER_AUTH_SECRET`
- `POLAR_ACCESS_TOKEN` (use `server: "sandbox"` in development)
- `POLAR_WEBHOOK_SECRET`

### Example `.env` (frontend root)

```bash
DATABASE_URL=postgresql://postgres:password@localhost:5433/music_generator
NODE_ENV=development

MODAL_KEY=your_modal_proxy_key
MODAL_SECRET=your_modal_proxy_secret

AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY_ID=your_secret_key
AWS_REGION=us-east-1
S3_BUCKET_NAME=your-bucket

GENERATE_FROM_DESCRIPTION=https://modal.run/your-endpoint/generate_from_description
GENERATE_FROM_DESCRIBED_LYRICS=https://modal.run/your-endpoint/generate_with_described_lyrics
GENERATE_WITH_LYRICS=https://modal.run/your-endpoint/generate_with_lyrics

BETTER_AUTH_SECRET=supersecret
POLAR_ACCESS_TOKEN=your_polar_sandbox_access_token
POLAR_WEBHOOK_SECRET=whsec_xxx
```

## Local development

Prerequisites

- Node.js 20+, pnpm 9+
- Docker or Podman (for local Postgres)

1. Start Postgres

```bash
cd frontend
cp .env.example .env  # create and edit with your values
```

1. Install deps and generate Prisma client

```bash
pnpm install
pnpm db:push    # or pnpm db:generate; pnpm db:migrate for migrations
```

1. Start Inngest dev server (in a separate terminal)

```bash
pnpm inngest:dev
```

1. Start the Next.js app

```bash
pnpm dev
```

1. Sign up, then purchase credits via Polar checkout (sandbox). On payment `onOrderPaid`, user credits are incremented.

### Backend (Modal) setup

The Modal app is defined in `backend/main.py` and exposes three FastAPI endpoints with `requires_proxy_auth=True`.

Steps (high level):

- Install the Modal CLI and log in
- Create two Modal volumes: `ace-step-models` and `qwen-hf-cache` (auto‑created on first run)
- Create a Modal secret named `music-gen-secret` containing your AWS creds and `S3_BUCKET_NAME`
- Deploy

```bash
cd backend
modal deploy main.py
```

Copy the generated endpoint URLs into the frontend `.env` as the three `GENERATE_*` variables.

## API

All endpoints require headers:

```http
Modal-Key: <MODAL_KEY>
Modal-Secret: <MODAL_SECRET>
Content-Type: application/json
```

Common parameters (optional unless noted):

- `audio_duration` (number, seconds)
- `seed` (number)
- `guidance_scale` (number)
- `infer_step` (number)
- `instrumental` (boolean)

1) POST `GENERATE_FROM_DESCRIPTION`
Request body:

```json
{
  "full_described_song": "Acoustic ballad with warm guitar",
  "instrumental": false,
  "audio_duration": 180,
  "infer_step": 60,
  "guidance_scale": 15,
  "seed": -1
}
```

Response:

```json
{ "s3_key": "<audio>.wav", "cover_image_s3_key": "<image>.png", "categories": ["Pop", "Acoustic"] }
```

1. POST `GENERATE_WITH_LYRICS`
Request body:

```json
{
  "prompt": "melodic techno, minor key, 124 bpm",
  "lyrics": "[verse] ...",
  "instrumental": false
}
```

1. POST `GENERATE_FROM_DESCRIBED_LYRICS`
Request body:

```json
{
  "prompt": "lofi hip hop, chill, 90 bpm",
  "described_lyrics": "sad song about lost love",
  "instrumental": false
}
```

Note: `backend/main.py` also exposes a demo `generate` that returns base64 audio, not used by the frontend.

## Data model (Prisma)

- `User`: auth + `credits`
- `Song`: generation status, S3 keys, metadata, categories, listen/like counts, `published`
- `Like`: many‑to‑many user<->song
- `Category`: tag name linked to songs

## Billing & Credits

- Polar checkout creates orders; on `onOrderPaid`, credits are incremented based on product ID (10/25/50)
- Credits are decremented by 1 for each successful generation

## Notes

- Ensure your S3 bucket policy permits presigned GETs for objects you upload
- The ACE‑Step repo is installed into the Modal image at build time; large model files are cached in volumes

## License

- App code is provided under the repository license
- ACE‑Step and model assets follow their respective licenses; see `backend/ACE-Step/LICENSE`
