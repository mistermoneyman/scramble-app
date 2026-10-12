import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, Card, Chip, EmptyState, Pill, SectionLabel } from '@/components/ui';
import { colors, radius } from '@/constants/theme';
import { useNow } from '@/hooks/useNow';
import { formatDate, formatMoney } from '@/lib/format';
import {
  available,
  balance,
  canManageCard,
  cardSpendThisMonth,
  isOfficer,
  missingSigners,
  officerIds,
  orgRequests,
  orgTransactions,
  requestStatus,
} from '@/lib/orgRules';
import { findPartner } from '@/lib/partners';
import { isMember } from '@/lib/selectors';
import { ME, setCardLimit, toggleCardFrozen, useAppState } from '@/lib/store';
import type { FundRequest, Org } from '@/lib/types';

const LIMITS = [10000, 25000, 50000, 100000];

export default function MoneyScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const state = useAppState();
  const now = useNow();
  const org = state.orgs.find((candidate) => candidate.id === id);

  if (!org || !isMember(org)) {
    return <EmptyState icon="lock-closed-outline" title="Only members can see this" />;
  }

  const officer = isOfficer(org);
  const total = balance(state, org.id);
  const free = available(state, org.id);
  const requests = orgRequests(state, org.id);
  const pending = requests.filter((request) => requestStatus(request) === 'pending');
  const declined = requests.filter((request) => requestStatus(request) === 'rejected');
  const card = state.cards[org.id];
  const cardSpend = cardSpendThisMonth(state, org.id, now);
  const transactions = orgTransactions(state, org.id);

  const openNew = (mode: 'partner' | 'expense') =>
    router.push({ pathname: '/org/[id]/request/new', params: { id: org.id, mode } });
  const openRequest = (requestId: string) =>
    router.push({ pathname: '/org/[id]/request/[requestId]', params: { id: org.id, requestId } });

  return (
    <>
      <Stack.Screen options={{ title: 'Money' }} />
      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>University account balance</Text>
          <Text style={styles.balance}>{formatMoney(total)}</Text>
          <Text style={styles.muted}>
            {free === total
              ? 'Held by the university. Every transaction is visible to Student Activities.'
              : `${formatMoney(free)} available after requests waiting on signatures.`}
          </Text>
        </Card>

        {officer ? (
          <View style={styles.actions}>
            <Button
              label="Order from a partner"
              icon="restaurant-outline"
              onPress={() => openNew('partner')}
              style={styles.flex}
            />
            <Button
              label="Request funds"
              icon="cash-outline"
              variant="secondary"
              onPress={() => openNew('expense')}
              style={styles.flex}
            />
          </View>
        ) : (
          <Text style={[styles.muted, styles.note]}>
            Members can see every transaction. Only officers can request or approve spending.
          </Text>
        )}

        {pending.length > 0 && (
          <>
            <SectionLabel>Waiting on signatures</SectionLabel>
            {pending.map((request) => (
              <RequestRow
                key={request.id}
                org={org}
                request={request}
                onPress={() => openRequest(request.id)}
              />
            ))}
          </>
        )}

        {card && (
          <>
            <SectionLabel>Org card</SectionLabel>
            <View style={[styles.card, card.frozen && styles.cardFrozen]}>
              <View style={styles.cardTop}>
                <Text style={styles.cardOrg}>{org.name}</Text>
                {card.frozen && <Pill label="Frozen" tone="neutral" />}
              </View>
              <Text style={styles.cardNumber}>•••• •••• •••• {card.last4}</Text>
              <Text style={styles.cardMeta}>
                {formatMoney(cardSpend)} of {formatMoney(card.monthlyLimit)} spent this month
              </Text>
              <View style={styles.cardTrack}>
                <View
                  style={[
                    styles.cardFill,
                    { width: `${Math.min(100, (cardSpend / card.monthlyLimit) * 100)}%` },
                  ]}
                />
              </View>
            </View>
            {canManageCard(org) ? (
              <View style={styles.cardControls}>
                <Text style={styles.controlLabel}>Monthly limit</Text>
                <View style={styles.chips}>
                  {LIMITS.map((limit) => (
                    <Chip
                      key={limit}
                      label={formatMoney(limit).replace('.00', '')}
                      selected={card.monthlyLimit === limit}
                      onPress={() => setCardLimit(org.id, limit)}
                    />
                  ))}
                </View>
                <Button
                  label={card.frozen ? 'Unfreeze card' : 'Freeze card'}
                  icon={card.frozen ? 'play-outline' : 'snow-outline'}
                  variant="secondary"
                  onPress={() => toggleCardFrozen(org.id)}
                />
              </View>
            ) : (
              <Text style={[styles.muted, styles.note]}>
                The president and treasurer set the card limit.
              </Text>
            )}
          </>
        )}

        <SectionLabel>Transactions</SectionLabel>
        {transactions.map((transaction) => {
          const incoming = transaction.direction === 'in';
          const partner = findPartner(transaction.vendorId);
          const body = (
            <>
              <View style={[styles.txIcon, incoming ? styles.txIn : styles.txOut]}>
                {partner ? (
                  <Text>{partner.emoji}</Text>
                ) : (
                  <Ionicons
                    name={incoming ? 'arrow-down' : transaction.method === 'card' ? 'card-outline' : 'arrow-up'}
                    size={16}
                    color={incoming ? colors.success : colors.text}
                  />
                )}
              </View>
              <View style={styles.flex}>
                <Text style={styles.txTitle} numberOfLines={1}>
                  {transaction.description}
                </Text>
                <Text style={styles.muted}>
                  {transaction.category} · {formatDate(transaction.at)}
                  {transaction.method === 'card' ? ' · Card' : ''}
                  {transaction.method === 'request' ? ' · Officer approved' : ''}
                </Text>
              </View>
              <Text style={[styles.txAmount, incoming && styles.txAmountIn]}>
                {incoming ? '+' : '−'}
                {formatMoney(transaction.amount)}
              </Text>
            </>
          );
          return transaction.requestId ? (
            <Pressable
              key={transaction.id}
              style={styles.tx}
              onPress={() => openRequest(transaction.requestId!)}>
              {body}
            </Pressable>
          ) : (
            <View key={transaction.id} style={styles.tx}>
              {body}
            </View>
          );
        })}

        {declined.length > 0 && (
          <>
            <SectionLabel>Declined</SectionLabel>
            {declined.map((request) => (
              <RequestRow
                key={request.id}
                org={org}
                request={request}
                onPress={() => openRequest(request.id)}
              />
            ))}
          </>
        )}
      </ScrollView>
    </>
  );
}

