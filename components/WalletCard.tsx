import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { Pill } from '@/components/ui';
import { colors, radius } from '@/constants/theme';
import { formatLongDate } from '@/lib/format';
import { addCardToWallet } from '@/lib/store';
import type { OfficerCard } from '@/lib/types';

export const WALLET = Platform.OS === 'android' ? 'Google Wallet' : 'Apple Wallet';
const PAY = Platform.OS === 'android' ? 'Google Pay' : 'Apple Pay';

function expiryShort(at: number) {
  const date = new Date(at);
  return `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getFullYear()).slice(-2)}`;
}

export function CardFace({
  orgName,
  holderName,
  card,
  frozen,
  compact,
}: {
  orgName: string;
  holderName: string;
  card: OfficerCard;
  frozen?: boolean;
  compact?: boolean;
}) {
  return (
    <View style={[styles.card, compact && styles.cardCompact, frozen && styles.cardFrozen]}>
      <View style={styles.cardTop}>
        <Text style={[styles.cardOrg, compact && styles.small]}>{orgName}</Text>
        {frozen ? (
          <Pill label="Frozen" tone="neutral" />
        ) : (
          <Ionicons name="wifi" size={compact ? 16 : 20} color="rgba(255,255,255,0.75)" style={styles.contactless} />
        )}
      </View>
      <Text style={[styles.cardNumber, compact && styles.small]}>•••• •••• •••• {card.last4}</Text>
      <View style={styles.cardBottom}>
        <View>
          <Text style={styles.cardCaption}>Officer</Text>
          <Text style={styles.cardValue}>{holderName}</Text>
        </View>
        <View>
          <Text style={styles.cardCaption}>Expires</Text>
          <Text style={styles.cardValue}>{expiryShort(card.expiresAt)}</Text>
        </View>
      </View>
    </View>
  );
}

type Step = 'terms' | 'adding' | 'ready';

export function AddToWalletSheet({
  card,
  orgName,
  holderName,
  visible,
  onClose,
}: {
  card: OfficerCard;
  orgName: string;
  holderName: string;
  visible: boolean;
  onClose: () => void;
}) {
  const [step, setStep] = useState<Step>('terms');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const close = () => {
    if (step === 'adding') return;
    setStep('terms');
    onClose();
  };

  const agree = () => {
    setStep('adding');
    timer.current = setTimeout(() => {
      addCardToWallet(card.id);
      setStep('ready');
    }, 1800);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.sheetHeader}>
            {step === 'terms' ? (
              <Pressable onPress={close} hitSlop={10}>
                <Text style={styles.headerLink}>Cancel</Text>
              </Pressable>
            ) : (
              <View />
            )}
            <Text style={styles.sheetTitle}>
              {step === 'ready' ? 'Card Ready' : step === 'adding' ? 'Adding Card' : `Add to ${WALLET}`}
            </Text>
            {step === 'terms' ? (
              <Pressable onPress={agree} hitSlop={10}>
                <Text style={[styles.headerLink, styles.headerStrong]}>Agree</Text>
              </Pressable>
            ) : step === 'ready' ? (
              <Pressable onPress={close} hitSlop={10}>
                <Text style={[styles.headerLink, styles.headerStrong]}>Done</Text>
              </Pressable>
            ) : (
              <View />
            )}
          </View>

          <View style={styles.art}>
            <CardFace orgName={orgName} holderName={holderName} card={card} compact />
          </View>

          {step === 'terms' && (
            <View style={styles.body}>
              <Text style={styles.bodyTitle}>Terms and Conditions</Text>
              <Text style={styles.bodyText}>
                This card belongs to {orgName}, not to you. Every purchase is recorded to the
                org&apos;s account with the purpose you give it, and is reviewed in the year-end
                report. The card stops working on {formatLongDate(card.expiresAt)} or as soon as
                you stop being an officer, whichever comes first.
              </Text>
            </View>
          )}

          {step === 'adding' && (
            <View style={[styles.body, styles.center]}>
              <ActivityIndicator size="large" color={colors.textMuted} />
              <Text style={styles.bodyText}>Contacting the card issuer…</Text>
            </View>
          )}

          {step === 'ready' && (
            <View style={[styles.body, styles.center]}>
              <Ionicons name="checkmark-circle" size={44} color={colors.success} />
              <Text style={styles.bodyTitle}>Ready for {PAY}</Text>
              <Text style={[styles.bodyText, styles.centerText]}>
                To pay, start a purchase in Scramble, then hold your phone near the reader.
              </Text>
            </View>
          )}

          <Text style={styles.disclaimer}>
            Simulated. No real card is added to your {WALLET}.
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 20,
    gap: 14,
    borderRadius: radius.lg,
    backgroundColor: colors.text,
    aspectRatio: 1.586,
    justifyContent: 'space-between',
  },
  cardCompact: {
    padding: 16,
    gap: 8,
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
  small: {
    fontSize: 14,
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
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    backgroundColor: '#f2f2f7',
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    paddingBottom: 28,
    minHeight: 520,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#c6c6c8',
    backgroundColor: '#f9f9f9',
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
  },
  sheetTitle: {
    color: '#000',
    fontSize: 17,
    fontWeight: '600',
  },
  headerLink: {
    color: '#007aff',
    fontSize: 17,
    minWidth: 50,
  },
  headerStrong: {
    fontWeight: '600',
    textAlign: 'right',
  },
  art: {
    paddingHorizontal: 56,
    paddingVertical: 24,
  },
  body: {
    marginHorizontal: 16,
    padding: 16,
    gap: 8,
    borderRadius: 10,
    backgroundColor: '#fff',
  },
  center: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  centerText: {
    textAlign: 'center',
  },
  bodyTitle: {
    color: '#000',
    fontSize: 17,
    fontWeight: '600',
  },
  bodyText: {
    color: '#3c3c43',
    fontSize: 15,
    lineHeight: 21,
  },
  disclaimer: {
    color: '#8e8e93',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 16,
  },
});
