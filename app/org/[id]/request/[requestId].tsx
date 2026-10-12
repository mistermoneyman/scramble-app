import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Avatar, Button, Card, EmptyState, type IconName, SectionLabel } from '@/components/ui';
import { colors, radius } from '@/constants/theme';
import { useNow } from '@/hooks/useNow';
import { orderSteps } from '@/lib/orders';
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
  const now = useNow(30_000);
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
  const steps = orderSteps(request, now);

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
              {request.orderNumber ? ` · #${request.orderNumber}` : ''}
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

        {steps && (
          <>
            <SectionLabel>
              {partner?.name} order {request.orderNumber ? `#${request.orderNumber}` : ''}
            </SectionLabel>
            <Card style={styles.tracker}>
              {steps.map((step, index) => (
                <View key={step.label} style={styles.step}>
                  <View style={styles.stepRail}>
                    <View style={[styles.stepDot, step.done && styles.stepDotDone]}>
                      {step.done && <Ionicons name="checkmark" size={12} color="#fff" />}
                    </View>
                    {index < steps.length - 1 && (
                      <View style={[styles.stepLine, steps[index + 1].done && styles.stepLineDone]} />
                    )}
                  </View>
                  <View style={styles.flex}>
                    <Text style={[styles.stepLabel, !step.done && styles.stepPending]}>
                      {step.label}
                    </Text>
                    <Text style={styles.muted}>
                      {step.done ? '' : 'Around '}
                      {formatDateTime(step.at)}
                    </Text>
                  </View>
                </View>
              ))}
            </Card>
          </>
        )}

        {request.items && request.items.length > 0 && (
          <>
            <SectionLabel>Order</SectionLabel>
            <Card style={styles.items}>
              {request.items.map((item, index) => (
                <View key={`${item.name}${index}`} style={styles.itemRow}>
                  <Text style={styles.itemQty}>{item.quantity}×</Text>
                  <View style={styles.flex}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    {!!item.details && <Text style={styles.muted}>{item.details}</Text>}
                    {!!item.note && <Text style={styles.itemNote}>“{item.note}”</Text>}
                  </View>
                  <Text style={styles.itemPrice}>{formatMoney(item.quantity * item.unitPrice)}</Text>
                </View>
              ))}
              {request.charges && (
                <View style={styles.charges}>
                  <ChargeLine label="Food" value={request.charges.subtotal} />
                  <ChargeLine label="Delivery" value={request.charges.deliveryFee} />
                  <ChargeLine label="Tip" value={request.charges.tip} />
                  <ChargeLine label="Sales tax (university is exempt)" value={0} />
                  <ChargeLine label="Total" value={request.amount} bold />
                </View>
              )}
            </Card>
          </>
        )}

        {request.delivery && (
          <>
            <SectionLabel>Delivery</SectionLabel>
            <Card style={styles.items}>
              <DetailRow icon="location-outline" text={request.delivery.location} />
              <DetailRow icon="time-outline" text={formatDateTime(request.delivery.deliverAt)} />
              <DetailRow
                icon="call-outline"
                text={`Driver calls ${
                  request.delivery.contactId === ME
                    ? 'you'
                    : (state.users[request.delivery.contactId]?.name ?? 'an officer')
                }`}
              />
              {!!request.delivery.instructions && (
                <DetailRow icon="chatbox-ellipses-outline" text={request.delivery.instructions} />
              )}
            </Card>
            {status === 'pending' && request.delivery.deliverAt - now < 2 * 60 * 60 * 1000 && (
              <Text style={[styles.muted, styles.urgent]}>
                Delivery is soon. The order can only be placed once every officer has signed.
              </Text>
            )}
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

function ChargeLine({ label, value, bold }: { label: string; value: number; bold?: boolean }) {
  return (
    <View style={styles.chargeLine}>
      <Text style={[styles.chargeLabel, bold && styles.chargeBold]}>{label}</Text>
      <Text style={[styles.chargeLabel, bold && styles.chargeBold]}>{formatMoney(value)}</Text>
    </View>
  );
}

function DetailRow({ icon, text }: { icon: IconName; text: string }) {
  return (
    <View style={styles.detailRow}>
      <Ionicons name={icon} size={18} color={colors.primary} />
      <Text style={styles.detailText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tracker: {
    paddingVertical: 12,
  },
  step: {
    flexDirection: 'row',
    gap: 12,
  },
  stepRail: {
    alignItems: 'center',
    width: 20,
  },
  stepDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  stepDotDone: {
    borderColor: colors.success,
    backgroundColor: colors.success,
  },
  stepLine: {
    flex: 1,
    width: 2,
    minHeight: 18,
    backgroundColor: colors.border,
  },
  stepLineDone: {
    backgroundColor: colors.success,
  },
  stepLabel: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  stepPending: {
    color: colors.textMuted,
  },
  itemNote: {
    color: colors.text,
    fontSize: 13,
    fontStyle: 'italic',
    marginTop: 2,
  },
  charges: {
    gap: 4,
    paddingTop: 10,
    marginTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  chargeLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  chargeLabel: {
    color: colors.textMuted,
    fontSize: 13,
  },
  chargeBold: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  detailText: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    lineHeight: 21,
  },
  urgent: {
    marginTop: 8,
  },
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