function RequestRow({ org, request, onPress }: { org: Org; request: FundRequest; onPress: () => void }) {
  const officers = officerIds(org);
  const missing = missingSigners(org, request);
  const status = requestStatus(request);
  const partner = findPartner(request.vendorId);
  return (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
      <Card style={styles.request}>
        <Text style={styles.requestEmoji}>{partner?.emoji ?? '🧾'}</Text>
        <View style={styles.flex}>
          <Text style={styles.txTitle} numberOfLines={1}>
            {request.title}
          </Text>
          <Text style={styles.muted}>
            {status === 'rejected'
              ? 'Declined'
              : `${officers.length - missing.length} of ${officers.length} officers signed`}
          </Text>
          {missing.includes(ME) && <Pill label="Needs your signature" tone="warning" />}
        </View>
        <Text style={styles.txAmount}>{formatMoney(request.amount)}</Text>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  flex: {
    flex: 1,
  },
  pressed: {
    opacity: 0.8,
  },
  balanceCard: {
    gap: 4,
  },
  balanceLabel: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '700',
  },
  balance: {
    color: colors.text,
    fontSize: 36,
    fontWeight: '800',
  },
  muted: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  note: {
    marginTop: 10,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  request: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    marginBottom: 10,
  },
  requestEmoji: {
    fontSize: 26,
  },
  card: {
    padding: 20,
    gap: 10,
    borderRadius: radius.lg,
    backgroundColor: colors.text,
  },
  cardFrozen: {
    opacity: 0.55,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardOrg: {
    color: colors.accent,
    fontSize: 15,
    fontWeight: '800',
  },
  cardNumber: {
    color: '#fff',
    fontSize: 18,
    letterSpacing: 2,
    fontWeight: '600',
  },
  cardMeta: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 13,
  },
  cardTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.2)',
    overflow: 'hidden',
  },
  cardFill: {
    height: '100%',
    backgroundColor: colors.accent,
  },
  cardControls: {
    gap: 10,
    marginTop: 12,
  },
  controlLabel: {
    color: colors.text,
    fontWeight: '700',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tx: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  txIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txIn: {
    backgroundColor: colors.successSoft,
  },
  txOut: {
    backgroundColor: colors.surfaceMuted,
  },
  txTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  txAmount: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  txAmountIn: {
    color: colors.success,
  },
});
