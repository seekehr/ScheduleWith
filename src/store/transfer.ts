/**
 * Schedule import / export.
 *
 * The file format is deliberately boring and self-describing so an exported
 * schedule stays readable (and hand-editable) years from now.
 */

import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';

import { makeId, parseSchedule } from '@/store/storage';
import type { Schedule } from '@/store/types';

const FORMAT_TAG = 'ScheduleWith';
const FORMAT_VERSION = 1;

type ExportPayload = {
  app: typeof FORMAT_TAG;
  version: number;
  exportedAt: string;
  schedule: Schedule;
};

function safeFilename(name: string): string {
  const cleaned = name
    .trim()
    .replace(/[^\p{L}\p{N} _-]/gu, '')
    .replace(/\s+/g, '-')
    .slice(0, 40);
  return `${cleaned || 'schedule'}.json`;
}

/** Writes the schedule to a temp file and opens the iOS share sheet. */
export async function exportSchedule(schedule: Schedule): Promise<boolean> {
  const payload: ExportPayload = {
    app: FORMAT_TAG,
    version: FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    schedule,
  };

  let file: File;
  try {
    file = new File(Paths.cache, safeFilename(schedule.name));
    if (file.exists) file.delete();
    file.create({ intermediates: true });
    file.write(JSON.stringify(payload, null, 2));
  } catch {
    Alert.alert('Export failed', 'Could not write the schedule file.');
    return false;
  }

  try {
    if (!(await Sharing.isAvailableAsync())) {
      Alert.alert('Sharing unavailable', 'This device cannot open the share sheet.');
      return false;
    }
    await Sharing.shareAsync(file.uri, {
      mimeType: 'application/json',
      UTI: 'public.json',
      dialogTitle: `Export ${schedule.name}`,
    });
    return true;
  } catch {
    Alert.alert('Export failed', 'The share sheet could not be opened.');
    return false;
  }
}

/**
 * Opens the system file picker and parses the chosen `.json`.
 *
 * Returns a schedule with fresh IDs — importing the same file twice gives you
 * two independent schedules rather than one that shadows the other. Resolves to
 * `null` on cancel, and alerts (rather than throwing) on a bad file.
 */
export async function importSchedule(existingNames: string[]): Promise<Schedule | null> {
  let text: string;
  try {
    const picked = await File.pickFileAsync({ mimeTypes: ['application/json'] });
    if (picked.canceled || !picked.result) return null;
    text = await picked.result.text();
  } catch {
    Alert.alert('Could not open file', 'That file could not be read.');
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    Alert.alert("That's not a schedule", 'The file is not valid JSON.');
    return null;
  }

  const scheduleInput =
    typeof parsed === 'object' && parsed !== null && 'schedule' in parsed
      ? (parsed as { schedule: unknown }).schedule
      : parsed;

  const schedule = parseSchedule(scheduleInput);
  if (!schedule) {
    Alert.alert("That's not a schedule", 'The file does not contain a ScheduleWith schedule.');
    return null;
  }

  const now = Date.now();
  return {
    ...schedule,
    id: makeId(),
    name: uniqueName(schedule.name, existingNames),
    tasks: schedule.tasks.map((task) => ({ ...task, id: makeId() })),
    createdAt: now,
    updatedAt: now,
  };
}

/** `Morning` -> `Morning (2)` when the name is already taken. */
export function uniqueName(name: string, existing: string[]): string {
  const taken = new Set(existing.map((entry) => entry.toLowerCase()));
  if (!taken.has(name.toLowerCase())) return name;
  for (let suffix = 2; suffix < 500; suffix += 1) {
    const candidate = `${name} (${suffix})`;
    if (!taken.has(candidate.toLowerCase())) return candidate;
  }
  return `${name} (${Date.now()})`;
}
