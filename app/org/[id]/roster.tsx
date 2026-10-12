import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Avatar, Button, Card, Chip, EmptyState, Pill, SectionLabel } from '@/components/ui';
import { colors, radius } from '@/constants/theme';
import { useNow } from '@/hooks/useNow';
import { graduatingClass } from '@/lib/academicYear';
import { confirm } from '@/lib/confirm';
import { firstName } from '@/lib/format';
import {
  canManageRoster,
  officerIds,
  ROLE_LABELS,
  ROLE_ORDER,
  roleOf,
  uncoveredGraduates,
} from '@/lib/orgRules';
import { isMember } from '@/lib/selectors';
import { assignRole, handOff, ME, setSuccessor, useAppState } from '@/lib/store';
import type { OfficerRole, Org, User } from '@/lib/types';

export default function RosterScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const state = useAppState();
  const now = useNow();
  const [expanded, setExpanded] = useState<string | null>(null);
  const org = state.orgs.find((candidate) => candidate.id === id);

  if (!org || !isMember(org)) {
    return <EmptyState icon="lock-closed-outline" title="Only members can see this" />;
  }

  const seniors = graduatingClass(now);
  const manager = canManageRoster(org);
  const officers = officerIds(org);
  const members = org.memberIds
    .filter((userId) => !roleOf(org, userId))
    .map((userId) => state.users[userId])
    .sort((a, b) => a.name.localeCompare(b.name));
  const gaps = uncoveredGraduates(state, org, now);

  const toggle = (userId: string) => setExpanded((current) => (current === userId ? null : userId));

  return (
    <>
      <Stack.Screen options={{ title: 'Roster' }} />
      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.explainer}>
          <Ionicons name="infinite-outline" size={22} color={colors.primary} />
          <Text style={styles.explainerText}>
            The group chat, account, and records belong to {org.name}, not to any one person. When
            an officer graduates, their role passes to the next person and nothing gets lost.
          </Text>
        </Card>

        {gaps.length > 0 && (
          <View style={styles.warning}>
            <Ionicons name="school-outline" size={20} color={colors.text} />
            <Text style={styles.warningText}>
              {gaps.map((userId) => firstName(state.users[userId].name)).join(' and ')}{' '}
              {gaps.length === 1 ? 'graduates' : 'graduate'} in {seniors}. Line up a successor so
              the handoff is one tap.
            </Text>
          </View>
        )}

        <SectionLabel>Officers</SectionLabel>
        {officers.length === 0 && <Text style={styles.muted}>No officers yet.</Text>}
        {officers.map((userId) => {
          const user = state.users[userId];
          const role = org.officers[userId];
          const successor = org.successors[userId] ? state.users[org.successors[userId]] : undefined;
          const canEdit = manager || userId === ME;
          const open = expanded === userId && canEdit;
          return (
            <Card key={userId} style={styles.person}>
              <Pressable style={styles.personTop} onPress={() => canEdit && toggle(userId)}>
                <Avatar name={user.name} />
                <View style={styles.personBody}>
                  <View style={styles.nameRow}>
                    <Text style={styles.name}>
                      {user.name}
                      {userId === ME ? ' (you)' : ''}
                    </Text>
                  </View>
                  <Text style={styles.role}>{ROLE_LABELS[role]}</Text>
                  <View style={styles.tags}>
                    <ClassTag user={user} seniors={seniors} />
                    {successor ? (
                      <Pill label={`Next: ${successor.name}`} tone="success" />
                    ) : (
                      user.gradYear === seniors && <Pill label="No successor" tone="danger" />
                    )}
                  </View>
                </View>
                {canEdit && (
                  <Ionicons
                    name={open ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color={colors.textMuted}
                  />
                )}
              </Pressable>

              {open && (
                <OfficerControls
                  org={org}
                  officer={user}
                  role={role}
                  successor={successor}
                  candidates={org.memberIds
                    .filter((candidateId) => candidateId !== userId)
                    .map((candidateId) => state.users[candidateId])}
                  manager={manager}
                />
              )}
            </Card>
          );
        })}

        <SectionLabel>Members · {members.length}</SectionLabel>
        {members.map((user) => {
          const open = expanded === user.id && manager;
          return (
            <View key={user.id} style={styles.memberWrap}>
              <Pressable style={styles.member} onPress={() => manager && toggle(user.id)}>
                <Avatar name={user.name} size={38} />
                <View style={styles.personBody}>
                  <Text style={styles.name}>
                    {user.name}
                    {user.id === ME ? ' (you)' : ''}
                  </Text>
                  <ClassTag user={user} seniors={seniors} />
                </View>
                {manager && (
                  <Text style={styles.link}>{open ? 'Close' : 'Make officer'}</Text>
                )}
              </Pressable>
              {open && (
                <View style={styles.roleChips}>
                  {ROLE_ORDER.map((role) => (
                    <Chip
                      key={role}
                      label={ROLE_LABELS[role]}
                      onPress={() => {
                        const apply = () => {
                          assignRole(org.id, user.id, role);
                          setExpanded(null);
                        };
                        if (role === 'president') {
                          confirm(
                            `Hand the presidency to ${user.name}?`,
                            "You'll become a general member, and they'll manage the roster from now on.",
                            'Hand off',
                            apply,
                          );
                        } else {
                          apply();
                        }
                      }}
                    />
                  ))}
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </>
  );
}

function ClassTag({ user, seniors }: { user: User; seniors: number }) {
  return user.gradYear === seniors ? (
    <Pill label={`Graduating ${user.gradYear}`} tone="warning" />
  ) : (
    <Text style={styles.muted}>Class of {user.gradYear}</Text>
  );
}

function OfficerControls({
  org,
  officer,
  role,
  successor,
  candidates,
  manager,
}: {
  org: Org;
  officer: User;
  role: OfficerRole;
  successor: User | undefined;
  candidates: User[];
  manager: boolean;
}) {
  return (
    <View style={styles.controls}>
      <Text style={styles.controlLabel}>Who takes over as {ROLE_LABELS[role]}?</Text>
      <View style={styles.roleChips}>
        {candidates.map((candidate) => (
          <Chip
            key={candidate.id}
            label={candidate.name}
            selected={successor?.id === candidate.id}
            onPress={() =>
              setSuccessor(org.id, officer.id, successor?.id === candidate.id ? null : candidate.id)
            }
          />
        ))}
      </View>

      {successor && (
        <Button
          label={`Hand off to ${firstName(successor.name)} now`}
          icon="swap-horizontal"
          onPress={() =>
            confirm(
              `Hand ${ROLE_LABELS[role]} to ${successor.name}?`,
              `${successor.name} gets ${officer.id === ME ? 'your' : `${firstName(officer.name)}'s`} permissions right away, including signing for money. ${officer.id === ME ? 'You stay' : `${firstName(officer.name)} stays`} in the org as a member.`,
              'Hand off',
              () => handOff(org.id, officer.id),
            )
          }
        />
      )}

      {manager && role !== 'president' && (
        <>
          <Text style={styles.controlLabel}>Change role</Text>
          <View style={styles.roleChips}>
            {ROLE_ORDER.filter((option) => option !== 'president').map((option) => (
              <Chip
                key={option}
                label={ROLE_LABELS[option]}
                selected={option === role}
                onPress={() => assignRole(org.id, officer.id, option)}
              />
            ))}
            <Chip label="Remove role" onPress={() => assignRole(org.id, officer.id, null)} />
          </View>
        </>
      )}
      {role === 'president' && (
        <Text style={styles.muted}>
          The org always needs a president, so this role can only be handed off, not removed.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  explainer: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 0,
  },
  explainerText: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  warning: {
    flexDirection: 'row',
    gap: 10,
    padding: 14,
    marginTop: 10,
    borderRadius: radius.md,
    backgroundColor: colors.accentSoft,
  },
  warningText: {
    flex: 1,
    color: colors.text,
    fontWeight: '600',
    lineHeight: 20,
  },
  person: {
    marginBottom: 10,
    padding: 14,
  },
  personTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  personBody: {
    flex: 1,
    gap: 3,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  role: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  muted: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  controls: {
    gap: 10,
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  controlLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  roleChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  memberWrap: {
    paddingVertical: 6,
    gap: 10,
  },
  member: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  link: {
    color: colors.primary,
    fontWeight: '700',
  },
});
