// Vals topu çapları — makine ayarlarından (2026-11-16). Kodda sabit 220 YOK.
//   Alt top → büküm hesabı (piston hedefi) + sıvama; iş kaydına ballDiameterMm olarak yazılır.
//   Üst + alt → sıkıştırma hedefi (backend ayardan kendisi okur).
//   Sol / sağ → şimdilik sadece kayıt.

import { t } from '@/i18n'

function positive(v: unknown): number | null {
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? n : null
}

let lastLowerBallDiameterMm: number | null = null

/** Alt top çapı (mm). Ayar okunamazsa hata fırlatır — tahmini değerle büküm hesabı yapılmaz. */
export async function loadLowerBallDiameterMm(): Promise<number> {
  const m = (await window.corventa.settings.getMachine()) as Record<string, unknown>
  const v = positive(m.lowerBallDiameterMm) ?? positive(m.defaultBallDiameterMm)
  if (v == null) throw new Error(t('ALT TOP ÇAPI AYARI OKUNAMADI'))
  lastLowerBallDiameterMm = v
  return v
}

/** Son okunan alt top çapı (henüz okunmadıysa null). */
export function cachedLowerBallDiameterMm(): number | null {
  return lastLowerBallDiameterMm
}

// ── ÜST-ALT TOP BİNDİRME (2026-11-20) — backend Core/Models/RollOverlap ile AYNI hesap.
// İç çap (*BallDiameterMm) = parçanın oturduğu yer (büküm hesabı). Dış çap (*BallOuterDiameterMm, 280) = kenar;
// üst ve alt topun kenarları birbirine değer → profil A en az (dış − iç)/2 üst + (dış − iç)/2 alt + en az boşluk.
// Backend de StartJob / sıkıştırma / üst-alt top hareketlerinde aynı kuralı uygular (UI sadece erken uyarı).

export interface RollOverlapInfo {
  enabled: boolean
  minProfileAMm: number
}

export async function loadRollOverlap(): Promise<RollOverlapInfo | null> {
  try {
    const m = (await window.corventa.settings.getMachine()) as Record<string, unknown>
    const upperIn = positive(m.upperBallDiameterMm) ?? positive(m.defaultBallDiameterMm)
    const lowerIn = positive(m.lowerBallDiameterMm) ?? positive(m.defaultBallDiameterMm)
    if (upperIn == null || lowerIn == null) return null
    const upperOut = positive(m.upperBallOuterDiameterMm) ?? upperIn
    const lowerOut = positive(m.lowerBallOuterDiameterMm) ?? lowerIn
    const clearance = Math.max(0, Number(m.rollOverlapMinClearanceMm) || 0)
    return {
      enabled: m.rollOverlapCheckEnabled !== false,
      minProfileAMm: Math.round(((upperOut - upperIn) / 2 + (lowerOut - lowerIn) / 2 + clearance) * 100) / 100,
    }
  } catch {
    return null // ayar okunamazsa UI uyarmaz — backend yine engeller
  }
}

/** A bindirme sınırının altındaysa ekranda gösterilecek mesaj; değilse null. */
export function rollOverlapMessage(info: RollOverlapInfo | null, a: number): string | null {
  if (!info || !info.enabled || !(a > 0) || a + 1e-6 >= info.minProfileAMm) return null
  return t('ÜST VE ALT TOP BİNDİRİR — PROFİL A EN AZ {min} mm OLMALI (GİRİLEN {a} mm)', {
    min: info.minProfileAMm,
    a,
  })
}
