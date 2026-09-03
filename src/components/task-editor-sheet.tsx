/**
 * Add / edit a single task: title, optional description, and the 10-100 XP
 * slider that decides how much the task is worth.
 *
 * Two details worth knowing, both about not losing work:
 *
 *  - The note field is multi-line, so Return inserts a newline and cannot
 *    dismiss the keyboard. A "Done" bar sits above the keyboard instead, and
 *    tapping the backdrop puts the keyboard away before it closes anything
 *    (see `BottomSheet`).
 *  - Whatever is typed survives the sheet closing. Reopen it and the draft is
 *    still there, with a one-tap way to discard it.
 */

import { Host, Slider } from '@expo/ui/swift-ui';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  InputAccessoryView,
  Keyboard,
  StyleSheet,
  TextInput,
  View,
  type TextInput as TextInputRef,
} from 'react-native';

import { AppButton } from '@/components/app-button';
import { BottomSheet } from '@/components/bottom-sheet';
import { PressableScale } from '@/components/pressable-scale';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { makeId } from '@/store/storage';
import { MAX_TASK_XP, MIN_TASK_XP, TASK_XP_STEP, type Task } from '@/store/types';

const DEFAULT_XP = 20;
const ACCESSORY_ID = 'task-editor-accessory';

type Draft = {
  /** Task id, or `new` — so an in-progress edit never leaks into another task. */
  key: string;
  title: string;
  description: string;
  xp: number;
};

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
  const noteRef = useRef<TextInputRef>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [xp, setXp] = useState(DEFAULT_XP);
  const [restored, setRestored] = useState(false);

  // Survives the sheet closing, because this component stays mounted while the
  // sheet inside it unmounts.
  const draftRef = useRef<Draft | null>(null);
  const draftKey = task?.id ?? 'new';

  const seedFromTask = useCallback(() => {
    setTitle(task?.title ?? '');
    setDescription(task?.description ?? '');
    setXp(task?.xp ?? DEFAULT_XP);
    setRestored(false);
  }, [task]);

  useEffect(() => {
    if (!visible) return;
    const draft = draftRef.current;

    if (draft && draft.key === draftKey && hasContent(draft, task)) {
      setTitle(draft.title);
      setDescription(draft.description);
      setXp(draft.xp);
      setRestored(true);
      return;
    }
    seedFromTask();
  }, [visible, draftKey, task, seedFromTask]);

  // Mirror the live form into the draft on every keystroke.
  useEffect(() => {
    if (!visible) return;
    draftRef.current = { key: draftKey, title, description, xp };
  }, [visible, draftKey, title, description, xp]);

  const discardDraft = useCallback(() => {
    draftRef.current = null;
    seedFromTask();
  }, [seedFromTask]);

  const save = useCallback(() => {
    const trimmed = title.trim();
    if (!trimmed) return;
    draftRef.current = null;
    setRestored(false);
    Keyboard.dismiss();
    onSave({
      id: task?.id ?? makeId(),
      title: trimmed,
      description: description.trim() || undefined,
      xp,
    });
  }, [title, description, xp, task, onSave]);

  const remove = useCallback(() => {
    if (!task || !onDelete) return;
    draftRef.current = null;
    Keyboard.dismiss();
    onDelete(task.id);
  }, [task, onDelete]);

  const inputStyle = [
    styles.input,
    { color: theme.text, backgroundColor: theme.surface, borderColor: theme.border },
  ];

  return (
    <BottomSheet visible={visible} onClose={onClose} title={task ? 'Edit task' : 'New task'}>
      {restored ? (
        <View style={[styles.draftBanner, { backgroundColor: theme.accentSoft }]}>
          <ThemedText variant="caption" themeColor="accent" style={styles.draftCopy}>
            Picked up where you left off.
          </ThemedText>
          <PressableScale onPress={discardDraft} haptic="light" style={styles.draftClear}>
            <ThemedText variant="caption" themeColor="textSecondary">
              Start over
            </ThemedText>
          </PressableScale>
        </View>
      ) : null}

      <TextInput
        value={title}
        onChangeText={setTitle}
        placeholder="What needs doing?"
        placeholderTextColor={theme.textMuted}
        maxLength={120}
        autoFocus={!task}
        returnKeyType="next"
        onSubmitEditing={() => noteRef.current?.focus()}
        inputAccessoryViewID={ACCESSORY_ID}
        style={inputStyle}
      />
      <TextInput
        ref={noteRef}
        value={description}
        onChangeText={setDescription}
        placeholder="Notes (optional)"
        placeholderTextColor={theme.textMuted}
        maxLength={500}
        multiline
        inputAccessoryViewID={ACCESSORY_ID}
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
        <PressableScale onPress={remove} haptic="heavy" style={styles.delete}>
          <ThemedText variant="label" themeColor="danger">
            Delete task
          </ThemedText>
        </PressableScale>
      ) : null}

      {/*
        The only reliable way off a multi-line field on iOS: a bar pinned above
        the keyboard. "Save" is here too so the form can be committed without
        first hunting for the button behind the keyboard.
      */}
      <InputAccessoryView nativeID={ACCESSORY_ID}>
        <View
          style={[
            styles.accessory,
            { backgroundColor: theme.surfaceRaised, borderTopColor: theme.border },
          ]}>
          <PressableScale
            onPress={() => Keyboard.dismiss()}
            haptic="light"
            style={styles.accessoryButton}>
            <ThemedText variant="label" themeColor="textSecondary">
              Done
            </ThemedText>
          </PressableScale>
          <PressableScale
            onPress={save}
            disabled={title.trim().length === 0}
            haptic="medium"
            style={styles.accessoryButton}>
            <ThemedText variant="label" themeColor="accent">
              {task ? 'Save task' : 'Add task'}
            </ThemedText>
          </PressableScale>
        </View>
      </InputAccessoryView>
    </BottomSheet>
  );
}

/**
 * Whether a draft is worth restoring — i.e. it actually differs from what the
 * task already holds. Stops the "picked up where you left off" banner from
 * appearing when nothing was ever typed.
 */
function hasContent(draft: Draft, task: Task | null): boolean {
  if (!task) {
    return draft.title.trim().length > 0 || draft.description.trim().length > 0;
  }
  return (
    draft.title !== task.title ||
    draft.description !== (task.description ?? '') ||
    draft.xp !== task.xp
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
  draftBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.sm,
  },
  draftCopy: {
    flex: 1,
  },
  draftClear: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
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
  accessory: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  accessoryButton: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.two,
  },
});
