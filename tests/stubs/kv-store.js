/** In-memory stand-in for `expo-sqlite/kv-store`. */
const store = new Map();
export default {
  getItemSync: (key) => (store.has(key) ? store.get(key) : null),
  setItemSync: (key, value) => store.set(key, value),
  removeItemSync: (key) => store.delete(key),
  getItem: async (key) => (store.has(key) ? store.get(key) : null),
  setItem: async (key, value) => store.set(key, value),
  removeItem: async (key) => store.delete(key),
};
