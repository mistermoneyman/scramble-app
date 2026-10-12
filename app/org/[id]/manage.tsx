import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Card, EmptyState, Pill, SectionLabel, type IconName } from '@/components/ui';
import { colors, radius } from '@/constants/theme';
import { useNow } from '@/hooks/useNow';
import { academicYearLabel, academicYearStart } from '@/lib/academicYear';
import { firstName, formatMoney, formatRelative } from '@/lib/format';
import {
  auditKey,
  available,
  awaitingMySignature,
  balance,
  officerIds,
  orgRequests,
  requestStatus,
  ROLE_LABELS,
  roleOf,
  uncoveredGraduates,
} from '@/lib/orgRules';
import { isMember } from '@/lib/selectors';
import { ME, useAppState } from '@/lib/store';

const SCREENS = {
  roster: '/org/[id]/roster',
  money: '/org/[id]/money',
  report: '/org/[id]/report',
} as const;

export default function ManageOrgScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const state = useAppState();
  const now = useNow();
  const org = state.orgs.find((candidate) => candidate.id === id);

  if (!org || !isMember(org)) {
    return <EmptyState icon="lock-closed-outline" title="Only members can see this" />;
  }

  const myRole = roleOf(org, ME);
  const toSign = awaitingMySignature(state).filter((request) => request.orgId === org.id);
  const pending = orgRequests(state, org.id).filter((r) => requestStatus(r) === 'pending');
  const gaps = uncoveredGraduates(state, org, now);
  const yearStart = academicYearStart(now);
  const audit = state.audits[auditKey(org.id, yearStart)];
  const officers = officerIds(org);
  const recent = state.activity
    .filter((entry) => entry.orgId === org.id)
    .sort((a, b) => b.at - a.at)
    .slice(0, 8);

  const go = (screen: 'roster' | 'money' | 'report') =>
    router.push({ pathname: SCREENS[screen], params: { id: org.id } });

  return (
    <>
      <Stack.Screen options={{ title: `${org.emoji} ${org.name}` }} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.roleRow}>
          <Text style={styles.roleText}>You&apos;re {myRole ? 'the' : 'a'}</Text>
          <Pill label={myRole ? ROLE_LABELS[myRole] : 'Member'} tone={myRole ? 'warning' : 'neutral'} />
        </View>

        {toSign.length > 0 && (
          <Alert
            icon="create-outline"
            text={`${toSign.length} ${toSign.length === 1 ? 'request needs' : 'requests need'} your signature`}
            onPress={() => go('money')}
          />
        )}
        {gaps.length > 0 && (
          <Alert
            icon="school-outline"
            text={`${gaps.map((userId) => firstName(state.users[userId].name)).join(' and ')} ${
              gaps.length === 1 ? 'graduates' : 'graduate'
            } this spring with no one lined up to take over`}
            onPress={() => go('roster')}
          />
        )}

        <HubCard icon="people-outline" title="Roster" onPress={() => go('roster')}>
          <Text style={styles.big}>{org.memberIds.length} members</Text>
          <Text style={styles.muted}>
            {officers.length
              ? officers
                  .map((userId) => `${firstName(state.users[userId].name)} (${ROLE_LABELS[org.officers[userId]]})`)
                  .join(' · ')
              : 'No officers yet'}
          </Text>
        </HubCard>

        <HubCard icon="wallet-outline" title="Money" onPress={() => go('money')}>
          <Text style={styles.big}>{formatMoney(balance(state, org.id))}</Text>
          <Text style={styles.muted}>
            {pending.length
              ? `${formatMoney(available(state, org.id))} available · ${pending.length} waiting on signatures`
              : 'In your university account'}
          </Text>
        </HubCard>

        <HubCard icon="document-text-outline" title="Year-end report" onPress={() => go('report')}>
          <Text style={styles.big}>{academicYearLabel(yearStart)}</Text>
          {audit ? (
            <Pill label="Submitted to Student Activities" tone="success" />
          ) : (
            <Text style={styles.muted}>Builds itself from your transactions</Text>
          )}
        </HubCard>

        <SectionLabel>Recent activity</SectionLabel>
        {recent.map((entry) => (
          <View key={entry.id} style={styles.activity}>
            <View style={styles.dot} />
            <Text style={styles.activityText}>{entry.text}</Text>
            <Text style={styles.muted}>{formatRelative(entry.at, now)}</Text>
          </View>
        ))}
      </ScrollView>
    </>
  );
}

function Alert({ icon, text, onPress }: { icon: IconName; text: string; onPress: () => void }) {
  return (
    <Pressable style={styles.alert} onPress={onPress}>
      <Ionicons name={icon} size={20} color={colors.text} />
      <Text style={styles.alertText}>{text}</Text>
      <Ionicons name="chevron-forward" size={18} color={colors.text} />
    </Pressable>
  );
}

function HubCard({
  icon,
  title,
  onPress,
  children,
}: {
  icon: IconName;
  title: string;
  onPress: () => void;
  children: ReactNode;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
      <Card style={styles.hubCard}>
        <View style={styles.hubTop}>
          <Ionicons name={icon} size={20} color={colors.primary} />
          <Text style={styles.hubTitle}>{title}</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </View>
        {children}
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 40,
    gap: 10,
  },
  roleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  roleText: {
    color: colors.textMuted,
    fontSize: 15,
  },
  alert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: radius.md,
    backgroundColor: colors.accentSoft,
  },
  alertText: {
    flex: 1,
    color: colors.text,
    fontWeight: '700',
    lineHeight: 20,
  },
  pressed: {
    opacity: 0.8,
  },
  hubCard: {
    gap: 6,
  },
  hubTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  hubTitle: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  big: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '800',
  },
  muted: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  activity: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
    backgroundColor: colors.accent,
  },
  activityText: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
});
