/** Just enough of `react-native` for the pure store modules under test. */
export const Platform = {
  OS: 'ios',
  select: (options) => (options.ios !== undefined ? options.ios : options.default),
};
export const Appearance = { getColorScheme: () => 'light' };
export const AppState = { addEventListener: () => ({ remove() {} }) };
export const Alert = { alert: () => {} };
