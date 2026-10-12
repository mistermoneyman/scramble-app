import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Chip, EmptyState, SectionLabel } from '@/components/ui';
import { colors, radius } from '@/constants/theme';
import { useNow } from '@/hooks/useNow';
import { DEPARTMENTS } from '@/lib/departments';
import { formatDay, formatMoney } from '@/lib/format';
import { activeCard, available, cardSpendThisMonth, isOfficer } from '@/lib/orgRules';
import { isPollOpen, leadingOption } from '@/lib/selectors';
import {
  cardPaymentProblem,
  ME,
  payUniversity,
  payWithCard,
  useAppState,
} from '@/lib/store';
import type { Category } from '@/lib/types';

const CATEGORIES: Category[] = ['Food', 'Supplies', 'Travel', 'Marketing', 'Events', 'Other'];
const STORES = ['Office Depot', 'Staples', 'Target', 'Amazon'];

type Step = 'form' | 'tap' | 'done';

function parseDollars(text: string) {
  const value = Number(text.replace(/[^0-9.]/g, ''));
  return Number.isFinite(value) ? Math.round(value * 100) : 0;
}

export default function PayScreen() {
  const params = useLocalSearchParams<{ id: string; mode?: string }>();
  const state = useAppState();
  const now = useNow();
  const insets = useSafeAreaInsets();
  const org = state.orgs.find((candidate) => candidate.id === params.id);
  const university = params.mode === 'university';

  const [step, setStep] = useState<Step>('form');
  const [merchant, setMerchant] = useState('');
  const [departmentId, setDepartmentId] = useState(DEPARTMENTS[0].id);
  const [amountText, setAmountText] = useState('');
  const [purpose, setPurpose] = useState('');
  const [category, setCategory] = useState<Category | null>(null);
  const [eventId, setEventId] = useState<string | undefined>();

  const title = university ? 'Pay the university' : 'Pay at a store';

  if (!org || !isOfficer(org)) {
    return (
      <>
        <Stack.Screen options={{ title }} />
        <EmptyState icon="lock-closed-outline" title="Officers only" />
      </>
    );
  }

  const card = activeCard(state, org.id, ME, now);
  if (!university && !card && step === 'form') {
    return (
      <>
        <Stack.Screen options={{ title }} />
        <EmptyState
          icon="card-outline"
          title="You don't have a card for this org"
          body="Ask the president or treasurer to issue you one, or pay a campus office from your account instead."
        />
      </>
    );
  }

  const department = DEPARTMENTS.find((candidate) => candidate.id === departmentId) ?? DEPARTMENTS[0];
  const finalCategory = category ?? (university ? department.category : 'Supplies');
  const amount = parseDollars(amountText);
  const payee = university ? department.name : merchant.trim();
  const free = available(state, org.id);
  const settings = state.cardSettings[org.id];
  const cardLeft = settings ? settings.monthlyLimit - cardSpendThisMonth(state, org.id, now) : 0;
  const events = state.events
    .filter((event) => event.orgId === org.id)
    .filter((event) => isPollOpen(event, now) || leadingOption(state, event).startsAt >= now);

  const problem = !payee
    ? 'Where are you paying?'
    : !purpose.trim()
      ? 'Say what the money is for.'
      : amount <= 0
        ? 'Enter an amount.'
        : university
          ? amount > free
            ? `That's more than the ${formatMoney(free)} available.`
            : undefined
          : cardPaymentProblem(state, org.id, amount);

  const pay = () => {
    const input = {
      orgId: org.id,
      amount,
      category: finalCategory,
      purpose: purpose.trim(),
      eventId,
    };
    if (university) payUniversity({ ...input, departmentId: department.id });
    else payWithCard({ ...input, merchant: payee });
    setStep('done');
  };

  if (step === 'done') {
    return (
      <>
        <Stack.Screen options={{ title, headerBackVisible: false }} />
        <View style={styles.center}>
          <View style={styles.doneIcon}>
            <Ionicons name="checkmark" size={44} color="#fff" />
          </View>
          <Text style={styles.doneTitle}>
            {university ? 'Sent' : 'Paid'} {formatMoney(amount)}
          </Text>
          <Text style={styles.doneSub}>
            {university ? `to ${payee}` : `at ${payee}`} for {purpose.trim()}
          </Text>
          <Text style={styles.doneNote}>
            {university
              ? 'The university moved it between accounts on the back end. No card, no receipt to turn in.'
              : 'Charged to the org account and recorded with what it was for. No receipt to turn in.'}{' '}
            It&apos;s in the ledger and the year-end report under {finalCategory}.
          </Text>
          <Button label="Done" onPress={() => router.back()} style={styles.doneButton} />
        </View>
      </>
    );
  }

  if (step === 'tap' && card) {
    return (
      <>
        <Stack.Screen options={{ title }} />
        <View style={styles.center}>
          <View style={styles.reader}>
            <Ionicons name="wifi" size={64} color={colors.primary} style={styles.contactless} />
          </View>
          <Text style={styles.doneTitle}>Hold near the reader</Text>
          <Text style={styles.doneSub}>
            {payee} · up to {formatMoney(amount)}
          </Text>
          <Text style={styles.doneNote}>
            Card •••• {card.last4} is approved for this purchase only: {purpose.trim()}. Anything
            over {formatMoney(amount)} is declined.
          </Text>
          <Button label="Simulate tap" icon="phone-portrait-outline" onPress={pay} style={styles.doneButton} />
          <Pressable onPress={() => setStep('form')} hitSlop={10}>
            <Text style={styles.cancel}>Cancel</Text>
          </Pressable>
        </View>
      </>
    );
  }

  return (
    <View style={styles.flex}>
      <Stack.Screen options={{ title }} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.explain}>
          <Ionicons
            name={university ? 'business-outline' : 'phone-portrait-outline'}
            size={22}
            color={colors.primary}
          />
          <Text style={styles.explainText}>
            {university
              ? 'For campus offices. The money moves from your org account to theirs on the university\u2019s books. No card or Apple Pay.'
              : 'For off-campus stores. Say what it\u2019s for, then tap your phone to pay with your officer card.'}
          </Text>
        </View>

        {university ? (
          <>
            <SectionLabel>Campus office</SectionLabel>
            {DEPARTMENTS.map((candidate) => {
              const selected = candidate.id === department.id;
              return (
                <Pressable
                  key={candidate.id}
                  onPress={() => {
                    setDepartmentId(candidate.id);
                    setCategory(null);
                  }}
                  style={[styles.department, selected && styles.departmentSelected]}>
                  <Text style={styles.departmentEmoji}>{candidate.emoji}</Text>
                  <View style={styles.flex}>
                    <Text style={styles.departmentName}>{candidate.name}</Text>
                    <Text style={styles.muted}>{candidate.blurb}</Text>
                  </View>
                  {selected && <Ionicons name="checkmark-circle" size={22} color={colors.primary} />}
                </Pressable>
              );
            })}
          </>
        ) : (
          <>
            <SectionLabel>Store</SectionLabel>
            <TextInput
              value={merchant}
              onChangeText={setMerchant}
              placeholder="Where are you buying?"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
            />
            <View style={styles.chips}>
              {STORES.map((store) => (
                <Chip
                  key={store}
                  label={store}
                  selected={merchant === store}
                  onPress={() => setMerchant(store)}
                />
              ))}
            </View>
          </>
        )}

        <SectionLabel>What&apos;s it for?</SectionLabel>
        <TextInput
          value={purpose}
          onChangeText={setPurpose}
          placeholder={university ? 'e.g. Posters for the info session' : 'e.g. Printing flyers for Pitch Night'}
          placeholderTextColor={colors.textMuted}
          style={styles.input}
        />
        <TextInput
          value={amountText}
          onChangeText={setAmountText}
          placeholder={university ? 'Amount ($)' : 'Up to ($)'}
          placeholderTextColor={colors.textMuted}
          keyboardType="decimal-pad"
          style={styles.input}
        />

        <SectionLabel>Category</SectionLabel>
        <View style={styles.chips}>
          {CATEGORIES.map((option) => (
            <Chip
              key={option}
              label={option}
              selected={option === finalCategory}
              onPress={() => setCategory(option)}
            />
          ))}
        </View>

        {events.length > 0 && (
          <>
            <SectionLabel>For an event? (optional)</SectionLabel>
            <View style={styles.chips}>
              {events.map((event) => (
                <Chip
                  key={event.id}
                  label={
                    isPollOpen(event, now)
                      ? `${event.title} (date TBD)`
                      : `${event.title} · ${formatDay(leadingOption(state, event).startsAt)}`
                  }
                  selected={eventId === event.id}
                  onPress={() => setEventId(eventId === event.id ? undefined : event.id)}
                />
              ))}
            </View>
          </>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <Text style={styles.footerNote}>
          {problem ??
            (university
              ? `${formatMoney(free)} available in the org account.`
              : `Card •••• ${card?.last4} · ${formatMoney(cardLeft)} left this month.`)}
        </Text>
        <Button
          label={university ? `Send ${formatMoney(amount)} to ${department.name}` : 'Continue to pay'}
          icon={university ? 'swap-horizontal' : 'phone-portrait-outline'}
          disabled={!!problem}
          onPress={university ? pay : () => setStep('tap')}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 24,
  },
  explain: {
    flexDirection: 'row',
    gap: 12,
    padding: 14,
    borderRadius: radius.lg,
    backgroundColor: colors.primarySoft,
  },
  explainText: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  muted: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  department: {
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
  departmentSelected: {
    borderColor: colors.primary,
  },
  departmentEmoji: {
    fontSize: 26,
  },
  departmentName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
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
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  footerNote: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    gap: 10,
  },
  reader: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
    marginBottom: 12,
  },
  contactless: {
    transform: [{ rotate: '90deg' }],
  },
  doneIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.success,
    marginBottom: 12,
  },
  doneTitle: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
  },
  doneSub: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  doneNote: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  doneButton: {
    alignSelf: 'stretch',
    marginTop: 16,
  },
  cancel: {
    color: colors.textMuted,
    fontWeight: '700',
    marginTop: 8,
  },
});
