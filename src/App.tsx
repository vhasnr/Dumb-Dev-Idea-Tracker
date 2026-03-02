import { useCallback, useEffect, useMemo, useState } from 'react';
import { Authenticator, useAuthenticator } from '@aws-amplify/ui-react';
import type { AuthUser } from 'aws-amplify/auth';
import { generateClient } from 'aws-amplify/data';
import { uploadData } from 'aws-amplify/storage';
import {
  Alert,
  Badge,
  Box,
  Button,
  ColumnLayout,
  Container,
  ContentLayout,
  Flashbar,
  FormField,
  Header,
  Input,
  Modal,
  Select,
  SpaceBetween,
  Spinner,
  StatusIndicator,
  type FlashbarProps,
} from '@cloudscape-design/components';
import type { SelectProps } from '@cloudscape-design/components';
import { MarkdownEditorField } from './components/MarkdownEditorField';
import { MarkdownView } from './components/MarkdownView';
import { isAmplifyConfigured, isGoogleSignInConfigured } from './config/amplify';
import type { Schema } from '../amplify/data/resource';
import './App.css';

const client = generateClient<Schema>();

const IDEA_STATUS_OPTIONS: ReadonlyArray<SelectProps.Option> = [
  { label: 'Open', value: 'OPEN' },
  { label: 'In progress', value: 'IN_PROGRESS' },
  { label: 'Closed', value: 'CLOSED' },
];

const statusLabelMap: Record<IdeaStatus, string> = {
  OPEN: 'Open',
  IN_PROGRESS: 'In progress',
  CLOSED: 'Closed',
};

type IdeaStatus = 'OPEN' | 'IN_PROGRESS' | 'CLOSED';
type VoteValue = 'UP' | 'DOWN';
type IdeaRecord = Schema['Idea']['type'];
type CommentRecord = Schema['Comment']['type'];
type VoteRecord = Schema['Vote']['type'];

type IdeaViewModel = {
  idea: IdeaRecord;
  comments: CommentRecord[];
  upvotes: number;
  downvotes: number;
  currentUserVote?: VoteValue;
  currentUserVoteId?: string;
};

const formatDate = (timestamp?: string | null) => {
  if (!timestamp) {
    return 'just now';
  }

  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return 'just now';
  }

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

const normalizeFileName = (fileName: string) =>
  fileName.trim().replaceAll(/\s+/g, '-').replaceAll(/[^A-Za-z0-9_.-]/g, '');

const getDisplayName = (user?: AuthUser) =>
  user?.signInDetails?.loginId ?? user?.username ?? 'Unknown user';

const isOwner = (itemOwner: string | null | undefined, userSub: string | undefined) =>
  Boolean(itemOwner && userSub && itemOwner.split('::')[0] === userSub);

