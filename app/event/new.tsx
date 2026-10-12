import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Chip, EmptyState, Segmented, SectionLabel } from '@/components/ui';
import { colors, radius } from '@/constants/theme';
import { useNow } from '@/hooks/useNow';
import { freeMembers, startOfDay, suggestTimes } from '@/lib/availability';
import { formatDay, formatTime } from '@/lib/format';
import { myOrgs } from '@/lib/selectors';
import { createEvent, useAppState } from '@/lib/store';
import type { Org } from '@/lib/types';

const MINUTE = 60_000;
const DAY_COUNT = 21;
const MAX_OPTIONS = 6;
const SUGGESTION_DAYS = 14;
const SUGGESTION_COUNT = 6;
const AUTO_PICKS = 3;
const TIMES = Array.from({ length: 15 }, (_, i) => (8 + i) * 60);
const POLL_LENGTHS = [
  { label: '10 min', ms: 10 * MINUTE },
  { label: '1 hour', ms: 60 * MINUTE },
  { label: '1 day', ms: 24 * 60 * MINUTE },
  { label: '3 days', ms: 3 * 24 * 60 * MINUTE },
  { label: '1 week', ms: 7 * 24 * 60 * MINUTE },
];

type Mode = 'poll' | 'lock';

const MODES: { value: Mode; label: string }[] = [
  { value: 'poll', label: 'Let people vote' },
  { value: 'lock', label: 'Pick the best time' },
];

function atMinutes(day: number, minutes: number) {
  const date = new Date(day);
  date.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return date.getTime();
}

function timeLabel(minutes: number) {
  return formatTime(atMinutes(startOfDay(0), minutes));
}

