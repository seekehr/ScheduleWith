import { useEffect, useState } from 'react';
import { Keyboard, type KeyboardEvent } from 'react-native';

export type KeyboardState = {
  /** Height of the keyboard in points, or 0 when it is down. */
  height: number;
  visible: boolean;
};

/**
 * Tracks the on-screen keyboard.
 *
 * Uses the `will` events rather than `did` so anything animating alongside the
 * keyboard starts moving on the same frame it does, instead of snapping into
 * place after it has finished.
 */
export function useKeyboard(): KeyboardState {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardWillShow', (event: KeyboardEvent) => {
      setHeight(event.endCoordinates.height);
    });
    const hide = Keyboard.addListener('keyboardWillHide', () => setHeight(0));

    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return { height, visible: height > 0 };
}
