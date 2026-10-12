import { router, useLocalSearchParams } from 'expo-router';
import type { ReactNode } from 'react';
import { FlatList, Pressable, ScrollView, SectionList, StyleSheet, Text, View } from 'react-native';

import { EventCard } from '@/components/EventCard';
import { Button, Chip, EmptyState, OrgBadge, Segmented, SectionLabel } from '@/components/ui';
import { colors, radius } from '@/constants/theme';
import { useNow } from '@/hooks/useNow';
import { groupEvents, isMember, myOrgs } from '@/lib/selectors';
import { joinOrg, useAppState } from '@/lib/store';

type Scope = 'mine' | 'university';

const SCOPES: { value: Scope; label: string }[] = [
  { value: 'mine', label: 'My orgs' },
  { value: 'university', label: 'University' },
];

export default function EventsScreen() {
  const params = useLocalSearchParams<{ scope?: string; org?: string }>();
  const scope: Scope = params.scope === 'university' ? 'university' : 'mine';
  const toggle = (
    <Segmented
      options={SCOPES}
      value={scope}
      onChange={(value) => router.setParams({ scope: value, org: undefined })}
    />
  );

  return scope === 'mine' ? (
    <MyEvents toggle={toggle} orgParam={params.org} />
  ) : (
    <JoinableOrgs toggle={toggle} />
  );
}

/** Events only from orgs the user belongs to. */
function MyEvents({ toggle, orgParam }: { toggle: ReactNode; orgParam?: string }) {
  const state = useAppState();
  const now = useNow(1000);
  const orgs = myOrgs(state);
  const orgFilter = orgs.find((org) => org.id === orgParam);
  const visibleOrgIds = new Set(orgFilter ? [orgFilter.id] : orgs.map((org) => org.id));
  const sections = groupEvents(
    state,
    state.events.filter((event) => visibleOrgIds.has(event.orgId)),
    now,
  );

  const openCreate = () =>
    router.push({ pathname: '/event/new', params: orgFilter ? { org: orgFilter.id } : {} });

  return (
    <SectionList
      sections={sections}
      keyExtractor={(event) => event.id}
      contentContainerStyle={styles.list}
      stickySectionHeadersEnabled={false}
      ListHeaderComponent={
        <View>
          {toggle}
          {orgs.length > 0 && (
            <>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.chipScroll}
                contentContainerStyle={styles.chips}>
                <Chip
                  label="All my orgs"
                  selected={!orgFilter}
                  onPress={() => router.setParams({ org: undefined })}
                />
                {orgs.map((org) => (
                  <Chip
                    key={org.id}
                    label={`${org.emoji} ${org.name}`}
                    selected={orgFilter?.id === org.id}
                    onPress={() => router.setParams({ org: org.id })}
                  />
                ))}
              </ScrollView>
              <Button label="Create event" icon="add" onPress={openCreate} style={styles.create} />
            </>
          )}
        </View>
      }
      renderSectionHeader={({ section }) => <SectionLabel>{section.title}</SectionLabel>}
      renderItem={({ item }) => {
        const org = state.orgs.find((candidate) => candidate.id === item.orgId);
        if (!org) return null;
        return (
          <EventCard
            event={item}
            org={org}
            now={now}
            onPress={() => router.push({ pathname: '/event/[id]', params: { id: item.id } })}
          />
        );
      }}
      ListEmptyComponent={
        orgs.length === 0 ? (
          <EmptyState
            icon="people-outline"
            title="Join an org to see its events"
            body="Events only show up for members. Find orgs to join under University.">
            <Button
              label="Browse orgs"
              variant="secondary"
              onPress={() => router.setParams({ scope: 'university' })}
            />
          </EmptyState>
        ) : (
          <EmptyState
            icon="calendar-outline"
            title="No events yet"
            body={
              orgFilter
                ? `${orgFilter.name} doesn't have any events. Start one and let people vote on a date.`
                : 'Create an event and let your org vote on the date that works best.'
            }
          />
        )
      }
    />
  );
}

/** Orgs at the university the user hasn't joined. No event details until they join. */
function JoinableOrgs({ toggle }: { toggle: ReactNode }) {
  const state = useAppState();
  const orgs = state.orgs
    .filter((org) => !isMember(org))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <FlatList
      data={orgs}
      keyExtractor={(org) => org.id}
      contentContainerStyle={styles.list}
      ListHeaderComponent={
        <View>
          {toggle}
          <Text style={styles.intro}>
            Join an org to see its events and vote on dates. They&apos;ll show up under My orgs.
          </Text>
        </View>
      }
      renderItem={({ item: org }) => (
        <Pressable
          style={({ pressed }) => [styles.org, pressed && styles.pressed]}
          onPress={() => router.push({ pathname: '/org/[id]', params: { id: org.id } })}>
          <OrgBadge emoji={org.emoji} color={org.color} size={48} />
          <View style={styles.orgBody}>
            <Text style={styles.orgName} numberOfLines={1}>
              {org.name}
            </Text>
            <Text style={styles.orgDescription} numberOfLines={2}>
              {org.description}
            </Text>
            <Text style={styles.orgMeta}>{org.memberIds.length} members</Text>
          </View>
          <Button label="Join" onPress={() => joinOrg(org.id)} style={styles.join} />
        </Pressable>
      )}
      ListEmptyComponent={
        <EmptyState
          icon="checkmark-circle-outline"
          title="You're in every org"
          body="There's nothing left to join at your university right now."
        />
      }
    />
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    flexGrow: 1,
    backgroundColor: colors.background,
  },
  chipScroll: {
    marginTop: 12,
    marginHorizontal: -16,
  },
  chips: {
    gap: 8,
    paddingHorizontal: 16,
  },
  create: {
    marginTop: 14,
  },
  intro: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 14,
    marginBottom: 6,
  },
  org: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    marginTop: 10,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pressed: {
    opacity: 0.8,
  },
  orgBody: {
    flex: 1,
    gap: 2,
  },
  orgName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  orgDescription: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  orgMeta: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  join: {
    paddingHorizontal: 18,
  },
});
