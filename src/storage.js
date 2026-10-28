// 端末への保存（使えない端末・壊れたデータでもゲームは止めない）
export const KEY = 'family-monogatari:v1';

const defaultStore = () => (typeof localStorage === 'undefined' ? null : localStorage);

export function save(data, store = defaultStore()) {
  try {
    if (store) store.setItem(KEY, JSON.stringify(data));
  } catch (e) { /* 保存できなくても続ける */ }
}

export function load(store = defaultStore()) {
  try {
    const raw = store && store.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export function clear(store = defaultStore()) {
  try {
    if (store) store.removeItem(KEY);
  } catch (e) { /* なにもしない */ }
}
