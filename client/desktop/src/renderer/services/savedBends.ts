// STANDART SÜRÜM (2026-11-17) — BÜKÜM SONUCU + KAYITLI BÜKÜMLER ortak yardımcıları (STANDART_SURUM.md §2-3).

import type { BendingJobParams, ManualTargetOverride } from '@/store/bendingJobStore'
import { manualTargetKey, useBendingJobStore } from '@/store/bendingJobStore'
import { AUTO_BENDING_MODE } from '@shared/edition'
import type { SavedBend, SavedBendCorrection } from '@shared/types'

/** Kayıtlı büküm metodu — ilk aşamada Standart sürümde sadece ÇEMBER */
export const SAVED_BEND_METHOD = 'FullCircle'

/** paramsJson için mağaza anlık görüntüsü — elle hedef ve vals onayı HARİÇ (çalıştırmada yeniden sorulur) */
export function snapshotParamsJson(params: BendingJobParams): string {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { manualTarget, rollArrangementConfirmed, ...rest } = params
  return JSON.stringify(rest)
}

export function parseCorrections(json: string | null | undefined): SavedBendCorrection[] {
  if (!json) return []
  try {
    const arr = JSON.parse(json) as unknown
    if (!Array.isArray(arr)) return []
    return arr
      .filter((c) => c && typeof c === 'object' && Number.isFinite(Number(c.fromMm)) && Number.isFinite(Number(c.toMm)))
      .map((c) => ({
        at: String(c.at ?? ''),
        fromMm: Number(c.fromMm),
        toMm: Number(c.toMm),
        measuredDiameterMm: c.measuredDiameterMm != null && Number.isFinite(Number(c.measuredDiameterMm))
          ? Number(c.measuredDiameterMm)
          : null,
        mode: c.mode === 'newPart' ? 'newPart' : 'part',
      }))
  } catch {
    return []
  }
}

/**
 * Kayıtlı bükümü mağazaya yükler: parametreler (paramsJson) + elle hedef (kayıttaki itme derinliği / stage).
 * false → paramsJson okunamadı (mağaza değişmez).
 */
export function loadSavedBendIntoStore(saved: SavedBend): boolean {
  let parsed: Partial<BendingJobParams>
  try {
    parsed = JSON.parse(saved.paramsJson) as Partial<BendingJobParams>
    if (!parsed || typeof parsed !== 'object' || !parsed.profileId || !parsed.bendingMethod) return false
  } catch {
    return false
  }
  const override: ManualTargetOverride = {
    pushDepthMm: saved.pushDepthMm,
    stageNumber: saved.stageNumber ?? null,
    savedBendId: saved.id,
    corrections: parseCorrections(saved.correctionsJson),
  }
  const store = useBendingJobStore.getState()
  store.resetJob()
  store.setParams({
    ...parsed,
    bendingMode: parsed.bendingMode ?? AUTO_BENDING_MODE,
    rollArrangementConfirmed: false,
  })
  store.setParams({ manualTarget: { ...override, paramsKey: manualTargetKey(useBendingJobStore.getState().params) } })
  return true
}

/** Varsayılan kayıt adı: "Ø2000 · A40 · 2026-11-17" */
export function defaultSavedBendName(targetDiameterMm: number, profileA: number, date = new Date()): string {
  const d = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  return `Ø${fmtNum(targetDiameterMm)} · A${fmtNum(profileA)} · ${d}`
}

/** Sayı → en fazla 2 ondalık, gereksiz sıfırsız (2000 · 40.5 · 157.25) */
export function fmtNum(v: number | null | undefined, maxDecimals = 2): string {
  if (v == null || !Number.isFinite(v)) return '—'
  return String(Number(v.toFixed(maxDecimals)))
}

/** IPC hata metninden "Error invoking remote method…" / "HttpError:" öneklerini temizler */
export function cleanIpcError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err ?? '')
  return raw.replace(/^Error invoking remote method '[^']*':\s*/, '').replace(/^(Http)?Error:\s*/, '')
}
