import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView, SectionList, StyleSheet, View } from 'react-native';

import { EventCard } from '@/components/EventCard';
import { Button, Chip, EmptyState, Segmented, SectionLabel } from '@/components/ui';
import { colors } from '@/constants/theme';
import { useNow } from '@/hooks/useNow';
import { groupEvents, isMember, myOrgs } from '@/lib/selectors';
import { useAppState } from '@/lib/store';

type Scope = 'mine' | 'university';

const SCOPES: { value: Scope; label: string }[] = [
  { value: 'mine', label: 'My orgs' },
  { value: 'university', label: 'University' },
];

export default function EventsScreen() {
  const state = useAppState();
  const now = useNow(1000);
  const params = useLocalSearchParams<{ scope?: string; org?: string }>();

  const scope: Scope = params.scope === 'university' ? 'university' : 'mine';
  const scopedOrgs = scope === 'mine' ? myOrgs(state) : state.orgs;
  const orgFilter = scopedOrgs.find((org) => org.id === params.org);
  const visibleOrgIds = new Set(orgFilter ? [orgFilter.id] : scopedOrgs.map((org) => org.id));
  const sections = groupEvents(
    state,
    state.events.filter((event) => visibleOrgIds.has(event.orgId)),
    now,
  );
  const canCreate = myOrgs(state).length > 0;

  const openCreate = () =>
    router.push({
      pathname: '/event/new',
      params: orgFilter && isMember(orgFilter) ? { org: orgFilter.id } : {},
    });

  return (
    <SectionList
      sections={sections}
      keyExtractor={(event) => event.id}
      contentContainerStyle={styles.list}
      stickySectionHeadersEnabled={false}
      ListHeaderComponent={
        <View>
          <Segmented
            options={SCOPES}
            value={scope}
            onChange={(value) => router.setParams({ scope: value, org: undefined })}
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chipScroll}
            contentContainerStyle={styles.chips}>
            <Chip
              label={scope === 'mine' ? 'All my orgs' : 'All orgs'}
              selected={!orgFilter}
              onPress={() => router.setParams({ org: undefined })}
            />
            {scopedOrgs.map((org) => (
              <Chip
                key={org.id}
                label={`${org.emoji} ${org.name}`}
                selected={orgFilter?.id === org.id}
                onPress={() => router.setParams({ org: org.id })}
              />
            ))}
          </ScrollView>
          {canCreate && (
            <Button label="Create event" icon="add" onPress={openCreate} style={styles.create} />
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
        <EmptyState
          icon="calendar-outline"
          title="No events yet"
          body={
            orgFilter
              ? `${orgFilter.name} doesn't have any events. Start one and let people vote on a date.`
              : 'Create an event and let your org vote on the date that works best.'
          }
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
});
