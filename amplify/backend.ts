import { defineBackend } from '@aws-amplify/backend';
import { auth, authConfigurationChecks } from './auth/resource';
import { data } from './data/resource';
import { storage } from './storage/resource';

const backend = defineBackend({
  auth,
  data,
  storage,
});

backend.addOutput({
  custom: {
    deploymentChecks: {
      requiredOutputs: ['auth', 'data', 'storage'],
      auth: authConfigurationChecks,
    },
  },
});
