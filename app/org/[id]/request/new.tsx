import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Cart, type CartLine, DeliveryForm, MenuItem } from '@/components/PartnerOrder';
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

const MINUTE = 60_000;
const TIPS = [0, 10, 15, 20];

function parseDollars(text: string) {
  const value = Number(text.replace(/[^0-9.]/g, ''));
  return Number.isFinite(value) ? Math.round(value * 100) : 0;
}

function roundUpToHalfHour(ts: number) {
  const step = 30 * MINUTE;
  return Math.ceil(ts / step) * step;
}

function tomorrowAt(now: number, hour: number) {
  const date = new Date(now);
  date.setDate(date.getDate() + 1);
  date.setHours(hour, 0, 0, 0);
  return date.getTime();
}

export default function NewRequestScreen() {
  const params = useLocalSearchParams<{ id: string; mode?: string }>();
  const state = useAppState();
  const now = useNow();
  const insets = useSafeAreaInsets();
  const org = state.orgs.find((candidate) => candidate.id === params.id);

  const [mode, setMode] = useState<Mode>(params.mode === 'expense' ? 'expense' : 'partner');
  const [partnerId, setPartnerId] = useState(PARTNERS[0].id);
  const [carts, setCarts] = useState<Record<string, CartLine[]>>({});
  const [location, setLocation] = useState('');
  const [chosenTime, setChosenTime] = useState<number | null>(null);
  const [contactId, setContactId] = useState(ME);
  const [instructions, setInstructions] = useState('');
  const [tipPercent, setTipPercent] = useState(15);
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
  const cart = carts[partner.id] ?? [];
  const setCart = (lines: CartLine[]) => setCarts((current) => ({ ...current, [partner.id]: lines }));
  const subtotal = cart.reduce((total, line) => total + line.unitPrice * line.quantity, 0);
  const deliveryFee = cart.length ? partner.deliveryFee : 0;
  const tip = Math.round((subtotal * tipPercent) / 100);
  const amount = mode === 'partner' ? subtotal + deliveryFee + tip : parseDollars(amountText);

  const events = state.events
    .filter((event) => event.orgId === org.id)
    .filter((event) => isPollOpen(event, now) || leadingOption(state, event).startsAt >= now);
  const event = events.find((candidate) => candidate.id === eventId);
  const eventStart = event && !isPollOpen(event, now) ? leadingOption(state, event).startsAt : undefined;
  const earliest = roundUpToHalfHour(now + partner.leadMinutes * MINUTE);
  const suggestedTime = eventStart !== undefined ? eventStart - 15 * MINUTE : tomorrowAt(now, 18);
  const deliverAt = Math.max(chosenTime ?? suggestedTime, earliest);

  const finalTitle =
    title.trim() || (mode === 'partner' ? (event ? `Food for ${event.title}` : `${partner.name} order`) : '');
  const free = available(state, org.id);
  const otherOfficers = officerIds(org).filter((userId) => userId !== ME).length;

  const problem =
    mode === 'partner' && cart.length === 0
      ? 'Add something to the order.'
      : mode === 'partner' && !location.trim()
        ? 'Where should it be delivered?'
        : !finalTitle
          ? 'Say what the money is for.'
          : amount <= 0
            ? 'Enter an amount.'
            : amount > free
              ? `That's more than the ${formatMoney(free)} available.`
              : undefined;

  const submit = () => {
    if (problem) return;
    const partnerOrder = mode === 'partner';
    const requestId = createRequest({
      orgId: org.id,
      title: finalTitle,
      amount,
      category: partnerOrder ? 'Food' : category,
      vendorId: partnerOrder ? partner.id : undefined,
      items: partnerOrder
        ? cart.map(({ name, quantity, unitPrice, details, note: lineNote }) => ({
            name,
            quantity,
            unitPrice,
            details: details || undefined,
            note: lineNote || undefined,
          }))
        : undefined,
      delivery: partnerOrder
        ? { location: location.trim(), deliverAt, contactId, instructions: instructions.trim() }
        : undefined,
      charges: partnerOrder ? { subtotal, deliveryFee, tip } : undefined,
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
              University partners are already approved vendors. Build the order, say where and when
              to deliver, and it&apos;s placed the moment every officer signs. No reimbursement
              paperwork.
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

            <SectionLabel>Menu</SectionLabel>
            {partner.items.map((item) => (
              <MenuItem
                key={`${partner.id}:${item.id}`}
                item={item}
                onAdd={(line) => setCart([...cart, line])}
              />
            ))}

            <SectionLabel>Your order</SectionLabel>
            <Card>
              <Cart lines={cart} onChange={setCart} />
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

        {events.length > 0 && (
          <>
            <SectionLabel>For an event? (optional)</SectionLabel>
            <View style={styles.chips}>
              {events.map((option) => (
                <Chip
                  key={option.id}
                  label={
                    isPollOpen(option, now)
                      ? `${option.title} (date TBD)`
                      : `${option.title} · ${formatDay(leadingOption(state, option).startsAt)}`
                  }
                  selected={eventId === option.id}
                  onPress={() => {
                    setEventId(eventId === option.id ? undefined : option.id);
                    setChosenTime(null);
                  }}
                />
              ))}
            </View>
          </>
        )}

        {mode === 'partner' && (
          <>
            <SectionLabel>Delivery</SectionLabel>
            {eventStart !== undefined && chosenTime === null && (
              <Text style={[styles.hint, styles.hintTop]}>
                Timed to arrive 15 minutes before {event?.title} starts.
              </Text>
            )}
            {event && eventStart === undefined && (
              <Text style={[styles.hint, styles.hintTop]}>
                {event.title} is still voting on a date, so pick a delivery time.
              </Text>
            )}
            <DeliveryForm
              location={location}
              onLocation={setLocation}
              deliverAt={deliverAt}
              onDeliverAt={setChosenTime}
              earliest={earliest}
              contactId={contactId}
              onContact={setContactId}
              officers={officerIds(org).map((userId) => state.users[userId])}
              instructions={instructions}
              onInstructions={setInstructions}
              now={now}
            />

            <SectionLabel>Tip for the driver</SectionLabel>
            <View style={styles.chips}>
              {TIPS.map((percent) => (
                <Chip
                  key={percent}
                  label={percent ? `${percent}%` : 'None'}
                  selected={percent === tipPercent}
                  onPress={() => setTipPercent(percent)}
                />
              ))}
            </View>

            <SectionLabel>Name</SectionLabel>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder={finalTitle}
              placeholderTextColor={colors.textMuted}
              style={styles.input}
            />
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
        {mode === 'partner' && cart.length > 0 && (
          <Text style={styles.breakdown}>
            Food {formatMoney(subtotal)}
            {deliveryFee ? ` · Delivery ${formatMoney(deliveryFee)}` : ' · Free delivery'}
            {tip ? ` · Tip ${formatMoney(tip)}` : ''} · No sales tax
          </Text>
        )}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.total}>{formatMoney(amount)}</Text>
        </View>
        <Text style={styles.footerNote}>
          {problem ??
            (otherOfficers
              ? `You sign first, then ${otherOfficers} other ${otherOfficers === 1 ? 'officer signs' : 'officers sign'}.${mode === 'partner' ? ` The order goes to ${partner.name} the moment the last one does.` : ` ${formatMoney(free)} available.`}`
              : `You're the only officer, so this is ${mode === 'partner' ? 'ordered' : 'paid'} as soon as you sign.`)}
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
  hintTop: {
    marginTop: 0,
    marginBottom: 8,
  },
  breakdown: {
    color: colors.textMuted,
    fontSize: 12,
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
