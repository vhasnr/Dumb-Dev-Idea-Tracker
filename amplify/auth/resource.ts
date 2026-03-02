import { defineAuth, secret } from '@aws-amplify/backend';

const localDevUrl = 'http://localhost:5173/';
const callbackUrls = (process.env.GOOGLE_OAUTH_CALLBACK_URLS ?? localDevUrl)
  .split(',')
  .map((url) => url.trim())
  .filter(Boolean);
const logoutUrls = (process.env.GOOGLE_OAUTH_LOGOUT_URLS ?? localDevUrl)
  .split(',')
  .map((url) => url.trim())
  .filter(Boolean);

const googleClientIdSecretName = process.env.GOOGLE_CLIENT_ID_SECRET_NAME;
const googleClientSecretSecretName = process.env.GOOGLE_CLIENT_SECRET_SECRET_NAME;

const externalProviders =
  googleClientIdSecretName && googleClientSecretSecretName
    ? {
        google: {
          clientId: secret(googleClientIdSecretName),
          clientSecret: secret(googleClientSecretSecretName),
        },
        callbackUrls,
        logoutUrls,
      }
    : undefined;

export const auth = defineAuth({
  loginWith: {
    email: true,
    ...(externalProviders ? { externalProviders } : {}),
  },
});
