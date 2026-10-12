import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { OrgBadge } from '@/components/ui';
import { colors, radius } from '@/constants/theme';
import { formatCountdown, formatDateTime, formatDay } from '@/lib/format';
import { hasVoted, isMember, isPollOpen, leadingOption } from '@/lib/selectors';
import { useAppState } from '@/lib/store';
import type { Org, OrgEvent } from '@/lib/types';

type Props = {
  event: OrgEvent;
  org: Org;
  now: number;
  onPress: () => void;
};

export function EventCard({ event, org, now, onPress }: Props) {
  const state = useAppState();
  const open = isPollOpen(event, now);
  const start = leadingOption(state, event).startsAt;

  return (
    <Pressable style={({ pressed }) => [styles.card, pressed && styles.pressed]} onPress={onPress}>
      {open ? (
        <View style={[styles.dateBlock, styles.dateBlockVoting]}>
          <Ionicons name="hand-left-outline" size={22} color={colors.text} />
          <Text style={styles.dateBlockSmall}>{event.options.length} dates</Text>
        </View>
      ) : (
        <View style={styles.dateBlock}>
          <Text style={styles.dateBlockSmall}>{formatDay(start).split(',')[0]}</Text>
          <Text style={styles.dateBlockDay}>{new Date(start).getDate()}</Text>
        </View>
      )}

      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>
          {event.title}
        </Text>
        <View style={styles.orgRow}>
          <OrgBadge emoji={org.emoji} color={org.color} size={18} />
          <Text style={styles.orgName} numberOfLines={1}>
            {org.name}
          </Text>
        </View>
        {open ? (
          <View style={styles.statusRow}>
            <Text style={styles.closes}>Closes in {formatCountdown(event.pollClosesAt - now)}</Text>
            {isMember(org) && (
              <Text style={[styles.badge, hasVoted(event) ? styles.badgeDone : styles.badgeTodo]}>
                {hasVoted(event) ? 'Voted' : 'Vote'}
              </Text>
            )}
          </View>
        ) : (
          <Text style={styles.when}>{formatDateTime(start)}</Text>
        )}
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    marginBottom: 10,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pressed: {
    opacity: 0.85,
  },
  dateBlock: {
    width: 56,
    height: 60,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateBlockVoting: {
    backgroundColor: colors.accentSoft,
    gap: 2,
  },
  dateBlockSmall: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  dateBlockDay: {
    color: colors.primary,
    fontSize: 24,
    fontWeight: '800',
  },
  body: {
    flex: 1,
    gap: 4,
  },
  title: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  orgRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  orgName: {
    color: colors.textMuted,
    fontSize: 13,
    flexShrink: 1,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  closes: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  badge: {
    fontSize: 11,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  badgeTodo: {
    backgroundColor: colors.accent,
    color: colors.text,
  },
  badgeDone: {
    backgroundColor: colors.successSoft,
    color: colors.success,
  },
  when: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
});
