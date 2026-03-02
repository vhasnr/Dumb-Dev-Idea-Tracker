import { a, defineData, type ClientSchema } from '@aws-amplify/backend';

const schema = a.schema({
  IdeaStatus: a.enum(['OPEN', 'IN_PROGRESS', 'CLOSED']),
  VoteValue: a.enum(['UP', 'DOWN']),
  Idea: a
    .model({
      name: a.string().required(),
      description: a.string().required(),
      status: a.ref('IdeaStatus').required(),
      author: a.string().required(),
      authorSub: a.string().required(),
      comments: a.hasMany('Comment', 'ideaId'),
      votes: a.hasMany('Vote', 'ideaId'),
    })
    .authorization((allow) => [allow.publicApiKey().to(['read']), allow.owner()]),
  Comment: a
    .model({
      ideaId: a.id().required(),
      content: a.string().required(),
      author: a.string().required(),
      authorSub: a.string().required(),
      idea: a.belongsTo('Idea', 'ideaId'),
    })
    .authorization((allow) => [allow.publicApiKey().to(['read']), allow.owner()]),
  Vote: a
    .model({
      ideaId: a.id().required(),
      value: a.ref('VoteValue').required(),
      voterSub: a.string().required(),
      idea: a.belongsTo('Idea', 'ideaId'),
    })
    .authorization((allow) => [allow.publicApiKey().to(['read']), allow.owner()]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
    apiKeyAuthorizationMode: {
      expiresInDays: 30,
    },
  },
});
