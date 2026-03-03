import { Amplify } from 'aws-amplify';
import outputs from '../../amplify_outputs.json';

type GoogleOAuthChecks = {
  configured?: boolean;
  requiredEnvValues?: string[];
  requiredSecretNames?: string[];
  missingValues?: string[];
};

type OutputShape = {
  auth?: {
    oauth?: {
      identity_providers?: string[];
    };
  };
  data?: Record<string, unknown>;
  storage?: Record<string, unknown>;
  custom?: {
    deploymentChecks?: {
      requiredOutputs?: string[];
      auth?: {
        googleOAuth?: GoogleOAuthChecks;
      };
    };
  };
};

export const amplifyOutputs = outputs as OutputShape;

export const requiredAmplifyOutputs =
  amplifyOutputs.custom?.deploymentChecks?.requiredOutputs ?? ['auth', 'data', 'storage'];

export const missingAmplifyOutputs = requiredAmplifyOutputs.filter((outputName) => {
  if (outputName === 'auth') {
    return !amplifyOutputs.auth;
  }
  if (outputName === 'data') {
    return !amplifyOutputs.data;
  }
  if (outputName === 'storage') {
    return !amplifyOutputs.storage;
  }
  return false;
});

export const isAmplifyConfigured =
  missingAmplifyOutputs.length === 0;

export const isGoogleSignInConfigured = Boolean(
  amplifyOutputs.auth?.oauth?.identity_providers?.includes('GOOGLE'),
);

const googleOAuthChecks = amplifyOutputs.custom?.deploymentChecks?.auth?.googleOAuth;
const defaultGoogleOAuthEnvValues = [
  'GOOGLE_OAUTH_ENABLED=true',
  'GOOGLE_OAUTH_CALLBACK_URLS',
  'GOOGLE_OAUTH_LOGOUT_URLS',
];

export const googleOAuthMissingValues =
  googleOAuthChecks?.missingValues && googleOAuthChecks.missingValues.length > 0
    ? googleOAuthChecks.missingValues
    : defaultGoogleOAuthEnvValues;

export const googleOAuthRequiredSecrets = googleOAuthChecks?.requiredSecretNames ?? [
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
];

if (isAmplifyConfigured) {
  Amplify.configure(outputs);
}
