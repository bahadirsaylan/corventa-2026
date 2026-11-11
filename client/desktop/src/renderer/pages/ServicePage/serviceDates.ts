// Servis talebi tarih yardımcıları — DataApi SQLite tarihleri UTC ama 'Z'siz gelir.

/** ISO metni UTC kabul ederek Date'e çevirir; boş/geçersiz → null */
export function parseUtc(iso: string | null | undefined): Date | null {
  if (!iso) return null
  const d = new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(iso) ? iso : iso + 'Z')
  return Number.isNaN(d.getTime()) ? null : d
}

const pad = (n: number) => String(n).padStart(2, '0')

/** dd.MM.yyyy HH:mm (yerel saat); boş/geçersiz → '—' */
export function fmtDateTime(iso: string | null | undefined): string {
  const d = parseUtc(iso)
  if (!d) return '—'
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** dd.MM.yyyy (yerel); boş/geçersiz → '—' */
export function fmtDate(iso: string | null | undefined): string {
  const d = parseUtc(iso)
  if (!d) return '—'
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`
}

/** Süre (dakika cinsinden bileşenler); başlangıç/bitiş yoksa veya negatifse null */
export function durationParts(
  fromIso: string | null | undefined,
  toIso: string | null | undefined,
): { days: number; hours: number; minutes: number } | null {
  const a = parseUtc(fromIso)
  const b = parseUtc(toIso)
  if (!a || !b) return null
  const totalMin = Math.floor((b.getTime() - a.getTime()) / 60000)
  if (totalMin < 0) return null
  return {
    days: Math.floor(totalMin / 1440),
    hours: Math.floor((totalMin % 1440) / 60),
    minutes: totalMin % 60,
  }
}
