import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Card, Chip, EmptyState, Segmented, SectionLabel } from '@/components/ui';
import { colors, radius } from '@/constants/theme';
import { useNow } from '@/hooks/useNow';
import { formatDay, formatMoney } from '@/lib/format';
import { available, isOfficer, officerIds } from '@/lib/orgRules';
import { PARTNERS } from '@/lib/partners';
import { isPollOpen, leadingOption } from '@/lib/selectors';
import { createRequest, ME, useAppState } from '@/lib/store';
import type { Category } from '@/lib/types';

type Mode = 'partner' | 'expense';

const MODES: { value: Mode; label: string }[] = [
  { value: 'partner', label: 'Partner order' },
  { value: 'expense', label: 'Other expense' },
];

const CATEGORIES: Category[] = ['Food', 'Supplies', 'Travel', 'Marketing', 'Events', 'Other'];

function parseDollars(text: string) {
  const value = Number(text.replace(/[^0-9.]/g, ''));
  return Number.isFinite(value) ? Math.round(value * 100) : 0;
}

export default function NewRequestScreen() {
  const params = useLocalSearchParams<{ id: string; mode?: string }>();
  const state = useAppState();
  const now = useNow();
  const insets = useSafeAreaInsets();
  const org = state.orgs.find((candidate) => candidate.id === params.id);

  const [mode, setMode] = useState<Mode>(params.mode === 'expense' ? 'expense' : 'partner');
  const [partnerId, setPartnerId] = useState(PARTNERS[0].id);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [title, setTitle] = useState('');
  const [amountText, setAmountText] = useState('');
  const [category, setCategory] = useState<Category>('Supplies');
  const [eventId, setEventId] = useState<string | undefined>();
  const [note, setNote] = useState('');

  if (!org || !isOfficer(org)) {
    return (
      <EmptyState
        icon="lock-closed-outline"
        title="Officers only"
        body="Ask one of your officers to request funds."
      />
    );
  }

  const partner = PARTNERS.find((candidate) => candidate.id === partnerId) ?? PARTNERS[0];
  const items = partner.items
    .filter((item) => (quantities[`${partner.id}:${item.id}`] ?? 0) > 0)
    .map((item) => ({
      name: item.name,
      quantity: quantities[`${partner.id}:${item.id}`],
      unitPrice: item.price,
    }));
  const amount =
    mode === 'partner'
      ? items.reduce((total, item) => total + item.quantity * item.unitPrice, 0)
      : parseDollars(amountText);
  const finalTitle = title.trim() || (mode === 'partner' ? `${partner.name} order` : '');
  const free = available(state, org.id);
  const otherOfficers = officerIds(org).filter((userId) => userId !== ME).length;
  const events = state.events
    .filter((event) => event.orgId === org.id)
    .filter((event) => isPollOpen(event, now) || leadingOption(state, event).startsAt >= now);

  const problem =
    mode === 'partner' && items.length === 0
      ? 'Add something to the order.'
      : !finalTitle
        ? 'Say what the money is for.'
        : amount <= 0
          ? 'Enter an amount.'
          : amount > free
            ? `That's more than the ${formatMoney(free)} available.`
            : undefined;

  const changeQuantity = (itemId: string, delta: number) => {
    const key = `${partner.id}:${itemId}`;
    setQuantities((current) => ({ ...current, [key]: Math.max(0, (current[key] ?? 0) + delta) }));
  };

  const submit = () => {
    if (problem) return;
    const requestId = createRequest({
      orgId: org.id,
      title: finalTitle,
      amount,
      category: mode === 'partner' ? 'Food' : category,
      vendorId: mode === 'partner' ? partner.id : undefined,
      items: mode === 'partner' ? items : undefined,
      eventId,
      note: note.trim(),
    });
    router.replace({ pathname: '/org/[id]/request/[requestId]', params: { id: org.id, requestId } });
  };

  return (
    <View style={styles.flex}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Segmented options={MODES} value={mode} onChange={setMode} />

        {mode === 'partner' ? (
          <>
            <Text style={styles.hint}>
              University partners are already approved vendors, so there&apos;s no reimbursement
              paperwork. Once every officer signs, the order is paid and placed.
            </Text>
            <SectionLabel>Partner</SectionLabel>
            <View style={styles.partners}>
              {PARTNERS.map((candidate) => {
                const selected = candidate.id === partner.id;
                return (
                  <Pressable
                    key={candidate.id}
                    onPress={() => setPartnerId(candidate.id)}
                    style={[styles.partner, selected && styles.partnerSelected]}>
                    <Text style={styles.partnerEmoji}>{candidate.emoji}</Text>
                    <Text style={styles.partnerName} numberOfLines={2}>
                      {candidate.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={styles.hint}>{partner.blurb}</Text>

            <SectionLabel>Order</SectionLabel>
            <Card style={styles.menu}>
              {partner.items.map((item) => {
                const quantity = quantities[`${partner.id}:${item.id}`] ?? 0;
                return (
                  <View key={item.id} style={styles.menuRow}>
                    <View style={styles.flex}>
                      <Text style={styles.menuName}>{item.name}</Text>
                      <Text style={styles.muted}>{formatMoney(item.price)}</Text>
                    </View>
                    <Pressable
                      hitSlop={8}
                      onPress={() => changeQuantity(item.id, -1)}
                      disabled={quantity === 0}
                      accessibilityLabel={`Remove one ${item.name}`}>
                      <Ionicons
                        name="remove-circle-outline"
                        size={28}
                        color={quantity ? colors.primary : colors.border}
                      />
                    </Pressable>
                    <Text style={styles.quantity}>{quantity}</Text>
                    <Pressable
                      hitSlop={8}
                      onPress={() => changeQuantity(item.id, 1)}
                      accessibilityLabel={`Add one ${item.name}`}>
                      <Ionicons name="add-circle" size={28} color={colors.primary} />
                    </Pressable>
                  </View>
                );
              })}
            </Card>
          </>
        ) : (
          <>
            <SectionLabel>What&apos;s it for?</SectionLabel>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Banner for the activities fair"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
            />
            <TextInput
              value={amountText}
              onChangeText={setAmountText}
              placeholder="Amount ($)"
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
                  selected={option === category}
                  onPress={() => setCategory(option)}
                />
              ))}
            </View>
          </>
        )}

        {mode === 'partner' && (
          <>
            <SectionLabel>Name</SectionLabel>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder={`${partner.name} order`}
              placeholderTextColor={colors.textMuted}
              style={styles.input}
            />
          </>
        )}

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

        <SectionLabel>Note for officers (optional)</SectionLabel>
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="Anything they should know"
          placeholderTextColor={colors.textMuted}
          style={[styles.input, styles.multiline]}
          multiline
        />
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.total}>{formatMoney(amount)}</Text>
        </View>
        <Text style={styles.footerNote}>
          {problem ??
            (otherOfficers
              ? `You sign first, then ${otherOfficers} other ${otherOfficers === 1 ? 'officer signs' : 'officers sign'}. ${formatMoney(free)} available.`
              : `You're the only officer, so this is paid as soon as you sign.`)}
        </Text>
        <Button label="Sign and send" icon="create-outline" disabled={!!problem} onPress={submit} />
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
  hint: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 10,
  },
  muted: {
    color: colors.textMuted,
    fontSize: 13,
  },
  partners: {
    flexDirection: 'row',
    gap: 8,
  },
  partner: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  partnerSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  partnerEmoji: {
    fontSize: 26,
  },
  partnerName: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  menu: {
    padding: 4,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
  },
  menuName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  quantity: {
    minWidth: 20,
    textAlign: 'center',
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
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
    minHeight: 70,
    textAlignVertical: 'top',
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
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  totalLabel: {
    color: colors.textMuted,
    fontWeight: '700',
  },
  total: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '800',
  },
  footerNote: {
    color: colors.textMuted,
    fontSize: 13,
  },
});
