import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Chip, EmptyState, SectionLabel } from '@/components/ui';
import { colors, radius } from '@/constants/theme';
import { useNow } from '@/hooks/useNow';
import { formatDay, formatTime } from '@/lib/format';
import { myOrgs } from '@/lib/selectors';
import { createEvent, useAppState } from '@/lib/store';

const MINUTE = 60_000;
const DAY_COUNT = 21;
const MAX_OPTIONS = 6;
const TIMES = Array.from({ length: 15 }, (_, i) => (8 + i) * 60);
const POLL_LENGTHS = [
  { label: '10 min', ms: 10 * MINUTE },
  { label: '1 hour', ms: 60 * MINUTE },
  { label: '1 day', ms: 24 * 60 * MINUTE },
  { label: '3 days', ms: 3 * 24 * 60 * MINUTE },
  { label: '1 week', ms: 7 * 24 * 60 * MINUTE },
];

function startOfDay(ts: number, offsetDays = 0) {
  const date = new Date(ts);
  date.setDate(date.getDate() + offsetDays);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

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
  const [day, setDay] = useState(() => startOfDay(Date.now(), 1));
  const [minutes, setMinutes] = useState(18 * 60);
  const [startTimes, setStartTimes] = useState<number[]>([]);
  const [pollLength, setPollLength] = useState(POLL_LENGTHS[2].ms);

  if (!orgId) {
    return (
      <EmptyState
        icon="people-outline"
        title="Join an org first"
        body="Events belong to an org, so join one from the Orgs tab to start planning."
      />
    );
  }

  const days = Array.from({ length: DAY_COUNT }, (_, i) => startOfDay(now, i));
  const candidate = atMinutes(day, minutes);
  const canAdd =
    candidate > now && !startTimes.includes(candidate) && startTimes.length < MAX_OPTIONS;
  const pollClosesAt = now + pollLength;
  const earliest = startTimes.length ? Math.min(...startTimes) : undefined;

  const problem = !title.trim()
    ? 'Give your event a name.'
    : startTimes.length < 2
      ? 'Add at least two date options for people to vote on.'
      : earliest !== undefined && pollClosesAt >= earliest
        ? 'The poll has to close before the earliest date option. Pick a shorter poll.'
        : undefined;

  const create = () => {
    if (problem) return;
    const id = createEvent({
      orgId,
      title: title.trim(),
      description: description.trim(),
      startTimes,
      pollClosesAt,
    });
    router.replace({ pathname: '/event/[id]', params: { id } });
  };

  return (
    <View style={styles.flex}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <SectionLabel>Org</SectionLabel>
        <View style={styles.wrap}>
          {orgs.map((org) => (
            <Chip
              key={org.id}
              label={`${org.emoji} ${org.name}`}
              selected={org.id === orgId}
              onPress={() => setOrgId(org.id)}
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

        <SectionLabel>Date options</SectionLabel>
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
        <Button
          label={`Add ${formatDay(candidate)} at ${formatTime(candidate)}`}
          icon="add"
          variant="secondary"
          disabled={!canAdd}
          onPress={() => setStartTimes((current) => [...current, candidate].sort((a, b) => a - b))}
          style={styles.add}
        />

        {startTimes.map((value) => (
          <View key={value} style={styles.option}>
            <Ionicons name="calendar-outline" size={18} color={colors.primary} />
            <Text style={styles.optionText}>
              {formatDay(value)} · {formatTime(value)}
            </Text>
            <Pressable
              hitSlop={10}
              accessibilityLabel="Remove date option"
              onPress={() => setStartTimes((current) => current.filter((time) => time !== value))}>
              <Ionicons name="close-circle" size={22} color={colors.textMuted} />
            </Pressable>
          </View>
        ))}
        {startTimes.length === 0 && (
          <Text style={styles.hint}>Pick a day and time, then add it. Add up to {MAX_OPTIONS}.</Text>
        )}

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
          Closes {formatDay(pollClosesAt)} at {formatTime(pollClosesAt)}. The date with the most
          votes gets locked in automatically.
        </Text>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        {problem && <Text style={styles.problem}>{problem}</Text>}
        <Button label="Create event and open voting" disabled={!!problem} onPress={create} />
      </View>
    </View>
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
    flex: 1,
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  hint: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 10,
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
