/**
 * Add / edit a single task: title, optional description, and the 10-100 XP
 * slider that decides how much the task is worth.
 */

import { Host, Slider } from '@expo/ui/swift-ui';
import { useEffect, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { BottomSheet } from '@/components/bottom-sheet';
import { PressableScale } from '@/components/pressable-scale';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { makeId } from '@/store/storage';
import { MAX_TASK_XP, MIN_TASK_XP, TASK_XP_STEP, type Task } from '@/store/types';

export type TaskEditorSheetProps = {
  visible: boolean;
  /** `null` puts the sheet in "add" mode. */
  task: Task | null;
  onClose: () => void;
  onSave: (task: Task) => void;
  onDelete?: (taskId: string) => void;
};

export function TaskEditorSheet({
  visible,
  task,
  onClose,
  onSave,
  onDelete,
}: TaskEditorSheetProps) {
  const theme = useTheme();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [xp, setXp] = useState(20);

  // Refill the form each time the sheet opens, so a cancelled edit leaves
  // nothing behind for the next one.
  useEffect(() => {
    if (!visible) return;
    setTitle(task?.title ?? '');
    setDescription(task?.description ?? '');
    setXp(task?.xp ?? 20);
  }, [visible, task]);

  const save = () => {
    const trimmed = title.trim();
    if (!trimmed) return;
    onSave({
      id: task?.id ?? makeId(),
      title: trimmed,
      description: description.trim() || undefined,
      xp,
    });
  };

  const inputStyle = [
    styles.input,
    { color: theme.text, backgroundColor: theme.surface, borderColor: theme.border },
  ];

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={task ? 'Edit task' : 'New task'}>
      <TextInput
        value={title}
        onChangeText={setTitle}
        placeholder="What needs doing?"
        placeholderTextColor={theme.textMuted}
        maxLength={120}
        autoFocus={!task}
        style={inputStyle}
      />
      <TextInput
        value={description}
        onChangeText={setDescription}
        placeholder="Notes (optional)"
        placeholderTextColor={theme.textMuted}
        maxLength={500}
        multiline
        style={[...inputStyle, styles.multiline]}
      />

      <View style={styles.xpBlock}>
        <View style={styles.xpHeader}>
          <ThemedText variant="label" themeColor="textSecondary">
            Worth
          </ThemedText>
          <View style={[styles.xpValue, { backgroundColor: theme.accentSoft }]}>
            <ThemedText variant="number" themeColor="accent">
              {xp} XP
            </ThemedText>
          </View>
        </View>

        <Host style={styles.sliderHost} seedColor={theme.accent}>
          <Slider
            value={xp}
            min={MIN_TASK_XP}
            max={MAX_TASK_XP}
            step={TASK_XP_STEP}
            onValueChange={(value) => setXp(Math.round(value))}
          />
        </Host>

        <View style={styles.xpScale}>
          <ThemedText variant="caption" themeColor="textMuted">
            {MIN_TASK_XP} · quick win
          </ThemedText>
          <ThemedText variant="caption" themeColor="textMuted">
            {MAX_TASK_XP} · the hard one
          </ThemedText>
        </View>
      </View>

      <AppButton
        label={task ? 'Save task' : 'Add task'}
        fullWidth
        disabled={title.trim().length === 0}
        onPress={save}
      />

      {task && onDelete ? (
        <PressableScale
          onPress={() => onDelete(task.id)}
          haptic="heavy"
          style={styles.delete}>
          <ThemedText variant="label" themeColor="danger">
            Delete task
          </ThemedText>
        </PressableScale>
      ) : null}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three - 2,
    fontSize: 16,
    fontWeight: '600',
  },
  multiline: {
    minHeight: 76,
    textAlignVertical: 'top',
    fontWeight: '500',
  },
  xpBlock: {
    gap: Spacing.two,
    paddingTop: Spacing.two,
  },
  xpHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  xpValue: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Radius.pill,
  },
  sliderHost: {
    alignSelf: 'stretch',
    height: 44,
  },
  xpScale: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  delete: {
    alignItems: 'center',
    paddingVertical: Spacing.two,
  },
});
