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

- Backend only configures Google OAuth when these Amplify branch env values are set:
  - `GOOGLE_OAUTH_ENABLED=true`
  - `GOOGLE_OAUTH_CALLBACK_URLS` (comma-separated URLs)
  - `GOOGLE_OAUTH_LOGOUT_URLS` (comma-separated URLs)
- Optional env values:
  - `GOOGLE_OAUTH_DOMAIN_PREFIX`
  - `GOOGLE_CLIENT_ID_SECRET_NAME` (defaults to `GOOGLE_CLIENT_ID`)
  - `GOOGLE_CLIENT_SECRET_SECRET_NAME` (defaults to `GOOGLE_CLIENT_SECRET`)
- Required Amplify secure store secrets (default names):
  - `GOOGLE_CLIENT_ID`
  - `GOOGLE_CLIENT_SECRET`
- Frontend only shows the Google button when Amplify outputs include `GOOGLE` as an identity provider.
- Landing page reports missing values when Google setup is incomplete.

## Getting started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start Amplify sandbox (generates `amplify_outputs.json`):

   ```bash
   npm run sandbox
   ```

3. In another terminal, run the frontend:

   ```bash
   npm run dev
   ```

## Notes

- `amplify_outputs.json` is committed as a placeholder and is replaced by sandbox/deployed outputs.
- For production usage, update callback/logout URLs for your real domains.
- Deployment should use Amplify branch environment variables and Amplify secure store for required values.
- `amplify.yml` is included and required for Amplify Hosting to run `ampx pipeline-deploy` (backend + frontend deploy).
