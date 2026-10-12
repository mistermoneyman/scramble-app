import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, EmptyState, OrgBadge, SectionLabel } from '@/components/ui';
import { colors, radius } from '@/constants/theme';
import { useNow } from '@/hooks/useNow';
import { confirm } from '@/lib/confirm';
import { firstName, formatCountdown, formatDateTime, formatDay, formatTime } from '@/lib/format';
import { isMember, isPollOpen, leadingOption, voteCount } from '@/lib/selectors';
import { closePoll, ME, toggleVote, useAppState } from '@/lib/store';

export default function EventScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const state = useAppState();
  const now = useNow(1000);
  const event = state.events.find((candidate) => candidate.id === id);
  const org = event && state.orgs.find((candidate) => candidate.id === event.orgId);

  if (!event || !org) {
    return <EmptyState icon="calendar-outline" title="Event not found" />;
  }

  const open = isPollOpen(event, now);
  const member = isMember(org);
  const leader = leadingOption(event);
  const maxVotes = Math.max(1, ...event.options.map((option) => voteCount(event, option.id)));
  const options = [...event.options].sort((a, b) => a.startsAt - b.startsAt);
  const creator = state.users[event.creatorId];
  const isCreator = event.creatorId === ME;

  const closeNow = () =>
    confirm(
      'Close the poll now?',
      `${formatDateTime(leader.startsAt)} has the most votes and will be locked in.`,
      'Close poll',
      () => closePoll(event.id),
    );

  return (
    <>
      <Stack.Screen options={{ title: '' }} />
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable
          style={styles.orgRow}
          onPress={() => router.push({ pathname: '/org/[id]', params: { id: org.id } })}>
          <OrgBadge emoji={org.emoji} color={org.color} size={24} />
          <Text style={styles.orgName}>{org.name}</Text>
        </Pressable>
        <Text style={styles.title}>{event.title}</Text>
        {!!event.description && <Text style={styles.description}>{event.description}</Text>}
        <Text style={styles.creator}>
          Started by {event.creatorId === ME ? 'you' : (creator?.name ?? 'someone')}
        </Text>

        {open ? (
          <View style={[styles.banner, styles.bannerOpen]}>
            <Ionicons name="time-outline" size={22} color={colors.text} />
            <View style={styles.bannerBody}>
              <Text style={styles.bannerTitle}>
                Poll closes in {formatCountdown(event.pollClosesAt - now)}
              </Text>
              <Text style={styles.bannerText}>
                {member
                  ? 'Tap every time that works for you. The top pick gets locked in when the poll closes.'
                  : `Join ${org.name} to vote on a date.`}
              </Text>
            </View>
          </View>
        ) : (
          <View style={[styles.banner, styles.bannerConfirmed]}>
            <Ionicons name="checkmark-circle" size={26} color={colors.success} />
            <View style={styles.bannerBody}>
              <Text style={styles.bannerLabel}>It&apos;s happening</Text>
              <Text style={styles.confirmedDate}>{formatDay(leader.startsAt)}</Text>
              <Text style={styles.confirmedTime}>{formatTime(leader.startsAt)}</Text>
            </View>
          </View>
        )}

        <SectionLabel>{open ? 'Pick your dates' : 'Final results'}</SectionLabel>
        {options.map((option) => {
          const voters = event.votes[option.id] ?? [];
          const mine = voters.includes(ME);
          const count = voters.length;
          const winning = !open && option.id === leader.id;
          const canVote = open && member;
          return (
            <Pressable
              key={option.id}
              disabled={!canVote}
              onPress={() => toggleVote(event.id, option.id)}
              style={({ pressed }) => [
                styles.option,
                mine && styles.optionMine,
                winning && styles.optionWinning,
                pressed && styles.pressed,
              ]}>
              {canVote && (
                <Ionicons
                  name={mine ? 'checkbox' : 'square-outline'}
                  size={24}
                  color={mine ? colors.primary : colors.textMuted}
                />
              )}
              {winning && <Ionicons name="trophy" size={22} color={colors.success} />}
              <View style={styles.optionBody}>
                <View style={styles.optionTop}>
                  <Text style={styles.optionDate}>{formatDay(option.startsAt)}</Text>
                  <Text style={styles.optionTime}>{formatTime(option.startsAt)}</Text>
                  <Text style={styles.optionCount}>
                    {count} {count === 1 ? 'vote' : 'votes'}
                  </Text>
                </View>
                <View style={styles.track}>
                  <View
                    style={[
                      styles.fill,
                      { width: `${(count / maxVotes) * 100}%` },
                      winning && styles.fillWinning,
                    ]}
                  />
                </View>
                {count > 0 && (
                  <Text style={styles.voters} numberOfLines={1}>
                    {voters
                      .map((voterId) =>
                        voterId === ME ? 'You' : firstName(state.users[voterId]?.name ?? '?'),
                      )
                      .join(', ')}
                  </Text>
                )}
              </View>
            </Pressable>
          );
        })}

        {open && isCreator && (
          <Button
            label="Close poll and lock in top date"
            variant="secondary"
            icon="lock-closed-outline"
            onPress={closeNow}
            style={styles.close}
          />
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  orgRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
  },
  orgName: {
    color: colors.textMuted,
    fontWeight: '700',
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '800',
    marginTop: 10,
  },
  description: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 23,
    marginTop: 8,
  },
  creator: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 8,
  },
  banner: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderRadius: radius.lg,
    marginTop: 20,
  },
  bannerOpen: {
    backgroundColor: colors.accentSoft,
  },
  bannerConfirmed: {
    backgroundColor: colors.successSoft,
  },
  bannerBody: {
    flex: 1,
    gap: 4,
  },
  bannerTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
  },
  bannerText: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  bannerLabel: {
    color: colors.success,
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  confirmedDate: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
  },
  confirmedTime: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '600',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    marginBottom: 10,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  optionMine: {
    borderColor: colors.primary,
  },
  optionWinning: {
    borderColor: colors.success,
  },
  pressed: {
    opacity: 0.8,
  },
  optionBody: {
    flex: 1,
    gap: 6,
  },
  optionTop: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  optionDate: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  optionTime: {
    flex: 1,
    color: colors.textMuted,
    fontSize: 15,
  },
  optionCount: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.surfaceMuted,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: colors.accent,
  },
  fillWinning: {
    backgroundColor: colors.success,
  },
  voters: {
    color: colors.textMuted,
    fontSize: 12,
  },
  close: {
    marginTop: 10,
  },
});
