import { Ionicons } from '@expo/vector-icons';
import { type ReactNode, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/ui';
import { colors, radius } from '@/constants/theme';

export function EditableDetail({
  label,
  value,
  canEdit,
  placeholder,
  addLabel,
  multiline,
  onSave,
  children,
}: {
  label: string;
  value: string | undefined;
  canEdit: boolean;
  placeholder: string;
  addLabel: string;
  multiline?: boolean;
  onSave: (value: string | undefined) => void;
  children: ReactNode;
}) {
  const [draft, setDraft] = useState<string | null>(null);

  if (!value && !canEdit) return null;

  const save = () => {
    onSave(draft?.trim() || undefined);
    setDraft(null);
  };

  return (
    <>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {canEdit && !!value && draft === null && (
          <Pressable onPress={() => setDraft(value)} hitSlop={10} style={styles.edit}>
            <Ionicons name="pencil" size={13} color={colors.primary} />
            <Text style={styles.editText}>Edit</Text>
          </Pressable>
        )}
      </View>

      {draft !== null ? (
        <View>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder={placeholder}
            placeholderTextColor={colors.textMuted}
            style={[styles.input, multiline && styles.multiline]}
            multiline={multiline}
            autoFocus
          />
          <View style={styles.actions}>
            <Button label="Cancel" variant="secondary" onPress={() => setDraft(null)} style={styles.flex} />
            <Button label="Save" icon="checkmark" onPress={save} style={styles.flex} />
          </View>
        </View>
      ) : value ? (
        children
      ) : (
        <Pressable onPress={() => setDraft('')} style={styles.add}>
          <Ionicons name="add" size={18} color={colors.primary} />
          <Text style={styles.addText}>{addLabel}</Text>
        </Pressable>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 8,
  },
  label: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  edit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  editText: {
    color: colors.primary,
    fontSize: 13,
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
  },
  multiline: {
    minHeight: 140,
    textAlignVertical: 'top',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  flex: {
    flex: 1,
  },
  add: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 14,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.border,
  },
  addText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '700',
  },
});
