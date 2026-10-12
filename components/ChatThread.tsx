import { Ionicons } from '@expo/vector-icons';
import { useHeaderHeight } from 'expo-router/react-navigation';
import { useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/ui';
import { colors, radius } from '@/constants/theme';
import { formatTime } from '@/lib/format';
import { threadMessages } from '@/lib/selectors';
import { ME, sendMessage, useAppState } from '@/lib/store';
import type { ThreadId } from '@/lib/types';

type Props = {
  threadId: ThreadId;
  showSenderNames?: boolean;
  emptyTitle: string;
};

export function ChatThread({ threadId, showSenderNames = false, emptyTitle }: Props) {
  const state = useAppState();
  const messages = threadMessages(state, threadId).reverse();
  const [draft, setDraft] = useState('');
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    sendMessage(threadId, text);
    setDraft('');
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior="padding" keyboardVerticalOffset={headerHeight}>
      {messages.length === 0 ? (
        <View style={styles.flex}>
          <EmptyState icon="chatbubbles-outline" title={emptyTitle} body="Say hi to get things going." />
        </View>
      ) : (
        <FlatList
          style={styles.flex}
          inverted
          data={messages}
          keyExtractor={(message) => message.id}
          contentContainerStyle={styles.list}
          keyboardDismissMode="interactive"
          renderItem={({ item, index }) => {
            const mine = item.senderId === ME;
            const older = messages[index + 1];
            const newer = messages[index - 1];
            const startsGroup = older?.senderId !== item.senderId;
            const endsGroup = newer?.senderId !== item.senderId;
            const sender = state.users[item.senderId];
            return (
              <View style={[styles.row, mine && styles.rowMine, startsGroup && styles.groupStart]}>
                {showSenderNames && !mine && startsGroup && (
                  <Text style={styles.sender}>{sender?.name ?? 'Someone'}</Text>
                )}
                <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
                  <Text style={[styles.text, mine && styles.textMine]}>{item.text}</Text>
                </View>
                {endsGroup && <Text style={styles.time}>{formatTime(item.sentAt)}</Text>}
              </View>
            );
          }}
        />
      )}
      <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, 10) }]}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Message"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          multiline
          onSubmitEditing={send}
          submitBehavior="submit"
        />
        <Pressable onPress={send} disabled={!draft.trim()} hitSlop={8} accessibilityLabel="Send">
          <Ionicons
            name="arrow-up-circle"
            size={36}
            color={draft.trim() ? colors.primary : colors.border}
          />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  list: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  row: {
    alignItems: 'flex-start',
    marginTop: 3,
  },
  rowMine: {
    alignItems: 'flex-end',
  },
  groupStart: {
    marginTop: 12,
  },
  sender: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 3,
    marginLeft: 4,
  },
  bubble: {
    maxWidth: '80%',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radius.lg,
  },
  bubbleMine: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 6,
  },
  bubbleTheirs: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomLeftRadius: 6,
  },
  text: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 21,
  },
  textMine: {
    color: '#fff',
  },
  time: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 3,
    marginHorizontal: 4,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    fontSize: 16,
  },
});
