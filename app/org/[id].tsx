import { router, Stack, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { ChatThread } from '@/components/ChatThread';
import { Button, EmptyState, HeaderButton, OrgBadge } from '@/components/ui';
import { colors } from '@/constants/theme';
import { useNow } from '@/hooks/useNow';
import { isMember, isPollOpen, leadingOption } from '@/lib/selectors';
import { joinOrg, useAppState } from '@/lib/store';

export default function OrgScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const state = useAppState();
  const now = useNow();
  const org = state.orgs.find((candidate) => candidate.id === id);

  if (!org) {
    return <EmptyState icon="people-outline" title="Org not found" />;
  }

  if (isMember(org)) {
    return (
      <>
        <Stack.Screen
          options={{
            title: `${org.emoji} ${org.name}`,
            headerRight: () => (
              <HeaderButton
                icon="calendar-outline"
                label={`${org.name} events`}
                onPress={() =>
                  router.navigate({ pathname: '/events', params: { scope: 'mine', org: org.id } })
                }
              />
            ),
          }}
        />
        <ChatThread threadId={`org:${org.id}`} showSenderNames emptyTitle={`Welcome to ${org.name}`} />
      </>
    );
  }

  const upcoming = state.events.filter(
    (event) =>
      event.orgId === org.id && (isPollOpen(event, now) || leadingOption(event).startsAt >= now),
  ).length;

  return (
    <>
      <Stack.Screen options={{ title: '' }} />
      <ScrollView contentContainerStyle={styles.about}>
        <OrgBadge emoji={org.emoji} color={org.color} size={88} />
        <Text style={styles.name}>{org.name}</Text>
        <Text style={styles.description}>{org.description}</Text>
        <Text style={styles.stats}>
          {org.memberIds.length} members · {upcoming} upcoming {upcoming === 1 ? 'event' : 'events'}
        </Text>
        <View style={styles.actions}>
          <Button label={`Join ${org.name}`} icon="add" onPress={() => joinOrg(org.id)} />
          <Button
            label="See events"
            variant="secondary"
            onPress={() =>
              router.navigate({ pathname: '/events', params: { scope: 'university', org: org.id } })
            }
          />
        </View>
        <Text style={styles.note}>
          Joining lets you chat with the group, vote on event dates, and message other members
          directly.
        </Text>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  about: {
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingVertical: 24,
    gap: 10,
  },
  name: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 8,
  },
  description: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 23,
    textAlign: 'center',
  },
  stats: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  actions: {
    alignSelf: 'stretch',
    gap: 10,
    marginTop: 16,
  },
  note: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginTop: 8,
  },
});