function IdeaTrackerApp() {
  const { authStatus, user, signOut } = useAuthenticator((context) => [
    context.authStatus,
    context.user,
  ]);

  const [ideas, setIdeas] = useState<IdeaViewModel[]>([]);
  const [isLoadingIdeas, setIsLoadingIdeas] = useState(false);
  const [ideasError, setIdeasError] = useState<string | null>(null);

  const [ideaName, setIdeaName] = useState('');
  const [ideaDescription, setIdeaDescription] = useState('');
  const [isCreatingIdea, setIsCreatingIdea] = useState(false);
  const [ideaFormError, setIdeaFormError] = useState<string | null>(null);

  const [submittingCommentIdeaId, setSubmittingCommentIdeaId] = useState<string | null>(
    null,
  );
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [commentErrorByIdea, setCommentErrorByIdea] = useState<Record<string, string>>(
    {},
  );
  const [isUpdatingStatusIdeaId, setIsUpdatingStatusIdeaId] = useState<string | null>(
    null,
  );
  const [isUpdatingVoteIdeaId, setIsUpdatingVoteIdeaId] = useState<string | null>(null);

  const [authModalVisible, setAuthModalVisible] = useState(false);
  const [authInitialState, setAuthInitialState] = useState<'signIn' | 'signUp'>('signIn');

  const [flashItems, setFlashItems] = useState<FlashbarProps.MessageDefinition[]>([]);

  const isSignedIn = authStatus === 'authenticated' && Boolean(user);
  const userSub = user?.userId;
  const userName = getDisplayName(user);

  const pushFlash = useCallback(
    (type: FlashbarProps.Type, content: string) => {
      const id = crypto.randomUUID();
      const flashItem: FlashbarProps.MessageDefinition = {
        id,
        type,
        content,
        dismissible: true,
        onDismiss: () => {
          setFlashItems((current) => current.filter((item) => item.id !== id));
        },
      };
      setFlashItems((current) => [...current, flashItem]);
    },
    [setFlashItems],
  );

  const loadIdeas = useCallback(async () => {
    if (!isAmplifyConfigured) {
      return;
    }

    setIsLoadingIdeas(true);
    setIdeasError(null);

    try {
      const [ideaResult, commentResult, voteResult] = await Promise.all([
        client.models.Idea.list({ limit: 500, authMode: 'apiKey' }),
        client.models.Comment.list({ limit: 1500, authMode: 'apiKey' }),
        client.models.Vote.list({ limit: 1500, authMode: 'apiKey' }),
      ]);

      const allErrors = [
        ...(ideaResult.errors ?? []),
        ...(commentResult.errors ?? []),
        ...(voteResult.errors ?? []),
      ];

      if (allErrors.length) {
        throw new Error(allErrors.map((error) => error.message).join('; '));
      }

      const commentsByIdea = new Map<string, CommentRecord[]>();
      for (const comment of commentResult.data) {
        if (!commentsByIdea.has(comment.ideaId)) {
          commentsByIdea.set(comment.ideaId, []);
        }
        commentsByIdea.get(comment.ideaId)?.push(comment);
      }

      const votesByIdea = new Map<string, VoteRecord[]>();
      for (const vote of voteResult.data) {
        if (!votesByIdea.has(vote.ideaId)) {
          votesByIdea.set(vote.ideaId, []);
        }
        votesByIdea.get(vote.ideaId)?.push(vote);
      }

      const sortedIdeas = ideaResult.data
        .slice()
        .sort(
          (left, right) =>
            new Date(right.createdAt ?? 0).getTime() -
            new Date(left.createdAt ?? 0).getTime(),
        );

      const viewModel: IdeaViewModel[] = sortedIdeas.map((idea) => {
        const comments =
          commentsByIdea
            .get(idea.id)
            ?.slice()
            .sort(
              (left, right) =>
                new Date(left.createdAt ?? 0).getTime() -
                new Date(right.createdAt ?? 0).getTime(),
            ) ?? [];

        const votes = votesByIdea.get(idea.id) ?? [];
        const upvotes = votes.filter((vote) => vote.value === 'UP').length;
        const downvotes = votes.filter((vote) => vote.value === 'DOWN').length;
        const currentUserVote = votes.find((vote) => vote.voterSub === userSub);

        return {
          idea,
          comments,
          upvotes,
          downvotes,
          currentUserVote: currentUserVote?.value as VoteValue | undefined,
          currentUserVoteId: currentUserVote?.id,
        };
      });

      setIdeas(viewModel);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load ideas.';
      setIdeasError(message);
    } finally {
      setIsLoadingIdeas(false);
    }
  }, [userSub]);

  useEffect(() => {
    void loadIdeas();
  }, [loadIdeas]);

  useEffect(() => {
    if (isSignedIn) {
      setAuthModalVisible(false);
    }
  }, [isSignedIn]);

  const uploadMarkdownImage = useCallback(
    async (file: File) => {
      if (!isSignedIn) {
        throw new Error('Sign in to upload images.');
      }

      const sanitizedFileName = normalizeFileName(file.name) || 'image';
      const path = `public/uploads/${crypto.randomUUID()}-${sanitizedFileName}`;

      await uploadData({
        path,
        data: file,
        options: {
          contentType: file.type || 'application/octet-stream',
        },
      }).result;

      return `amplify://${path}`;
    },
    [isSignedIn],
  );

  const createIdea = useCallback(async () => {
    if (!isSignedIn || !userSub) {
      pushFlash('error', 'Sign in before creating ideas.');
      return;
    }

    const trimmedName = ideaName.trim();
    const trimmedDescription = ideaDescription.trim();
    if (!trimmedName || !trimmedDescription) {
      setIdeaFormError('Idea name and description are required.');
      return;
    }

    setIdeaFormError(null);
    setIsCreatingIdea(true);
    try {
      const { errors } = await client.models.Idea.create({
        name: trimmedName,
        description: trimmedDescription,
        status: 'OPEN',
        author: userName,
        authorSub: userSub,
      });

      if (errors?.length) {
        throw new Error(errors.map((error) => error.message).join('; '));
      }

      setIdeaName('');
      setIdeaDescription('');
      pushFlash('success', 'Idea posted.');
      await loadIdeas();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to create idea right now.';
      setIdeaFormError(message);
    } finally {
      setIsCreatingIdea(false);
    }
  }, [ideaDescription, ideaName, isSignedIn, loadIdeas, pushFlash, userName, userSub]);

  const changeIdeaStatus = useCallback(
    async (idea: IdeaRecord, nextStatus: IdeaStatus) => {
      if (!isSignedIn) {
        pushFlash('error', 'Sign in before updating idea status.');
        return;
      }

      setIsUpdatingStatusIdeaId(idea.id);
      try {
        const { errors } = await client.models.Idea.update({
          id: idea.id,
          status: nextStatus,
        });

        if (errors?.length) {
          throw new Error(errors.map((error) => error.message).join('; '));
        }

        await loadIdeas();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unable to update idea status.';
        pushFlash('error', message);
      } finally {
        setIsUpdatingStatusIdeaId(null);
      }
    },
    [isSignedIn, loadIdeas, pushFlash],
  );

  const voteOnIdea = useCallback(
    async (ideaItem: IdeaViewModel, voteValue: VoteValue) => {
      if (!isSignedIn || !userSub) {
        pushFlash('error', 'Sign in before voting.');
        return;
      }

      setIsUpdatingVoteIdeaId(ideaItem.idea.id);
      try {
        if (ideaItem.currentUserVoteId) {
          if (ideaItem.currentUserVote === voteValue) {
            const { errors } = await client.models.Vote.delete({
              id: ideaItem.currentUserVoteId,
            });
            if (errors?.length) {
              throw new Error(errors.map((error) => error.message).join('; '));
            }
          } else {
            const { errors } = await client.models.Vote.update({
              id: ideaItem.currentUserVoteId,
              value: voteValue,
            });
            if (errors?.length) {
              throw new Error(errors.map((error) => error.message).join('; '));
            }
          }
        } else {
          const { errors } = await client.models.Vote.create({
            ideaId: ideaItem.idea.id,
            value: voteValue,
            voterSub: userSub,
          });
          if (errors?.length) {
            throw new Error(errors.map((error) => error.message).join('; '));
          }
        }

        await loadIdeas();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to save vote.';
        pushFlash('error', message);
      } finally {
        setIsUpdatingVoteIdeaId(null);
      }
    },
    [isSignedIn, loadIdeas, pushFlash, userSub],
  );

  const submitComment = useCallback(
    async (ideaId: string) => {
      if (!isSignedIn || !userSub) {
        pushFlash('error', 'Sign in before commenting.');
        return;
      }

      const content = commentDrafts[ideaId]?.trim() ?? '';
      if (!content) {
        setCommentErrorByIdea((current) => ({
          ...current,
          [ideaId]: 'Comment cannot be empty.',
        }));
        return;
      }

      setCommentErrorByIdea((current) => ({
        ...current,
        [ideaId]: '',
      }));
      setSubmittingCommentIdeaId(ideaId);

      try {
        const { errors } = await client.models.Comment.create({
          ideaId,
          content,
          author: userName,
          authorSub: userSub,
        });

        if (errors?.length) {
          throw new Error(errors.map((error) => error.message).join('; '));
        }

        setCommentDrafts((current) => ({
          ...current,
          [ideaId]: '',
        }));
        await loadIdeas();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unable to submit comment right now.';
        setCommentErrorByIdea((current) => ({
          ...current,
          [ideaId]: message,
        }));
      } finally {
        setSubmittingCommentIdeaId(null);
      }
    },
    [commentDrafts, isSignedIn, loadIdeas, pushFlash, userName, userSub],
  );

  const authModalHeader = useMemo(
    () => (authInitialState === 'signUp' ? 'Create account' : 'Sign in'),
    [authInitialState],
  );

  return (
    <main className="app-root awsui-dark-mode">
      <ContentLayout
        header={
          <Header
            variant="h1"
            description="Public board for ideas and discussion. Sign in to post, comment, and vote."
            actions={
              isSignedIn ? (
                <SpaceBetween direction="horizontal" size="xs">
                  <Badge color="green">{userName}</Badge>
                  <Button onClick={() => void signOut()}>Sign out</Button>
                </SpaceBetween>
              ) : (
                <SpaceBetween direction="horizontal" size="xs">
                  <Button
                    onClick={() => {
                      setAuthInitialState('signIn');
                      setAuthModalVisible(true);
                    }}
                  >
                    Sign in
                  </Button>
                  <Button
                    variant="primary"
                    onClick={() => {
                      setAuthInitialState('signUp');
                      setAuthModalVisible(true);
                    }}
                  >
                    Create account
                  </Button>
                </SpaceBetween>
              )
            }
          >
            Dumb Dev Idea Tracker
          </Header>
        }
      >
        <SpaceBetween size="l">
          {flashItems.length > 0 && <Flashbar items={flashItems} />}

          {!isAmplifyConfigured && (
            <Alert type="warning" header="Amplify backend outputs are missing">
              Run <strong>npm run sandbox</strong> first so the app can connect to Auth,
              Data, and Storage.
            </Alert>
          )}

          <Container
            header={
              <Header
                variant="h2"
                description="Name + markdown description with optional image upload."
              >
                Post a new idea
              </Header>
            }
          >
            {isSignedIn ? (
              <SpaceBetween size="m">
                <FormField label="Idea name" errorText={ideaFormError ?? undefined}>
                  <Input
                    value={ideaName}
                    onChange={({ detail }) => setIdeaName(detail.value)}
                    placeholder="Short idea title"
                  />
                </FormField>
                <MarkdownEditorField
                  label="Description"
                  value={ideaDescription}
                  onChange={setIdeaDescription}
                  onUploadImage={uploadMarkdownImage}
                  onUploadError={(message) => pushFlash('error', message)}
                  placeholder="Describe the problem, expected behavior, and proposed solution..."
                  errorText={ideaFormError ?? undefined}
                />
                <Button
                  variant="primary"
                  loading={isCreatingIdea}
                  onClick={() => void createIdea()}
                >
                  Create idea
                </Button>
              </SpaceBetween>
            ) : (
              <Alert type="info" header="Authentication required">
                Sign in to create ideas, comment, and vote. Guests can still browse all
                ideas and discussions.
              </Alert>
            )}
          </Container>

          <Header variant="h2" counter={`(${ideas.length})`}>
            Idea board
          </Header>

          {isLoadingIdeas && (
            <Box textAlign="center" padding="l">
              <Spinner />
            </Box>
          )}

          {ideasError && (
            <Alert type="error" header="Could not load idea board">
              {ideasError}
            </Alert>
          )}

          {!isLoadingIdeas &&
            !ideasError &&
            ideas.map((ideaItem) => {
              const status = (ideaItem.idea.status ?? 'OPEN') as IdeaStatus;
              const canEditStatus = isOwner(ideaItem.idea.owner, userSub);

              return (
                <Container
                  key={ideaItem.idea.id}
                  header={
                    <Header
                      variant="h3"
                      description={`Posted by ${ideaItem.idea.author} • ${formatDate(
                        ideaItem.idea.createdAt,
                      )}`}
                    >
                      {ideaItem.idea.name}
                    </Header>
                  }
                >
                  <SpaceBetween size="m">
                    <ColumnLayout columns={2}>
                      <SpaceBetween size="xs">
                        <Box variant="awsui-key-label">Status</Box>
                        {canEditStatus ? (
                          <Select
                            selectedOption={
                              IDEA_STATUS_OPTIONS.find(
                                (option) => option.value === status,
                              ) ?? null
                            }
                            options={IDEA_STATUS_OPTIONS}
                            onChange={({ detail }) => {
                              const selected = detail.selectedOption.value as
                                | IdeaStatus
                                | undefined;
                              if (selected) {
                                void changeIdeaStatus(ideaItem.idea, selected);
                              }
                            }}
                            disabled={isUpdatingStatusIdeaId === ideaItem.idea.id}
                          />
                        ) : (
                          <StatusIndicator
                            type={
                              status === 'OPEN'
                                ? 'in-progress'
                                : status === 'IN_PROGRESS'
                                  ? 'warning'
                                  : 'success'
                            }
                          >
                            {statusLabelMap[status]}
                          </StatusIndicator>
                        )}
                      </SpaceBetween>
                      <SpaceBetween size="xs">
                        <Box variant="awsui-key-label">Votes</Box>
                        <SpaceBetween direction="horizontal" size="xs">
                          <Button
                            iconName="thumbs-up"
                            variant={
                              ideaItem.currentUserVote === 'UP' ? 'primary' : 'normal'
                            }
                            disabled={!isSignedIn || isUpdatingVoteIdeaId === ideaItem.idea.id}
                            onClick={() => void voteOnIdea(ideaItem, 'UP')}
                          >
                            {ideaItem.upvotes}
                          </Button>
                          <Button
                            iconName="thumbs-down"
                            variant={
                              ideaItem.currentUserVote === 'DOWN' ? 'primary' : 'normal'
                            }
                            disabled={!isSignedIn || isUpdatingVoteIdeaId === ideaItem.idea.id}
                            onClick={() => void voteOnIdea(ideaItem, 'DOWN')}
                          >
                            {ideaItem.downvotes}
                          </Button>
                        </SpaceBetween>
                      </SpaceBetween>
                    </ColumnLayout>

                    <Box variant="awsui-key-label">Description</Box>
                    <MarkdownView content={ideaItem.idea.description} />

                    <Container
                      header={
                        <Header
                          variant="h3"
                          counter={`(${ideaItem.comments.length})`}
                          description="Threaded discussion in markdown."
                        >
                          Discussion
                        </Header>
                      }
                    >
                      <SpaceBetween size="m">
                        {ideaItem.comments.length === 0 ? (
                          <Box color="text-status-inactive">No comments yet.</Box>
                        ) : (
                          ideaItem.comments.map((comment) => (
                            <div className="comment-card" key={comment.id}>
                              <SpaceBetween size="xs">
                                <Box variant="small">
                                  <strong>{comment.author}</strong> •{' '}
                                  {formatDate(comment.createdAt)}
                                </Box>
                                <MarkdownView content={comment.content} />
                              </SpaceBetween>
                            </div>
                          ))
                        )}

                        {isSignedIn ? (
                          <SpaceBetween size="s">
                            <MarkdownEditorField
                              label="Add comment"
                              value={commentDrafts[ideaItem.idea.id] ?? ''}
                              onChange={(nextValue) => {
                                setCommentDrafts((current) => ({
                                  ...current,
                                  [ideaItem.idea.id]: nextValue,
                                }));
                              }}
                              onUploadImage={uploadMarkdownImage}
                              onUploadError={(message) => pushFlash('error', message)}
                              placeholder="Write your comment in markdown..."
                              errorText={commentErrorByIdea[ideaItem.idea.id]}
                            />
                            <Button
                              loading={submittingCommentIdeaId === ideaItem.idea.id}
                              onClick={() => void submitComment(ideaItem.idea.id)}
                            >
                              Add comment
                            </Button>
                          </SpaceBetween>
                        ) : (
                          <Alert type="info">
                            Sign in to join the discussion on this idea.
                          </Alert>
                        )}
                      </SpaceBetween>
                    </Container>
                  </SpaceBetween>
                </Container>
              );
            })}
        </SpaceBetween>
      </ContentLayout>

      <Modal
        visible={authModalVisible && !isSignedIn}
        size="medium"
        closeAriaLabel="Close authentication modal"
        onDismiss={() => setAuthModalVisible(false)}
        header={authModalHeader}
      >
        <SpaceBetween size="s">
          {!isGoogleSignInConfigured && (
            <Alert type="info">
              Google sign-in appears automatically after Google OAuth provider settings are
              configured in Amplify Auth outputs.
            </Alert>
          )}
          <div className="auth-modal-body">
            <Authenticator
              initialState={authInitialState}
              socialProviders={isGoogleSignInConfigured ? ['google'] : undefined}
            >
              {() => <></>}
            </Authenticator>
          </div>
        </SpaceBetween>
      </Modal>
    </main>
  );
}

export default function App() {
  return (
    <Authenticator.Provider>
      <IdeaTrackerApp />
    </Authenticator.Provider>
  );
}
