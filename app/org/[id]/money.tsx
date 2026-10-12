import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { OfficerCards } from '@/components/OfficerCards';
import { Card, EmptyState, type IconName, Pill, SectionLabel } from '@/components/ui';
import { colors } from '@/constants/theme';
import { useNow } from '@/hooks/useNow';
import { firstName, formatDate, formatMoney } from '@/lib/format';
import {
  available,
  balance,
  isOfficer,
  missingSigners,
  officerIds,
  orgRequests,
  orgTransactions,
  requestStatus,
} from '@/lib/orgRules';
import { findDepartment } from '@/lib/departments';
import { findPartner } from '@/lib/partners';
import { isMember } from '@/lib/selectors';
import { ME, useAppState } from '@/lib/store';
import type { FundRequest, Org } from '@/lib/types';

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
  const transactions = orgTransactions(state, org.id);
  const cardLabel = (cardId?: string) => {
    const card = state.cards.find((candidate) => candidate.id === cardId);
    if (!card) return 'Card';
    return `${firstName(state.users[card.holderId]?.name ?? '')}'s card •••• ${card.last4}`;
  };

  const openNew = (mode: 'partner' | 'expense') =>
    router.push({ pathname: '/org/[id]/request/new', params: { id: org.id, mode } });
  const openPay = (mode: 'card' | 'university') =>
    router.push({ pathname: '/org/[id]/pay', params: { id: org.id, mode } });
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
          <Card style={styles.spend}>
            <SpendOption
              icon="phone-portrait-outline"
              title="Pay at a store"
              body="Off-campus, like printing at Office Depot. Say what it's for, then tap your phone."
              onPress={() => openPay('card')}
            />
            <SpendOption
              icon="business-outline"
              title="Pay the university"
              body="Campus offices like the print center or room bookings. Moved account to account, no card."
              onPress={() => openPay('university')}
            />
            <SpendOption
              icon="restaurant-outline"
              title="Order from a partner"
              body="Approved campus food vendors. Every officer signs, then it's ordered."
              onPress={() => openNew('partner')}
            />
            <SpendOption
              icon="cash-outline"
              title="Request funds"
              body="Reimbursements and bigger purchases. Every officer signs."
              onPress={() => openNew('expense')}
              last
            />
          </Card>
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

        <OfficerCards state={state} org={org} now={now} />

        <SectionLabel>Transactions</SectionLabel>
        {transactions.map((transaction) => {
          const incoming = transaction.direction === 'in';
          const partner = findPartner(transaction.vendorId);
          const department = findDepartment(transaction.departmentId);
          const emoji = partner?.emoji ?? department?.emoji;
          const body = (
            <>
              <View style={[styles.txIcon, incoming ? styles.txIn : styles.txOut]}>
                {emoji ? (
                  <Text>{emoji}</Text>
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
                  {transaction.method === 'card'
                    ? ` · ${transaction.merchant ? `${transaction.merchant} · ` : ''}${cardLabel(transaction.cardId)}`
                    : ''}
                  {transaction.method === 'transfer' && department
                    ? ` · University transfer to ${department.name}`
                    : ''}
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

function SpendOption({
  icon,
  title,
  body,
  onPress,
  last,
}: {
  icon: IconName;
  title: string;
  body: string;
  onPress: () => void;
  last?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.spendRow, !last && styles.spendDivider, pressed && styles.pressed]}>
      <View style={styles.spendIcon}>
        <Ionicons name={icon} size={20} color={colors.primary} />
      </View>
      <View style={styles.flex}>
        <Text style={styles.txTitle}>{title}</Text>
        <Text style={styles.muted}>{body}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </Pressable>
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
  spend: {
    marginTop: 12,
    paddingVertical: 4,
    paddingHorizontal: 14,
  },
  spendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  spendDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  spendIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
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
