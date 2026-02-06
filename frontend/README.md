# MusicGenerator frontend

Next.js app for the MusicGenerator SaaS. Handles auth, billing, song creation, playback, and admin tools.

## Deployment

### Environment variables

See `.env.example` in the repo root for the complete list. At minimum you need:

- `DATABASE_URL`
- `MODAL_KEY`, `MODAL_SECRET`
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY_ID`, `AWS_REGION`, `S3_BUCKET_NAME`
- `GENERATE_FROM_DESCRIPTION`, `GENERATE_FROM_DESCRIBED_LYRICS`, `GENERATE_WITH_LYRICS`
- `BETTER_AUTH_SECRET`
- `POLAR_ACCESS_TOKEN`, `POLAR_WEBHOOK_SECRET`

### Steps

1. Push the database schema:

   ```bash
   pnpm install
   pnpm db:push
   ```

2. Deploy the Next.js app (e.g. to Vercel) with the env vars above.

3. Deploy the Modal backend (see root `README.md`) and paste the generated endpoint URLs into your frontend `.env`.

4. Configure Polar products (matching the product IDs in `src/lib/auth.ts`) and point Polar webhooks to your deployed `/api/auth` route.

5. Start Inngest in your deployment platform or via their cloud offering.

Once deployed, new users can sign up on the marketing homepage, receive free credits, and upgrade via Polar checkout to unlock higher tiers and more credits.
