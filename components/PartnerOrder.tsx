import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button, Chip } from '@/components/ui';
import { colors, radius } from '@/constants/theme';
import { startOfDay } from '@/lib/availability';
import { firstName, formatDay, formatMoney, formatTime } from '@/lib/format';
import {
  defaultSelection,
  DELIVERY_SPOTS,
  describe,
  type PartnerItem,
  priceFor,
  type Selection,
  servesFor,
} from '@/lib/partners';
import type { User } from '@/lib/types';

export type CartLine = {
  key: string;
  name: string;
  details: string;
  note: string;
  quantity: number;
  unitPrice: number;
  serves: number;
};

let lineCount = 0;

export function MenuItem({ item, onAdd }: { item: PartnerItem; onAdd: (line: CartLine) => void }) {
  const [open, setOpen] = useState(false);
  const [selection, setSelection] = useState<Selection>(() => defaultSelection(item));
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState('');

  const unitPrice = priceFor(item, selection);
  const serves = servesFor(item, selection);

  const pick = (groupId: string, choiceId: string, kind: 'one' | 'many', max?: number) =>
    setSelection((current) => {
      const picked = current[groupId] ?? [];
      if (kind === 'one') return { ...current, [groupId]: [choiceId] };
      if (picked.includes(choiceId)) {
        return { ...current, [groupId]: picked.filter((id) => id !== choiceId) };
      }
      if (max !== undefined && picked.length >= max) return current;
      return { ...current, [groupId]: [...picked, choiceId] };
    });

  const add = () => {
    onAdd({
      key: `line${lineCount++}`,
      name: item.name,
      details: describe(item, selection),
      note: note.trim(),
      quantity,
      unitPrice,
      serves,
    });
    setOpen(false);
    setSelection(defaultSelection(item));
    setQuantity(1);
    setNote('');
  };

  return (
    <View style={[styles.item, open && styles.itemOpen]}>
      <Pressable onPress={() => setOpen(!open)} style={styles.itemHeader}>
        <View style={styles.flex}>
          <Text style={styles.itemName}>{item.name}</Text>
          <Text style={styles.muted}>{item.description}</Text>
          <Text style={styles.itemMeta}>
            {formatMoney(item.price)} · feeds {item.serves}
          </Text>
        </View>
        <Ionicons
          name={open ? 'chevron-up' : 'add-circle'}
          size={open ? 22 : 28}
          color={colors.primary}
        />
      </Pressable>

      {open && (
        <View style={styles.builder}>
          {item.options.map((group) => (
            <View key={group.id} style={styles.group}>
              <Text style={styles.groupLabel}>
                {group.label}
                {group.kind === 'many' && group.max ? ` (up to ${group.max})` : ''}
              </Text>
              <View style={styles.chips}>
                {group.choices.map((c) => (
                  <Chip
                    key={c.id}
                    label={c.price ? `${c.label} ${c.price > 0 ? '+' : '−'}${formatMoney(Math.abs(c.price))}` : c.label}
                    selected={selection[group.id]?.includes(c.id)}
                    onPress={() => pick(group.id, c.id, group.kind, group.max)}
                  />
                ))}
              </View>
            </View>
          ))}

          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Special request (e.g. light sauce, cut in squares)"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />

          <View style={styles.addRow}>
            <Stepper value={quantity} min={1} onChange={setQuantity} label={item.name} />
            <Button
              label={`Add ${quantity} · ${formatMoney(unitPrice * quantity)}`}
              onPress={add}
              style={styles.flex}
            />
          </View>
        </View>
      )}
    </View>
  );
}

export function Cart({
  lines,
  onChange,
}: {
  lines: CartLine[];
  onChange: (lines: CartLine[]) => void;
}) {
  const setQuantity = (key: string, quantity: number) =>
    onChange(
      quantity <= 0
        ? lines.filter((line) => line.key !== key)
        : lines.map((line) => (line.key === key ? { ...line, quantity } : line)),
    );
  const feeds = lines.reduce((total, line) => total + line.serves * line.quantity, 0);

  if (lines.length === 0) {
    return <Text style={styles.muted}>Nothing yet. Tap an item above to build it.</Text>;
  }

  return (
    <View style={styles.cart}>
      {lines.map((line) => (
        <View key={line.key} style={styles.cartLine}>
          <View style={styles.flex}>
            <Text style={styles.itemName}>{line.name}</Text>
            {!!line.details && <Text style={styles.muted}>{line.details}</Text>}
            {!!line.note && <Text style={styles.note}>“{line.note}”</Text>}
            <Text style={styles.itemMeta}>{formatMoney(line.unitPrice * line.quantity)}</Text>
          </View>
          <Stepper
            value={line.quantity}
            min={0}
            onChange={(value) => setQuantity(line.key, value)}
            label={line.name}
          />
        </View>
      ))}
      <Text style={styles.feeds}>
        <Ionicons name="people-outline" size={14} color={colors.success} /> Feeds about {feeds}{' '}
        {feeds === 1 ? 'person' : 'people'}
      </Text>
    </View>
  );
}

