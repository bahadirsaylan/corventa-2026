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
