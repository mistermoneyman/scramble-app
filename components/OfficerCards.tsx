import { Ionicons } from '@expo/vector-icons';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar, Button, Card, Chip, Pill, SectionLabel } from '@/components/ui';
import { colors, radius } from '@/constants/theme';
import { confirm } from '@/lib/confirm';
import { firstName, formatDate, formatLongDate, formatMoney } from '@/lib/format';
import {
  activeCard,
  canManageCard,
  cardSpendThisMonth,
  cardStatus,
  isOfficer,
  officerIds,
  orgCards,
  ROLE_LABELS,
} from '@/lib/orgRules';
import {
  addCardToWallet,
  deactivateCard,
  issueCard,
  ME,
  setCardLimit,
  toggleCardFrozen,
} from '@/lib/store';
import type { AppState, OfficerCard, Org } from '@/lib/types';

const LIMITS = [10000, 25000, 50000, 100000];

const WALLET = Platform.OS === 'android' ? 'Google Wallet' : 'Apple Wallet';

function expiryShort(at: number) {
  const date = new Date(at);
  return `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getFullYear()).slice(-2)}`;
}

export function OfficerCards({ state, org, now }: { state: AppState; org: Org; now: number }) {
  const settings = state.cardSettings[org.id];
  if (!settings) return null;

  const manager = canManageCard(org);
  const mine = activeCard(state, org.id, ME, now);
  const cards = orgCards(state, org.id, now);
  const orgSpend = cardSpendThisMonth(state, org.id, now);
  const withoutCard = officerIds(org).filter((userId) => !activeCard(state, org.id, userId, now));
  const role = org.officers[ME];

  const turnOff = (card: OfficerCard) =>
    confirm(
      `Turn off •••• ${card.last4}?`,
      `${state.users[card.holderId]?.name ?? 'This officer'} won't be able to use it again.`,
      'Turn off',
      () => deactivateCard(card.id),
    );

  return (
    <>
      <SectionLabel>Officer cards</SectionLabel>

      {mine ? (
        <>
          <View style={[styles.card, settings.frozen && styles.cardFrozen]}>
            <View style={styles.cardTop}>
              <Text style={styles.cardOrg}>{org.name}</Text>
              {settings.frozen ? (
                <Pill label="Frozen" tone="neutral" />
              ) : (
                <Ionicons name="wifi" size={20} color="rgba(255,255,255,0.75)" style={styles.contactless} />
              )}
            </View>
            <Text style={styles.cardNumber}>•••• •••• •••• {mine.last4}</Text>
            <View style={styles.cardBottom}>
              <View>
                <Text style={styles.cardCaption}>Officer</Text>
                <Text style={styles.cardValue}>{state.users[ME]?.name}</Text>
              </View>
              <View>
                <Text style={styles.cardCaption}>Expires</Text>
                <Text style={styles.cardValue}>{expiryShort(mine.expiresAt)}</Text>
              </View>
            </View>
          </View>
          {mine.inWallet ? (
            <Text style={[styles.muted, styles.note]}>
              <Ionicons name="checkmark-circle" size={14} color={colors.success} /> In your {WALLET}. It
              stops working on {formatLongDate(mine.expiresAt)}, or as soon as you stop being{' '}
              {role ? ROLE_LABELS[role] : 'an officer'}. Nothing to hand back.
            </Text>
          ) : (
            <Pressable
              onPress={() => addCardToWallet(mine.id)}
              style={({ pressed }) => [styles.wallet, pressed && styles.pressed]}>
              <Ionicons name="wallet" size={20} color="#fff" />
              <Text style={styles.walletText}>Add to {WALLET}</Text>
            </Pressable>
          )}
        </>
      ) : (
        <Text style={[styles.muted, styles.note]}>
          {isOfficer(org)
            ? "You don't have a card for this org yet. The president or treasurer can issue you one."
            : 'Officers carry the org card on their phones. Each one turns off when its officer leaves or the term ends.'}
        </Text>
      )}

      <Card style={styles.list}>
        <View style={styles.limitRow}>
          <Text style={styles.controlLabel}>Spent on cards this month</Text>
          <Text style={styles.controlLabel}>
            {formatMoney(orgSpend)} / {formatMoney(settings.monthlyLimit)}
          </Text>
        </View>
        <View style={styles.track}>
          <View
            style={[styles.fill, { width: `${Math.min(100, (orgSpend / settings.monthlyLimit) * 100)}%` }]}
          />
        </View>

        {cards.map((card) => {
          const status = cardStatus(card, now);
          const holder = state.users[card.holderId];
          const spent = cardSpendThisMonth(state, org.id, now, card.id);
          const holderRole = org.officers[card.holderId];
          return (
            <View key={card.id} style={[styles.row, status !== 'active' && styles.rowOff]}>
              <Avatar name={holder?.name ?? '?'} size={36} />
              <View style={styles.flex}>
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {holder?.name ?? 'Unknown'} · •••• {card.last4}
                </Text>
                <Text style={styles.muted} numberOfLines={2}>
                  {status === 'active' &&
                    `${holderRole ? ROLE_LABELS[holderRole] : 'Officer'} · ${formatMoney(spent)} this month · expires ${formatLongDate(card.expiresAt)}`}
                  {status === 'expired' && `Expired ${formatLongDate(card.expiresAt)}`}
                  {status === 'deactivated' &&
                    `Off since ${formatDate(card.deactivatedAt!)} · ${card.deactivatedReason}`}
                </Text>
              </View>
              {status === 'active' ? (
                manager || card.holderId === ME ? (
                  <Pressable onPress={() => turnOff(card)} hitSlop={8}>
                    <Text style={styles.link}>Turn off</Text>
                  </Pressable>
                ) : (
                  <Pill label="Active" tone="success" />
                )
              ) : (
                <Pill label={status === 'expired' ? 'Expired' : 'Off'} tone="neutral" />
              )}
            </View>
          );
        })}
      </Card>

      {manager && (
        <View style={styles.controls}>
          {withoutCard.length > 0 && (
            <>
              <Text style={styles.controlLabel}>Issue a card</Text>
              <View style={styles.chips}>
                {withoutCard.map((userId) => (
                  <Chip
                    key={userId}
                    label={`+ ${firstName(state.users[userId]?.name ?? '')}`}
                    onPress={() => issueCard(org.id, userId)}
                  />
                ))}
              </View>
            </>
          )}
          <Text style={styles.controlLabel}>Monthly limit, shared by all cards</Text>
          <View style={styles.chips}>
            {LIMITS.map((limit) => (
              <Chip
                key={limit}
                label={formatMoney(limit).replace('.00', '')}
                selected={settings.monthlyLimit === limit}
                onPress={() => setCardLimit(org.id, limit)}
              />
            ))}
          </View>
          <Button
            label={settings.frozen ? 'Unfreeze all cards' : 'Freeze all cards'}
            icon={settings.frozen ? 'play-outline' : 'snow-outline'}
            variant="secondary"
            onPress={() => toggleCardFrozen(org.id)}
          />
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  pressed: {
    opacity: 0.8,
  },
  muted: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  note: {
    marginTop: 10,
  },
  card: {
    padding: 20,
    gap: 14,
    borderRadius: radius.lg,
    backgroundColor: colors.text,
    aspectRatio: 1.586,
    justifyContent: 'space-between',
  },
  cardFrozen: {
    opacity: 0.55,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  contactless: {
    transform: [{ rotate: '90deg' }],
  },
  cardOrg: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: '800',
  },
  cardNumber: {
    color: '#fff',
    fontSize: 19,
    letterSpacing: 2,
    fontWeight: '600',
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardCaption: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  cardValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  wallet: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: radius.md,
    backgroundColor: '#000',
  },
  walletText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  list: {
    marginTop: 12,
    gap: 12,
  },
  limitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.surfaceMuted,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: colors.accent,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowOff: {
    opacity: 0.6,
  },
  rowTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  link: {
    color: colors.primary,
    fontWeight: '700',
  },
  controls: {
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
});
