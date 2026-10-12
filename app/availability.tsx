import { Stack } from 'expo-router';
import { useRef, useState } from 'react';
import {
  type GestureResponderEvent,
  type LayoutChangeEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Chip, SectionLabel } from '@/components/ui';
import { colors, radius } from '@/constants/theme';
import { useNow } from '@/hooks/useNow';
import {
  HOURS,
  slotKey,
  startOfDay,
  WEEKDAY_LABELS,
  WEEKDAYS,
} from '@/lib/availability';
import { formatTime } from '@/lib/format';
import { ME, setWeeklyAvailability, toggleAwayDay, useAppState } from '@/lib/store';

const ROW_HEIGHT = 26;
const AWAY_DAYS = 28;

const PRESETS: { label: string; slots: () => number[] }[] = [
  {
    label: 'Weekday evenings',
    slots: () => [1, 2, 3, 4, 5].flatMap((d) => [17, 18, 19, 20, 21].map((h) => slotKey(d, h))),
  },
  {
    label: 'Weekend afternoons',
    slots: () => [0, 6].flatMap((d) => [12, 13, 14, 15, 16, 17].map((h) => slotKey(d, h))),
  },
];

function hourLabel(hour: number) {
  const date = new Date(2000, 0, 1, hour);
  return formatTime(date.getTime()).replace(':00', '').replace(' ', '').toLowerCase();
}

