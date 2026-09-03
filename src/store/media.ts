/**
 * Profile picture handling.
 *
 * The picker hands back a URI in a temporary location, so the chosen image is
 * copied into the document directory — otherwise iOS can reclaim it and the
 * avatar silently turns into a broken image days later.
 */

import { Directory, File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';

const AVATAR_DIRNAME = 'profile';

function avatarDirectory(): Directory {
  const directory = new Directory(Paths.document, AVATAR_DIRNAME);
  if (!directory.exists) directory.create({ intermediates: true });
  return directory;
}

/**
 * Prompts for photo access, opens the library, and returns a durable
 * `file://` URI. Resolves to `null` if the user cancels or declines.
 */
export async function pickAvatar(): Promise<string | null> {
  try {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        'Photo access needed',
        'Allow photo access in Settings to choose a profile picture.'
      );
      return null;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.length) return null;

    return persistAvatar(result.assets[0].uri);
  } catch {
    Alert.alert('Could not open photos', 'Something went wrong picking that image.');
    return null;
  }
}

/** Copies a picked image into permanent storage and returns its new URI. */
function persistAvatar(sourceUri: string): string | null {
  try {
    const source = new File(sourceUri);
    const extension = source.extension || '.jpg';
    const destination = new File(avatarDirectory(), `avatar-${Date.now()}${extension}`);
    source.copySync(destination);
    return destination.uri;
  } catch {
    // Falling back to the original URI is better than losing the pick outright,
    // even though it may not survive a cache purge.
    return sourceUri;
  }
}

/** Removes every stored avatar except `keepUri`. Best-effort. */
export function pruneAvatars(keepUri?: string): void {
  try {
    for (const entry of avatarDirectory().list()) {
      if (entry instanceof File && entry.uri !== keepUri) entry.delete();
    }
  } catch {
    // Orphaned avatars are a few KB; not worth surfacing an error for.
  }
}
