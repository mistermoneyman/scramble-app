import { Stack, useLocalSearchParams } from 'expo-router';

import { ChatThread } from '@/components/ChatThread';
import { EmptyState } from '@/components/ui';
import { firstName } from '@/lib/format';
import { canMessage } from '@/lib/selectors';
import { useAppState } from '@/lib/store';

export default function DirectChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const state = useAppState();
  const user = state.users[id];

  if (!user) {
    return <EmptyState icon="person-outline" title="Person not found" />;
  }

  return (
    <>
      <Stack.Screen options={{ title: user.name }} />
      {canMessage(state, user.id) ? (
        <ChatThread threadId={`dm:${user.id}`} emptyTitle={`Start a chat with ${firstName(user.name)}`} />
      ) : (
        <EmptyState
          icon="lock-closed-outline"
          title={`You can't message ${firstName(user.name)} yet`}
          body={
            state.connections[user.id] === 'outgoing'
              ? 'Your request is pending. You can chat once they accept.'
              : 'Send them a connection request from New message using their username.'
          }
        />
      )}
    </>
  );
}
