/**
 * タッチ操作端末かどうかの共通判定。
 * iPad Safari では `navigator.maxTouchPoints` が返らないケースがあるため、
 * `ontouchstart` と coarse pointer も見る。
 */
export function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  if ('ontouchstart' in window) return true;
  if (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0) return true;
  return typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
}
