const DEVICE_ID_STORAGE_KEY = "teqcertify_device_id";

/**
 * A stable per-browser identifier, generated once and cached in localStorage.
 * Never regenerated on later visits — this is what lets the backend
 * recognize a returning device on re-login instead of treating it as a new
 * device that would consume another slot against the 2-device limit.
 */
export function getOrCreateDeviceId(): string {
  const existing = localStorage.getItem(DEVICE_ID_STORAGE_KEY);
  if (existing) return existing;

  const deviceId = crypto.randomUUID();
  localStorage.setItem(DEVICE_ID_STORAGE_KEY, deviceId);
  return deviceId;
}
