import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Avatar, Button, SectionLabel } from '@/components/ui';
import { colors, radius } from '@/constants/theme';
import {
  connectionsWithStatus,
  findByUsername,
  normalizeUsername,
  searchOrgmates,
  sharedOrgs,
} from '@/lib/selectors';
import {
  acceptConnection,
  ME,
  removeConnection,
  requestConnection,
  useAppState,
} from '@/lib/store';
import type { User } from '@/lib/types';

export default function PeopleScreen() {
  const state = useAppState();
  const [query, setQuery] = useState('');
  const me = state.users[ME];

  const orgmates = searchOrgmates(state, query);
  const q = normalizeUsername(query);
  const connections = connectionsWithStatus(state, 'connected').filter(
    (user) =>
      sharedOrgs(state, user.id).length === 0 &&
      (!q || user.name.toLowerCase().includes(q) || user.username.includes(q)),
  );
  const incoming = connectionsWithStatus(state, 'incoming');
  const outgoing = connectionsWithStatus(state, 'outgoing');
  const usernameMatch = findByUsername(state, query);
  const showUsernameMatch =
    usernameMatch &&
    sharedOrgs(state, usernameMatch.id).length === 0 &&
    state.connections[usernameMatch.id] !== 'connected';

  const openChat = (user: User) =>
    router.replace({ pathname: '/chat/[id]', params: { id: user.id } });

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.search}>
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search by name or @username"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.searchInput}
        />
      </View>
      <Text style={styles.hint}>
        Your username is <Text style={styles.handle}>@{me.username}</Text>. People outside your orgs
        can only find you by it, and you approve who can message you.
      </Text>

      {q.length > 0 && showUsernameMatch && (
        <>
          <SectionLabel>Username match</SectionLabel>
          <UsernameCard user={usernameMatch} status={state.connections[usernameMatch.id]} />
        </>
      )}
      {q.length > 1 && !usernameMatch && orgmates.length === 0 && connections.length === 0 && (
        <Text style={styles.noMatch}>
          Nobody in your orgs matches that, and no one has the username @{q}.
        </Text>
      )}

      {incoming.length > 0 && !q && (
        <>
          <SectionLabel>Requests</SectionLabel>
          {incoming.map((user) => (
            <View key={user.id} style={styles.row}>
              <Avatar name={user.name} />
              <View style={styles.rowBody}>
                <Text style={styles.name}>{user.name}</Text>
                <Text style={styles.sub}>@{user.username} wants to connect</Text>
              </View>
              <Pressable
                onPress={() => removeConnection(user.id)}
                hitSlop={8}
                accessibilityLabel={`Decline ${user.name}`}>
                <Ionicons name="close-circle-outline" size={30} color={colors.textMuted} />
              </Pressable>
              <Pressable
                onPress={() => acceptConnection(user.id)}
                hitSlop={8}
                accessibilityLabel={`Accept ${user.name}`}>
                <Ionicons name="checkmark-circle" size={30} color={colors.success} />
              </Pressable>
            </View>
          ))}
        </>
      )}

      {orgmates.length > 0 && (
        <>
          <SectionLabel>People in your orgs</SectionLabel>
          {orgmates.map((user) => (
            <PersonRow
              key={user.id}
              user={user}
              subtitle={sharedOrgs(state, user.id)
                .map((org) => org.name)
                .join(', ')}
              onPress={() => openChat(user)}
            />
          ))}
        </>
      )}

      {connections.length > 0 && (
        <>
          <SectionLabel>Connections</SectionLabel>
          {connections.map((user) => (
            <PersonRow
              key={user.id}
              user={user}
              subtitle={`@${user.username}`}
              onPress={() => openChat(user)}
            />
          ))}
        </>
      )}

      {outgoing.length > 0 && !q && (
        <>
          <SectionLabel>Sent requests</SectionLabel>
          {outgoing.map((user) => (
            <View key={user.id} style={styles.row}>
              <Avatar name={user.name} />
              <View style={styles.rowBody}>
                <Text style={styles.name}>{user.name}</Text>
                <Text style={styles.sub}>@{user.username} · Pending</Text>
              </View>
              <Pressable onPress={() => removeConnection(user.id)} hitSlop={8}>
                <Text style={styles.cancel}>Cancel</Text>
              </Pressable>
            </View>
          ))}
        </>
      )}
    </ScrollView>
  );
}

function PersonRow({ user, subtitle, onPress }: { user: User; subtitle: string; onPress: () => void }) {
  return (
    <Pressable style={({ pressed }) => [styles.row, pressed && styles.pressed]} onPress={onPress}>
      <Avatar name={user.name} />
      <View style={styles.rowBody}>
        <Text style={styles.name}>{user.name}</Text>
        <Text style={styles.sub} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
      <Ionicons name="chatbubble-outline" size={20} color={colors.primary} />
    </Pressable>
  );
}

function UsernameCard({ user, status }: { user: User; status: string | undefined }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <Avatar name={user.name} size={52} />
        <View style={styles.rowBody}>
          <Text style={styles.name}>{user.name}</Text>
          <Text style={styles.sub}>@{user.username}</Text>
        </View>
      </View>
      {status === 'outgoing' ? (
        <Text style={styles.pending}>Request sent. You can chat once they accept.</Text>
      ) : status === 'incoming' ? (
        <Button label="Accept request" icon="checkmark" onPress={() => acceptConnection(user.id)} />
      ) : (
        <>
          <Text style={styles.sub}>
            You don&apos;t share any orgs. Send a request and they&apos;ll need to approve it before
            you can chat.
          </Text>
          <Button
            label="Send connection request"
            icon="person-add-outline"
            onPress={() => requestConnection(user.id)}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
  },
  hint: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 10,
  },
  handle: {
    color: colors.primary,
    fontWeight: '700',
  },
  noMatch: {
    color: colors.textMuted,
    fontSize: 15,
    textAlign: 'center',
    marginTop: 32,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  pressed: {
    opacity: 0.7,
  },
  rowBody: {
    flex: 1,
    gap: 2,
  },
  name: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  sub: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 19,
  },
  cancel: {
    color: colors.primary,
    fontWeight: '700',
  },
  card: {
    gap: 12,
    padding: 16,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pending: {
    color: colors.text,
    fontWeight: '600',
  },
});
