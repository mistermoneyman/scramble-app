import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { EditableDetail } from '@/components/EditableDetail';
import { Avatar, Button, EmptyState, OrgBadge, Pill, SectionLabel } from '@/components/ui';
import { colors, radius } from '@/constants/theme';
import { useNow } from '@/hooks/useNow';
import { fitAt, freeMembers, hasAvailability } from '@/lib/availability';
import { confirm } from '@/lib/confirm';
import {
  firstName,
  formatCountdown,
  formatDateTime,
  formatDay,
  formatMoney,
  formatTime,
} from '@/lib/format';
import { orderStatusLabel } from '@/lib/orders';
import { isOfficer, requestStatus } from '@/lib/orgRules';
import { findPartner } from '@/lib/partners';
import { isMember, isPollOpen, leadingOption, voteCount } from '@/lib/selectors';
import {
  closePoll,
  joinOrg,
  ME,
  toggleVote,
  updateEventDetails,
  useAppState,
  voteWhereFree,
} from '@/lib/store';

export default function EventScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const state = useAppState();
  const now = useNow(1000);
  const event = state.events.find((candidate) => candidate.id === id);
  const org = event && state.orgs.find((candidate) => candidate.id === event.orgId);

  if (!event || !org) {
    return <EmptyState icon="calendar-outline" title="Event not found" />;
  }

  if (!isMember(org)) {
    return (
      <EmptyState
        icon="lock-closed-outline"
        title={`Only ${org.name} members can see this`}
        body="Join the org to see its events and vote on dates.">
        <Button
          label={`Join ${org.name}`}
          icon="add"
          onPress={() => joinOrg(org.id)}
        />
      </EmptyState>
    );
  }

  const open = isPollOpen(event, now);
  const member = isMember(org);
  const leader = leadingOption(state, event);
  const maxVotes = Math.max(1, ...event.options.map((option) => voteCount(event, option.id)));
  const options = [...event.options].sort((a, b) => a.startsAt - b.startsAt);
  const creator = state.users[event.creatorId];
  const isCreator = event.creatorId === ME;
  const canEdit = isCreator || isOfficer(org);
  const orders = state.requests.filter((request) => request.eventId === event.id);

  const myWeek = state.availability[ME];
  const knowsMyWeek = hasAvailability(myWeek);
  const fitting = options.filter((option) => fitAt(myWeek, option.startsAt) === 'free');
  const unconfirmed = fitting.filter((option) => !(event.votes[option.id] ?? []).includes(ME));
  const leaderFit = fitAt(myWeek, leader.startsAt);
  const goingToLeader = (event.votes[leader.id] ?? []).includes(ME);

  const vote = (optionId: string, startsAt: number, mine: boolean) => {
    const fit = fitAt(myWeek, startsAt);
    if (mine || fit === 'free' || fit === 'unknown') {
      toggleVote(event.id, optionId);
      return;
    }
    confirm(
      'Can you make it?',
      fit === 'away'
        ? `You marked ${formatDay(startsAt)} as a day you're away.`
        : `${formatDay(startsAt)} at ${formatTime(startsAt)} is outside your usual availability.`,
      'I can make it',
      () => toggleVote(event.id, optionId),
    );
  };

  const closeNow = () =>
    confirm(
      'Close the poll now?',
      `${formatDateTime(leader.startsAt)} has the most votes and will be locked in.`,
      'Close poll',
      () => closePoll(event.id),
    );

  return (
    <>
      <Stack.Screen
        options={{
          title: event.title,
          headerTitleAlign: 'center',
          headerTitle: () => (
            <View style={styles.header}>
              <Text style={styles.title} numberOfLines={1}>
                {event.title}
              </Text>
              <Pressable
                style={styles.orgRow}
                onPress={() => router.push({ pathname: '/org/[id]', params: { id: org.id } })}>
                <OrgBadge emoji={org.emoji} color={org.color} size={14} />
                <Text style={styles.orgName} numberOfLines={1}>
                  {org.name}
                </Text>
              </Pressable>
            </View>
          ),
        }}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.creator}>
          Started by {event.creatorId === ME ? 'you' : (creator?.name ?? 'someone')}
        </Text>

        <EditableDetail
          label="Speaker"
          value={event.speaker}
          canEdit={canEdit}
          placeholder="Name and a line about them"
          addLabel="Add a speaker"
          onSave={(speaker) => updateEventDetails(event.id, { speaker })}>
          <View style={styles.detailCard}>
            <Avatar name={event.speaker ?? ''} size={40} />
            <Text style={styles.speaker}>{event.speaker}</Text>
          </View>
        </EditableDetail>

        <EditableDetail
          label="Description & agenda"
          value={event.description}
          canEdit={canEdit}
          placeholder={'What it is, plus the agenda\ne.g. 6:00 Doors open\n6:15 Pitches\n7:30 Networking'}
          addLabel="Add a description or agenda"
          multiline
          onSave={(description) => updateEventDetails(event.id, { description: description ?? '' })}>
          <View style={styles.detailCard}>
            <Text style={styles.description}>{event.description}</Text>
          </View>
        </EditableDetail>

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
              <Text style={styles.bannerText}>
                {freeMembers(state, org, leader.startsAt).length} of {org.memberIds.length} members
                are usually free then.
              </Text>
            </View>
          </View>
        )}

        {member && open && !knowsMyWeek && (
          <Pressable style={styles.check} onPress={() => router.push('/availability')}>
            <Ionicons name="time-outline" size={22} color={colors.primary} />
            <Text style={styles.checkText}>
              Share your usual week and we&apos;ll check these times against it for you.
            </Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Pressable>
        )}

        {member && open && knowsMyWeek && (
          <View style={styles.check}>
            <Ionicons
              name={fitting.length ? 'checkmark-done-outline' : 'alert-circle-outline'}
              size={22}
              color={fitting.length ? colors.success : colors.primary}
            />
            <View style={styles.checkBody}>
              <Text style={styles.checkText}>
                {fitting.length === 0
                  ? 'None of these times fit your usual week. Vote anyway for any you can make.'
                  : unconfirmed.length === 0
                    ? `You've confirmed every time that fits your week (${fitting.length} of ${options.length}).`
                    : `Your usual week fits ${fitting.length} of ${options.length} times. Confirm you can actually make ${unconfirmed.length === 1 ? 'it' : 'them'}:`}
              </Text>
              {unconfirmed.length > 0 && (
                <View style={styles.confirmList}>
                  {unconfirmed.map((option) => (
                    <View key={option.id} style={styles.confirmRow}>
                      <Ionicons name="calendar-outline" size={16} color={colors.success} />
                      <Text style={styles.confirmDay}>{formatDay(option.startsAt)}</Text>
                      <Text style={styles.confirmTime}>{formatTime(option.startsAt)}</Text>
                    </View>
                  ))}
                </View>
              )}
              {unconfirmed.length > 0 && (
                <Button
                  label={unconfirmed.length === 1 ? 'I can make it' : `I can make all ${unconfirmed.length}`}
                  icon="checkmark"
                  onPress={() => voteWhereFree(event.id)}
                />
              )}
            </View>
          </View>
        )}

        {member && !open && !goingToLeader && (leaderFit === 'busy' || leaderFit === 'away') && (
          <View style={styles.check}>
            <Ionicons name="alert-circle-outline" size={22} color={colors.primary} />
            <Text style={styles.checkText}>
              {leaderFit === 'away'
                ? "Heads up: you marked this as a day you're away."
                : 'Heads up: this is outside your usual availability.'}
            </Text>
          </View>
        )}

        <SectionLabel>{open ? 'Pick your dates' : 'Final results'}</SectionLabel>
        {options.map((option) => {
          const voters = event.votes[option.id] ?? [];
          const mine = voters.includes(ME);
          const count = voters.length;
          const winning = !open && option.id === leader.id;
          const canVote = open && member;
          const fit = fitAt(myWeek, option.startsAt);
          const free = freeMembers(state, org, option.startsAt).length;
          return (
            <Pressable
              key={option.id}
              disabled={!canVote}
              onPress={() => vote(option.id, option.startsAt, mine)}
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
                <View style={styles.fitRow}>
                  <Text style={styles.voters}>
                    {free} of {org.memberIds.length} usually free
                  </Text>
                  {member && fit === 'free' && <Pill label="Fits your week" tone="success" />}
                  {member && fit === 'busy' && <Pill label="Outside your hours" tone="warning" />}
                  {member && fit === 'away' && <Pill label="You're away" tone="danger" />}
                </View>
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

        {member && orders.length > 0 && (
          <>
            <SectionLabel>Orders</SectionLabel>
            {orders.map((request) => {
              const status = requestStatus(request);
              return (
                <Pressable
                  key={request.id}
                  style={styles.order}
                  onPress={() =>
                    router.push({
                      pathname: '/org/[id]/request/[requestId]',
                      params: { id: org.id, requestId: request.id },
                    })
                  }>
                  <Text style={styles.orderEmoji}>{findPartner(request.vendorId)?.emoji ?? '🧾'}</Text>
                  <View style={styles.optionBody}>
                    <Text style={styles.optionDate}>{request.title}</Text>
                    <Text style={styles.voters}>
                      {formatMoney(request.amount)} ·{' '}
                      {status === 'paid'
                        ? `${orderStatusLabel(request, now) ?? 'Paid and ordered'}${request.delivery ? ` · arrives ${formatDateTime(request.delivery.deliverAt)}` : ''}`
                        : status === 'rejected'
                          ? 'Declined'
                          : 'Waiting on officer signatures'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                </Pressable>
              );
            })}
          </>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    paddingTop: 4,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    maxWidth: 260,
  },
  title: {
    color: colors.text,
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '800',
  },
  orgRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  orgName: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
  creator: {
    color: colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
  },
  detailCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  speaker: {
    flex: 1,
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
  },
  description: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
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
  order: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    marginBottom: 10,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  orderEmoji: {
    fontSize: 24,
  },
  close: {
    marginTop: 10,
  },
  fitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  check: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
    marginTop: 12,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  checkBody: {
    flex: 1,
    gap: 10,
  },
  checkText: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  confirmList: {
    gap: 6,
  },
  confirmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    backgroundColor: colors.successSoft,
  },
  confirmDay: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  confirmTime: {
    color: colors.textMuted,
    fontSize: 15,
  },
});