function Stepper({
  value,
  min,
  onChange,
  label,
}: {
  value: number;
  min: number;
  onChange: (value: number) => void;
  label: string;
}) {
  return (
    <View style={styles.stepper}>
      <Pressable
        hitSlop={8}
        onPress={() => onChange(Math.max(min, value - 1))}
        accessibilityLabel={`Fewer ${label}`}>
        <Ionicons
          name="remove-circle-outline"
          size={26}
          color={value <= min ? colors.border : colors.primary}
        />
      </Pressable>
      <Text style={styles.stepperValue}>{value}</Text>
      <Pressable hitSlop={8} onPress={() => onChange(value + 1)} accessibilityLabel={`More ${label}`}>
        <Ionicons name="add-circle" size={26} color={colors.primary} />
      </Pressable>
    </View>
  );
}

const DELIVERY_TIMES = Array.from({ length: 28 }, (_, i) => 8 * 60 + i * 30);

export function DeliveryForm({
  location,
  onLocation,
  deliverAt,
  onDeliverAt,
  earliest,
  contactId,
  onContact,
  officers,
  instructions,
  onInstructions,
  now,
}: {
  location: string;
  onLocation: (value: string) => void;
  deliverAt: number;
  onDeliverAt: (value: number) => void;
  earliest: number;
  contactId: string;
  onContact: (value: string) => void;
  officers: User[];
  instructions: string;
  onInstructions: (value: string) => void;
  now: number;
}) {
  const day = startOfDay(deliverAt);
  const minutes = new Date(deliverAt).getHours() * 60 + new Date(deliverAt).getMinutes();
  const days = Array.from({ length: 14 }, (_, i) => startOfDay(now, i));
  const at = (dayStart: number, mins: number) => {
    const date = new Date(dayStart);
    date.setHours(Math.floor(mins / 60), mins % 60, 0, 0);
    return date.getTime();
  };

  return (
    <View style={styles.delivery}>
      <Text style={styles.groupLabel}>Where</Text>
      <TextInput
        value={location}
        onChangeText={onLocation}
        placeholder="Building and room"
        placeholderTextColor={colors.textMuted}
        style={styles.input}
      />
      <View style={styles.chips}>
        {DELIVERY_SPOTS.map((spot) => (
          <Chip key={spot} label={spot} selected={location === spot} onPress={() => onLocation(spot)} />
        ))}
      </View>

      <Text style={[styles.groupLabel, styles.spaced]}>
        When · {formatDay(deliverAt)} at {formatTime(deliverAt)}
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {days.map((value) => (
          <Chip
            key={value}
            label={formatDay(value).split(',').slice(0, 2).join(',')}
            selected={value === day}
            disabled={at(value, DELIVERY_TIMES[DELIVERY_TIMES.length - 1]) < earliest}
            onPress={() => onDeliverAt(Math.max(at(value, minutes), earliest))}
          />
        ))}
      </ScrollView>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.timeRow}
        contentContainerStyle={styles.row}>
        {DELIVERY_TIMES.map((mins) => (
          <Chip
            key={mins}
            label={formatTime(at(day, mins))}
            selected={mins === minutes}
            disabled={at(day, mins) < earliest}
            onPress={() => onDeliverAt(at(day, mins))}
          />
        ))}
      </ScrollView>

      <Text style={[styles.groupLabel, styles.spaced]}>Driver calls</Text>
      <View style={styles.chips}>
        {officers.map((user) => (
          <Chip
            key={user.id}
            label={firstName(user.name)}
            selected={user.id === contactId}
            onPress={() => onContact(user.id)}
          />
        ))}
      </View>

      <TextInput
        value={instructions}
        onChangeText={onInstructions}
        placeholder="Delivery instructions (e.g. side entrance, ask for the Startup Club table)"
        placeholderTextColor={colors.textMuted}
        style={[styles.input, styles.spaced, styles.multiline]}
        multiline
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  muted: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  item: {
    marginBottom: 8,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  itemOpen: {
    borderColor: colors.primary,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
  },
  itemName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  itemMeta: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  builder: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    gap: 12,
  },
  group: {
    gap: 6,
  },
  groupLabel: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
  },
  multiline: {
    minHeight: 64,
    textAlignVertical: 'top',
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepperValue: {
    minWidth: 22,
    textAlign: 'center',
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  cart: {
    gap: 12,
  },
  cartLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  note: {
    color: colors.text,
    fontSize: 13,
    fontStyle: 'italic',
  },
  feeds: {
    color: colors.success,
    fontSize: 13,
    fontWeight: '700',
  },
  delivery: {
    gap: 8,
  },
  spaced: {
    marginTop: 8,
  },
  row: {
    gap: 6,
  },
  timeRow: {
    marginTop: 2,
  },
});
