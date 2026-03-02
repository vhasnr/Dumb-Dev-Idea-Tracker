# Dumb Dev Idea Tracker

React + AWS Amplify (Gen 2) foundation for a dark-themed idea board:

- Public users can read ideas and comments.
- Authenticated users can sign up/sign in, create ideas, comment, and vote.
- Ideas support `open`, `in progress`, `closed` states.
- Idea descriptions and comments use markdown editor with live preview.
- Image upload is supported inside markdown via Amplify Storage.
- UI is built with AWS Cloudscape components for consistent AWS styling.

## Tech stack

- React + TypeScript + Vite
- AWS Amplify Gen 2 (`auth`, `data`, `storage`)
- Cloudscape Design System
- Amplify UI Authenticator
- `@uiw/react-md-editor` for markdown editing

## Backend resources

Defined in `amplify/`:

- `auth`: email/password auth (email verification enabled by Cognito defaults).
- `data`: `Idea`, `Comment`, `Vote` models.
  - Public read via API key.
  - Owner-based write controls for authenticated users.
- `storage`: `public/*` path with guest read + authenticated read/write/delete.

## Google login visibility

Google login is **conditionally enabled**:

- Backend only configures Google OAuth if these env vars are present:
  - `GOOGLE_CLIENT_ID_SECRET_NAME`
  - `GOOGLE_CLIENT_SECRET_SECRET_NAME`
- Frontend only shows the Google button when Amplify outputs include `GOOGLE` as an identity provider.

Use `.env.example` as the template.

## Getting started

1. Install dependencies:

   ```bash
   npm install
   ```

2. (Optional) configure Google OAuth env vars:

   ```bash
   cp .env.example .env
   ```

3. Start Amplify sandbox (generates `amplify_outputs.json`):

   ```bash
   npm run sandbox
   ```

4. In another terminal, run the frontend:

   ```bash
   npm run dev
   ```

## Notes

- `amplify_outputs.json` is committed as a placeholder and is replaced by sandbox/deployed outputs.
- For production usage, update callback/logout URLs for your real domains.