export default function AvailabilityScreen() {
  const state = useAppState();
  const now = useNow(60_000);
  const saved = state.availability[ME] ?? { weekly: [], away: [] };
  const weekly = new Set(saved.weekly);

  const [grid, setGrid] = useState({ width: 0 });
  const paint = useRef<{ value: boolean; slots: Set<number> } | null>(null);
  const [painting, setPainting] = useState<Set<number> | null>(null);
  const [paintValue, setPaintValue] = useState(true);

  const columnWidth = grid.width / WEEKDAYS.length;

  const slotFromEvent = (event: GestureResponderEvent) => {
    const { locationX, locationY } = event.nativeEvent;
    const column = Math.floor(locationX / columnWidth);
    const row = Math.floor(locationY / ROW_HEIGHT);
    if (column < 0 || column >= WEEKDAYS.length || row < 0 || row >= HOURS.length) return undefined;
    return slotKey(WEEKDAYS[column], HOURS[row]);
  };

  const onStart = (event: GestureResponderEvent) => {
    const slot = slotFromEvent(event);
    if (slot === undefined) return;
    const value = !weekly.has(slot);
    paint.current = { value, slots: new Set([slot]) };
    setPaintValue(value);
    setPainting(new Set([slot]));
  };

  const onMove = (event: GestureResponderEvent) => {
    const slot = slotFromEvent(event);
    if (!paint.current || slot === undefined || paint.current.slots.has(slot)) return;
    paint.current.slots.add(slot);
    setPainting(new Set(paint.current.slots));
  };

  const onEnd = () => {
    const current = paint.current;
    paint.current = null;
    setPainting(null);
    if (!current) return;
    const next = new Set(weekly);
    for (const slot of current.slots) {
      if (current.value) next.add(slot);
      else next.delete(slot);
    }
    setWeeklyAvailability([...next]);
  };

  const isOn = (slot: number) =>
    painting?.has(slot) ? paintValue : weekly.has(slot);

  const applyPreset = (slots: number[]) => setWeeklyAvailability([...weekly, ...slots]);
  const today = startOfDay(now);
  const pastThisWeek = new Date(today).getDay();
  const days = Array.from(
    { length: Math.ceil((pastThisWeek + AWAY_DAYS) / 7) * 7 },
    (_, i) => startOfDay(now, i - pastThisWeek),
  );

  return (
    <>
      <Stack.Screen options={{ title: 'My availability' }} />
      <ScrollView contentContainerStyle={styles.content} scrollEnabled={!painting}>
        <Text style={styles.intro}>
          Paint the hours you&apos;re usually free. When someone plans an event, Scramble suggests
          times that work for the most people, and checks poll options against your week.
        </Text>

        <SectionLabel>Your usual week</SectionLabel>
        <View style={styles.presets}>
          {PRESETS.map((preset) => (
            <Chip key={preset.label} label={`+ ${preset.label}`} onPress={() => applyPreset(preset.slots())} />
          ))}
          <Chip label="Clear" onPress={() => setWeeklyAvailability([])} />
        </View>

        <View style={styles.gridRow}>
          <View style={styles.hours}>
            <View style={styles.headerCell} />
            {HOURS.map((hour) => (
              <Text key={hour} style={styles.hourLabel}>
                {hourLabel(hour)}
              </Text>
            ))}
          </View>
          <View style={styles.flex}>
            <View style={styles.headerRow}>
              {WEEKDAYS.map((weekday) => (
                <Text key={weekday} style={styles.weekday}>
                  {WEEKDAY_LABELS[weekday]}
                </Text>
              ))}
            </View>
            <View
              style={styles.grid}
              onLayout={(event: LayoutChangeEvent) => setGrid({ width: event.nativeEvent.layout.width })}
              onStartShouldSetResponder={() => true}
              onMoveShouldSetResponder={() => true}
              onResponderTerminationRequest={() => false}
              onResponderGrant={onStart}
              onResponderMove={onMove}
              onResponderRelease={onEnd}
              onResponderTerminate={onEnd}>
              <View style={styles.cells} pointerEvents="none">
                {HOURS.map((hour) => (
                  <View key={hour} style={styles.cellRow}>
                    {WEEKDAYS.map((weekday) => (
                      <View
                        key={weekday}
                        style={[styles.cell, isOn(slotKey(weekday, hour)) && styles.cellOn]}
                      />
                    ))}
                  </View>
                ))}
              </View>
            </View>
          </View>
        </View>
        <Text style={styles.hint}>Tap or drag across the grid. Drag over green to erase.</Text>

        <SectionLabel>Days you&apos;re away</SectionLabel>
        <Text style={styles.hint}>
          Exams, trips, a busy week. These override your usual week for that day.
        </Text>
        <View style={styles.awayGrid}>
          {days.map((day) => {
            const away = saved.away.includes(day);
            const date = new Date(day);
            const past = day < today;
            return (
              <Pressable
                key={day}
                disabled={past}
                onPress={() => toggleAwayDay(day)}
                style={[styles.awayDay, away && styles.awayDayOn, past && styles.awayDayPast]}>
                <Text style={[styles.awayWeek, away && styles.awayText]}>
                  {WEEKDAY_LABELS[date.getDay()]}
                </Text>
                <Text style={[styles.awayNumber, away && styles.awayText]}>{date.getDate()}</Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </>
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
  intro: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 21,
  },
  presets: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 6,
  },
  hours: {
    width: 34,
  },
  headerCell: {
    height: 22,
  },
  hourLabel: {
    height: ROW_HEIGHT,
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'right',
    transform: [{ translateY: -6 }],
  },
  headerRow: {
    flexDirection: 'row',
    height: 22,
  },
  weekday: {
    flex: 1,
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '800',
  },
  grid: {
    borderRadius: radius.sm,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    userSelect: 'none',
  },
  cells: {},
  cellRow: {
    flexDirection: 'row',
    height: ROW_HEIGHT,
  },
  cell: {
    flex: 1,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  cellOn: {
    backgroundColor: '#7BC47F',
  },
  hint: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 8,
  },
  awayGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  awayDay: {
    width: '12.8%',
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  awayDayPast: {
    opacity: 0.35,
  },
  awayDayOn: {
    backgroundColor: colors.text,
    borderColor: colors.text,
  },
  awayWeek: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
  },
  awayNumber: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  awayText: {
    color: '#fff',
  },
});
