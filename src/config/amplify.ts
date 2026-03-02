import { Amplify } from 'aws-amplify';
import outputs from '../../amplify_outputs.json';

type OutputShape = {
  auth?: {
    oauth?: {
      identity_providers?: string[];
    };
  };
  data?: Record<string, unknown>;
  storage?: Record<string, unknown>;
};

export const amplifyOutputs = outputs as OutputShape;

export const isAmplifyConfigured =
  Boolean(amplifyOutputs.auth) &&
  Boolean(amplifyOutputs.data) &&
  Boolean(amplifyOutputs.storage);

export const isGoogleSignInConfigured = Boolean(
  amplifyOutputs.auth?.oauth?.identity_providers?.includes('GOOGLE'),
);

if (isAmplifyConfigured) {
  Amplify.configure(outputs);
}
