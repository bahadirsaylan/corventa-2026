// Tahliye (POST /api/preparation/unload) isteği şu an sürüyor mu — main süreçte sayaç.
// Güncelleme kurulumu (cloud:install-update) tahliye sürerken reddedilir (BULUT_API.md §5).

let inFlight = 0

/** Tahliye isteğini sarar: süre boyunca isUnloadActive() true döner */
export async function trackUnload<T>(fn: () => Promise<T>): Promise<T> {
  inFlight++
  try {
    return await fn()
  } finally {
    inFlight = Math.max(0, inFlight - 1)
  }
}

export function isUnloadActive(): boolean {
  return inFlight > 0
}
