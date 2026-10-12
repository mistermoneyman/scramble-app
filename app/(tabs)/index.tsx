import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar, Button, EmptyState } from '@/components/ui';
import { colors, radius } from '@/constants/theme';
import { useNow } from '@/hooks/useNow';
import { formatRelative } from '@/lib/format';
import { connectionsWithStatus, directThreads } from '@/lib/selectors';
import { ME, useAppState } from '@/lib/store';

export default function ChatsScreen() {
  const state = useAppState();
  const now = useNow();
  const threads = directThreads(state);
  const requests = connectionsWithStatus(state, 'incoming');

  return (
    <FlatList
      data={threads}
      keyExtractor={(thread) => thread.user.id}
      contentContainerStyle={styles.list}
      ListHeaderComponent={
        requests.length > 0 ? (
          <Pressable style={styles.requests} onPress={() => router.push('/people')}>
            <Ionicons name="person-add-outline" size={20} color={colors.primary} />
            <Text style={styles.requestsText}>
              {requests.length === 1
                ? `${requests[0].name} wants to connect`
                : `${requests.length} people want to connect`}
            </Text>
            <Ionicons name="chevron-forward" size={18} color={colors.primary} />
          </Pressable>
        ) : null
      }
      ListEmptyComponent={
        <EmptyState
          icon="chatbubble-ellipses-outline"
          title="No conversations yet"
          body="Message anyone in your orgs, or add someone by their username.">
          <Button label="Find people" icon="search" onPress={() => router.push('/people')} />
        </EmptyState>
      }
      renderItem={({ item }) => (
        <Pressable
          style={({ pressed }) => [styles.row, pressed && styles.pressed]}
          onPress={() => router.push({ pathname: '/chat/[id]', params: { id: item.user.id } })}>
          <Avatar name={item.user.name} size={50} />
          <View style={styles.rowBody}>
            <View style={styles.rowTop}>
              <Text style={styles.name} numberOfLines={1}>
                {item.user.name}
              </Text>
              <Text style={styles.time}>{formatRelative(item.last.sentAt, now)}</Text>
            </View>
            <Text style={styles.preview} numberOfLines={1}>
              {item.last.senderId === ME ? 'You: ' : ''}
              {item.last.text}
            </Text>
          </View>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    flexGrow: 1,
  },
  requests: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    marginBottom: 8,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
  },
  requestsText: {
    flex: 1,
    color: colors.primary,
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  pressed: {
    opacity: 0.7,
  },
  rowBody: {
    flex: 1,
    gap: 3,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  time: {
    color: colors.textMuted,
    fontSize: 13,
  },
  preview: {
    color: colors.textMuted,
    fontSize: 15,
  },
});