export default function NewEventScreen() {
  const params = useLocalSearchParams<{ org?: string }>();
  const state = useAppState();
  const now = useNow();
  const insets = useSafeAreaInsets();
  const orgs = myOrgs(state);

  const [orgId, setOrgId] = useState(
    () => orgs.find((org) => org.id === params.org)?.id ?? orgs[0]?.id,
  );
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [mode, setMode] = useState<Mode>('poll');
  const [day, setDay] = useState(() => startOfDay(Date.now(), 1));
  const [minutes, setMinutes] = useState(18 * 60);
  /** Null until the creator changes the automatic picks. */
  const [manual, setManual] = useState<number[] | null>(null);
  const [pollLength, setPollLength] = useState(POLL_LENGTHS[2].ms);

  const org = orgs.find((candidate) => candidate.id === orgId);
  if (!org) {
    return (
      <EmptyState
        icon="people-outline"
        title="Join an org first"
        body="Events belong to an org, so join one from the Orgs tab to start planning."
      />
    );
  }

  const pollClosesAt = now + pollLength;
  const suggestions = suggestTimes(state, org, {
    from: mode === 'poll' ? pollClosesAt : now,
    days: SUGGESTION_DAYS,
    count: SUGGESTION_COUNT,
  });
  const autoPicks = suggestions
    .slice(0, mode === 'poll' ? AUTO_PICKS : 1)
    .map((suggestion) => suggestion.startsAt)
    .sort((a, b) => a - b);
  const startTimes = manual ?? autoPicks;

  const toggleTime = (ts: number) => {
    if (mode === 'lock') {
      setManual([ts]);
      return;
    }
    setManual(
      startTimes.includes(ts)
        ? startTimes.filter((value) => value !== ts)
        : [...startTimes, ts].sort((a, b) => a - b).slice(0, MAX_OPTIONS),
    );
  };

  const changeOrg = (id: string) => {
    setOrgId(id);
    setManual(null);
  };
  const changeMode = (value: Mode) => {
    setMode(value);
    setManual(null);
  };

  const days = Array.from({ length: DAY_COUNT }, (_, i) => startOfDay(now, i));
  const candidate = atMinutes(day, minutes);
  const canAdd =
    candidate > now &&
    !startTimes.includes(candidate) &&
    (mode === 'lock' || startTimes.length < MAX_OPTIONS);
  const earliest = startTimes.length ? Math.min(...startTimes) : undefined;

  const problem = !title.trim()
    ? 'Give your event a name.'
    : mode === 'lock'
      ? startTimes.length !== 1
        ? 'Pick a time.'
        : undefined
      : startTimes.length < 2
        ? 'Add at least two date options for people to vote on.'
        : earliest !== undefined && pollClosesAt >= earliest
          ? 'The poll has to close before the earliest date option. Pick a shorter poll.'
          : undefined;

  const create = () => {
    if (problem) return;
    const id = createEvent({
      orgId: org.id,
      title: title.trim(),
      description: description.trim(),
      startTimes,
      pollClosesAt,
      lockIn: mode === 'lock',
    });
    router.replace({ pathname: '/event/[id]', params: { id } });
  };

  return (
    <View style={styles.flex}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <SectionLabel>Org</SectionLabel>
        <View style={styles.wrap}>
          {orgs.map((option) => (
            <Chip
              key={option.id}
              label={`${option.emoji} ${option.name}`}
              selected={option.id === org.id}
              onPress={() => changeOrg(option.id)}
            />
          ))}
        </View>

        <SectionLabel>Details</SectionLabel>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Event name"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
        />
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="What's the plan? (optional)"
          placeholderTextColor={colors.textMuted}
          style={[styles.input, styles.multiline]}
          multiline
        />

        <SectionLabel>How to choose the date</SectionLabel>
        <Segmented options={MODES} value={mode} onChange={changeMode} />

        <SectionLabel>Best times for {org.name}</SectionLabel>
        {suggestions.length === 0 ? (
          <Text style={styles.hint}>
            No one in {org.name} has shared their availability yet. Add times by hand below.
          </Text>
        ) : (
          <>
            <Text style={[styles.hint, styles.hintTop]}>
              {manual
                ? 'Based on everyone\u2019s usual week. Tap to add or remove.'
                : mode === 'poll'
                  ? `We picked the ${autoPicks.length} times when the most members are usually free. Tap to change.`
                  : 'We picked the time when the most members are usually free. Tap another to switch.'}
            </Text>
            {suggestions.map((suggestion) => (
              <TimeRow
                key={suggestion.startsAt}
                org={org}
                startsAt={suggestion.startsAt}
                free={suggestion.free.length}
                selected={startTimes.includes(suggestion.startsAt)}
                onPress={() => toggleTime(suggestion.startsAt)}
              />
            ))}
          </>
        )}

        <SectionLabel>Add a different time</SectionLabel>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.bleed}
          contentContainerStyle={styles.row}>
          {days.map((value) => {
            const selected = value === day;
            const date = new Date(value);
            return (
              <Pressable
                key={value}
                onPress={() => setDay(value)}
                style={[styles.day, selected && styles.daySelected]}>
                <Text style={[styles.dayWeek, selected && styles.selectedText]}>
                  {formatDay(value).split(',')[0]}
                </Text>
                <Text style={[styles.dayNumber, selected && styles.selectedText]}>
                  {date.getDate()}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={[styles.bleed, styles.times]}
          contentContainerStyle={styles.row}>
          {TIMES.map((value) => (
            <Chip
              key={value}
              label={timeLabel(value)}
              selected={value === minutes}
              disabled={atMinutes(day, value) <= now}
              onPress={() => setMinutes(value)}
            />
          ))}
        </ScrollView>
        <Text style={styles.hint}>
          {freeMembers(state, org, candidate).length} of {org.memberIds.length} members are usually
          free {formatDay(candidate)} at {formatTime(candidate)}.
        </Text>
        <Button
          label={`${mode === 'lock' ? 'Use' : 'Add'} ${formatDay(candidate)} at ${formatTime(candidate)}`}
          icon="add"
          variant="secondary"
          disabled={!canAdd}
          onPress={() => toggleTime(candidate)}
          style={styles.add}
        />

        <SectionLabel>{mode === 'lock' ? 'Happening' : `Date options (${startTimes.length})`}</SectionLabel>
        {startTimes.map((value) => (
          <View key={value} style={styles.option}>
            <Ionicons name="calendar-outline" size={18} color={colors.primary} />
            <View style={styles.flex}>
              <Text style={styles.optionText}>
                {formatDay(value)} · {formatTime(value)}
              </Text>
              <Text style={styles.optionMeta}>
                {freeMembers(state, org, value).length} of {org.memberIds.length} usually free
              </Text>
            </View>
            {mode === 'poll' && (
              <Pressable
                hitSlop={10}
                accessibilityLabel="Remove date option"
                onPress={() => toggleTime(value)}>
                <Ionicons name="close-circle" size={22} color={colors.textMuted} />
              </Pressable>
            )}
          </View>
        ))}
        {startTimes.length === 0 && (
          <Text style={styles.hint}>Pick a suggested time or add your own.</Text>
        )}

        {mode === 'poll' ? (
          <>
            <SectionLabel>Voting stays open for</SectionLabel>
            <View style={styles.wrap}>
              {POLL_LENGTHS.map((option) => (
                <Chip
                  key={option.ms}
                  label={option.label}
                  selected={option.ms === pollLength}
                  onPress={() => setPollLength(option.ms)}
                />
              ))}
            </View>
            <Text style={styles.hint}>
              Closes {formatDay(pollClosesAt)} at {formatTime(pollClosesAt)}. Everyone confirms the
              times they can make, and the top pick is locked in automatically.
            </Text>
          </>
        ) : (
          <Text style={styles.hint}>
            No vote. The event is confirmed as soon as you create it.
          </Text>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        {problem && <Text style={styles.problem}>{problem}</Text>}
        <Button
          label={mode === 'lock' ? 'Create event' : 'Create event and open voting'}
          disabled={!!problem}
          onPress={create}
        />
      </View>
    </View>
  );
}

function TimeRow({
  org,
  startsAt,
  free,
  selected,
  onPress,
}: {
  org: Org;
  startsAt: number;
  free: number;
  selected: boolean;
  onPress: () => void;
}) {
  const total = org.memberIds.length;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.suggestion, selected && styles.suggestionOn, pressed && styles.pressed]}>
      <Ionicons
        name={selected ? 'checkbox' : 'square-outline'}
        size={22}
        color={selected ? colors.primary : colors.textMuted}
      />
      <View style={styles.flex}>
        <View style={styles.suggestionTop}>
          <Text style={styles.optionText}>
            {formatDay(startsAt)} · {formatTime(startsAt)}
          </Text>
          <Text style={styles.freeCount}>
            {free}/{total} free
          </Text>
        </View>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${(free / total) * 100}%` }]} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  pressed: {
    opacity: 0.8,
  },
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
    marginBottom: 10,
  },
  multiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  suggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    marginBottom: 8,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  suggestionOn: {
    borderColor: colors.primary,
  },
  suggestionTop: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  freeCount: {
    color: colors.success,
    fontSize: 13,
    fontWeight: '800',
  },
  track: {
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.surfaceMuted,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: '#7BC47F',
  },
  bleed: {
    marginHorizontal: -20,
  },
  row: {
    gap: 8,
    paddingHorizontal: 20,
  },
  times: {
    marginTop: 10,
  },
  day: {
    width: 54,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  daySelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dayWeek: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  dayNumber: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
  },
  selectedText: {
    color: '#fff',
  },
  add: {
    marginTop: 12,
    marginBottom: 6,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    marginTop: 8,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  optionText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  optionMeta: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  hint: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 10,
  },
  hintTop: {
    marginTop: 0,
    marginBottom: 10,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  problem: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
  },
});
