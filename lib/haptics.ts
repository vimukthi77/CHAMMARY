/**
 * Fire a short device vibration for tactile button feedback on mobile.
 *
 * Uses the Web Vibration API, which is supported on Android (Chrome, etc.).
 * iOS Safari does NOT implement it, so this is a no-op on iPhones/iPads —
 * it fails silently rather than erroring.
 */
export function haptic(pattern: number | number[] = 10) {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    try {
      navigator.vibrate(pattern);
    } catch {
      /* ignore — some browsers block vibration without a user gesture */
    }
  }
}
