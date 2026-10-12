import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Avatar, Button, Card, EmptyState, SectionLabel } from '@/components/ui';
import { colors, radius } from '@/constants/theme';
import { confirm } from '@/lib/confirm';
import { formatDate, formatDateTime, formatMoney } from '@/lib/format';
import {
  isOfficer,
  missingSigners,
  officerIds,
  requestStatus,
  ROLE_LABELS,
  roleOf,
} from '@/lib/orgRules';
import { findPartner } from '@/lib/partners';
import { isMember } from '@/lib/selectors';
import { ME, rejectRequest, signRequest, useAppState } from '@/lib/store';

export default function RequestScreen() {
  const { id, requestId } = useLocalSearchParams<{ id: string; requestId: string }>();
  const state = useAppState();
  const org = state.orgs.find((candidate) => candidate.id === id);
  const request = state.requests.find((candidate) => candidate.id === requestId);

  if (!org || !request || !isMember(org)) {
    return <EmptyState icon="document-outline" title="Request not found" />;
  }

  const status = requestStatus(request);
  const partner = findPartner(request.vendorId);
  const missing = missingSigners(org, request);
  const needsMe = status === 'pending' && missing.includes(ME);
  const event = request.eventId && state.events.find((candidate) => candidate.id === request.eventId);
  const requester = state.users[request.requestedBy];

  const signerIds =
    status === 'pending'
      ? officerIds(org)
      : request.signatures.map((signature) => signature.userId);

  return (
    <>
      <Stack.Screen options={{ title: '' }} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.emoji}>{partner?.emoji ?? '🧾'}</Text>
        <Text style={styles.amount}>{formatMoney(request.amount)}</Text>
        <Text style={styles.title}>{request.title}</Text>
        <Text style={styles.muted}>
          {partner ? `${partner.name} · ` : ''}
          {request.category} · requested by {request.requestedBy === ME ? 'you' : requester?.name}{' '}
          {formatDate(request.createdAt)}
        </Text>

        {status === 'paid' && (
          <View style={[styles.banner, styles.bannerPaid]}>
            <Ionicons name="checkmark-circle" size={22} color={colors.success} />
            <Text style={styles.bannerText}>
              {partner ? 'Paid and ordered' : 'Paid'} {formatDateTime(request.paidAt!)}
            </Text>
          </View>
        )}
        {status === 'rejected' && (
          <View style={[styles.banner, styles.bannerDeclined]}>
            <Ionicons name="close-circle" size={22} color={colors.primary} />
            <Text style={styles.bannerText}>
              Declined by{' '}
              {request.rejection!.userId === ME ? 'you' : state.users[request.rejection!.userId]?.name}
            </Text>
          </View>
        )}
        {status === 'pending' && (
          <View style={[styles.banner, styles.bannerPending]}>
            <Ionicons name="time-outline" size={22} color={colors.text} />
            <Text style={styles.bannerText}>
              Waiting on {missing.length} {missing.length === 1 ? 'signature' : 'signatures'}. Money
              moves the moment the last officer signs.
            </Text>
          </View>
        )}

        {request.items && request.items.length > 0 && (
          <>
            <SectionLabel>Order</SectionLabel>
            <Card style={styles.items}>
              {request.items.map((item) => (
                <View key={item.name} style={styles.itemRow}>
                  <Text style={styles.itemQty}>{item.quantity}×</Text>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemPrice}>{formatMoney(item.quantity * item.unitPrice)}</Text>
                </View>
              ))}
            </Card>
          </>
        )}

        {!!request.note && (
          <>
            <SectionLabel>Note</SectionLabel>
            <Text style={styles.note}>{request.note}</Text>
          </>
        )}

        {event && (
          <>
            <SectionLabel>For</SectionLabel>
            <Pressable
              style={styles.eventLink}
              onPress={() => router.push({ pathname: '/event/[id]', params: { id: event.id } })}>
              <Ionicons name="calendar-outline" size={18} color={colors.primary} />
              <Text style={styles.eventText}>{event.title}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </Pressable>
          </>
        )}

        <SectionLabel>Officer signatures</SectionLabel>
        {signerIds.map((userId) => {
          const user = state.users[userId];
          const signature = request.signatures.find((entry) => entry.userId === userId);
          const role = roleOf(org, userId);
          return (
            <View key={userId} style={styles.signer}>
              <Avatar name={user.name} size={38} />
              <View style={styles.flex}>
                <Text style={styles.signerName}>
                  {user.name}
                  {userId === ME ? ' (you)' : ''}
                </Text>
                <Text style={styles.muted}>
                  {role ? ROLE_LABELS[role] : 'Former officer'}
                  {signature ? ` · signed ${formatDateTime(signature.at)}` : ''}
                </Text>
              </View>
              <Ionicons
                name={signature ? 'checkmark-circle' : 'ellipse-outline'}
                size={24}
                color={signature ? colors.success : colors.border}
              />
            </View>
          );
        })}

        {needsMe && (
          <View style={styles.actions}>
            <Text style={styles.muted}>
              Your signature is tied to your student account and recorded in the audit trail.
            </Text>
            <Button label="Sign and approve" icon="create-outline" onPress={() => signRequest(request.id)} />
            <Button
              label="Decline"
              variant="secondary"
              onPress={() =>
                confirm(
                  'Decline this request?',
                  `${formatMoney(request.amount)} for ${request.title} won't be paid.`,
                  'Decline',
                  () => rejectRequest(request.id),
                )
              }
            />
          </View>
        )}
        {status === 'pending' && !needsMe && isOfficer(org) && (
          <Text style={[styles.muted, styles.waiting]}>
            You&apos;ve signed. Waiting on the other officers.
          </Text>
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
  flex: {
    flex: 1,
  },
  emoji: {
    fontSize: 40,
  },
  amount: {
    color: colors.text,
    fontSize: 36,
    fontWeight: '800',
    marginTop: 6,
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
    marginTop: 2,
  },
  muted: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 2,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    marginTop: 16,
    borderRadius: radius.md,
  },
  bannerPaid: {
    backgroundColor: colors.successSoft,
  },
  bannerDeclined: {
    backgroundColor: colors.primarySoft,
  },
  bannerPending: {
    backgroundColor: colors.accentSoft,
  },
  bannerText: {
    flex: 1,
    color: colors.text,
    fontWeight: '700',
    lineHeight: 20,
  },
  items: {
    gap: 8,
  },
  itemRow: {
    flexDirection: 'row',
    gap: 8,
  },
  itemQty: {
    color: colors.textMuted,
    fontWeight: '700',
    width: 28,
  },
  itemName: {
    flex: 1,
    color: colors.text,
  },
  itemPrice: {
    color: colors.text,
    fontWeight: '600',
  },
  note: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 21,
  },
  eventLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  eventText: {
    flex: 1,
    color: colors.primary,
    fontSize: 15,
    fontWeight: '700',
  },
  signer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  signerName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  actions: {
    gap: 10,
    marginTop: 16,
  },
  waiting: {
    marginTop: 16,
    textAlign: 'center',
  },
});
