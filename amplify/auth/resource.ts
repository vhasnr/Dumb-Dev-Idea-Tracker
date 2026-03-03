import { defineAuth, secret } from '@aws-amplify/backend';

const parseCsvValue = (value: string | undefined) =>
  value
    ?.split(',')
    .map((entry) => entry.trim())
    .filter(Boolean) ?? [];

const googleOauthEnabled = process.env.GOOGLE_OAUTH_ENABLED === 'true';
const googleCallbackUrls = parseCsvValue(process.env.GOOGLE_OAUTH_CALLBACK_URLS);
const googleLogoutUrls = parseCsvValue(process.env.GOOGLE_OAUTH_LOGOUT_URLS);
const googleDomainPrefix = process.env.GOOGLE_OAUTH_DOMAIN_PREFIX?.trim();

const googleClientIdSecretName = (
  process.env.GOOGLE_CLIENT_ID_SECRET_NAME ?? 'GOOGLE_CLIENT_ID'
).trim();
const googleClientSecretSecretName = (
  process.env.GOOGLE_CLIENT_SECRET_SECRET_NAME ?? 'GOOGLE_CLIENT_SECRET'
).trim();

const googleMissingValues: string[] = [];
if (!googleOauthEnabled) {
  googleMissingValues.push('GOOGLE_OAUTH_ENABLED=true');
}
if (!googleCallbackUrls.length) {
  googleMissingValues.push('GOOGLE_OAUTH_CALLBACK_URLS');
}
if (!googleLogoutUrls.length) {
  googleMissingValues.push('GOOGLE_OAUTH_LOGOUT_URLS');
}

const googleOauthConfigured =
  googleOauthEnabled && googleCallbackUrls.length > 0 && googleLogoutUrls.length > 0;

const externalProviders = googleOauthConfigured
  ? {
      google: {
        clientId: secret(googleClientIdSecretName),
        clientSecret: secret(googleClientSecretSecretName),
      },
      callbackUrls: googleCallbackUrls,
      logoutUrls: googleLogoutUrls,
      ...(googleDomainPrefix ? { domainPrefix: googleDomainPrefix } : {}),
    }
  : undefined;

export const authConfigurationChecks = {
  googleOAuth: {
    configured: googleOauthConfigured,
    requiredEnvValues: [
      'GOOGLE_OAUTH_ENABLED=true',
      'GOOGLE_OAUTH_CALLBACK_URLS',
      'GOOGLE_OAUTH_LOGOUT_URLS',
    ],
    requiredSecretNames: [googleClientIdSecretName, googleClientSecretSecretName],
    missingValues: googleOauthConfigured ? [] : googleMissingValues,
  },
};

export const auth = defineAuth({
  loginWith: {
    email: true,
    ...(externalProviders ? { externalProviders } : {}),
  },
});
