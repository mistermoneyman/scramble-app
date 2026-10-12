import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { EmptyState, OrgBadge, Pill, Segmented } from '@/components/ui';
import { colors } from '@/constants/theme';
import { useNow } from '@/hooks/useNow';
import { formatRelative } from '@/lib/format';
import { awaitingMySignature } from '@/lib/orgRules';
import { isMember, lastMessage, myOrgs } from '@/lib/selectors';
import { ME, useAppState } from '@/lib/store';

type Scope = 'mine' | 'university';

const SCOPES: { value: Scope; label: string }[] = [
  { value: 'mine', label: 'My orgs' },
  { value: 'university', label: 'University' },
];

export default function OrgsScreen() {
  const state = useAppState();
  const now = useNow();
  const [scope, setScope] = useState<Scope>('mine');
  const signaturesByOrg = new Map<string, number>();
  for (const request of awaitingMySignature(state)) {
    signaturesByOrg.set(request.orgId, (signaturesByOrg.get(request.orgId) ?? 0) + 1);
  }

  const orgs = (scope === 'mine' ? myOrgs(state) : state.orgs)
    .map((org) => ({ org, last: isMember(org) ? lastMessage(state, `org:${org.id}`) : undefined }))
    .sort((a, b) => {
      if (scope === 'mine') return (b.last?.sentAt ?? 0) - (a.last?.sentAt ?? 0);
      return a.org.name.localeCompare(b.org.name);
    });

  return (
    <FlatList
      data={orgs}
      keyExtractor={({ org }) => org.id}
      contentContainerStyle={styles.list}
      ListHeaderComponent={
        <View style={styles.header}>
          <Segmented options={SCOPES} value={scope} onChange={setScope} />
        </View>
      }
      ListEmptyComponent={
        <EmptyState
          icon="people-outline"
          title="You haven't joined any orgs"
          body="Browse everything at your university and join the ones you're part of."
        />
      }
      renderItem={({ item: { org, last } }) => {
        const member = isMember(org);
        const sender = last && (last.senderId === ME ? 'You' : state.users[last.senderId]?.name.split(' ')[0]);
        return (
          <Pressable
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            onPress={() => router.push({ pathname: '/org/[id]', params: { id: org.id } })}>
            <OrgBadge emoji={org.emoji} color={org.color} size={50} />
            <View style={styles.rowBody}>
              <View style={styles.rowTop}>
                <Text style={styles.name} numberOfLines={1}>
                  {org.name}
                </Text>
                {last && <Text style={styles.meta}>{formatRelative(last.sentAt, now)}</Text>}
              </View>
              <Text style={styles.preview} numberOfLines={1}>
                {last ? `${sender}: ${last.text}` : `${org.memberIds.length} members`}
              </Text>
              {(signaturesByOrg.get(org.id) ?? 0) > 0 && (
                <Pill label={`${signaturesByOrg.get(org.id)} to sign`} tone="warning" />
              )}
            </View>
            {!member && (
              <View style={styles.joinHint}>
                <Text style={styles.joinHintText}>Join</Text>
                <Ionicons name="chevron-forward" size={14} color={colors.primary} />
              </View>
            )}
          </Pressable>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    flexGrow: 1,
  },
  header: {
    paddingBottom: 8,
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
  meta: {
    color: colors.textMuted,
    fontSize: 13,
  },
  preview: {
    color: colors.textMuted,
    fontSize: 15,
  },
  joinHint: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  joinHintText: {
    color: colors.primary,
    fontWeight: '700',
  },
});
