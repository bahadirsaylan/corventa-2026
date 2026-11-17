// STANDART SÜRÜM (2026-11-17) — BÜKÜM SONUCU + KAYITLI BÜKÜMLER ortak yardımcıları (STANDART_SURUM.md §2-3).

import type { BendingJobParams, BendingMethodId, ManualTargetOverride } from '@/store/bendingJobStore'
import { manualTargetKey, methodParamsKey, useBendingJobStore } from '@/store/bendingJobStore'
import { AUTO_BENDING_MODE } from '@shared/edition'
import type { SavedBend, SavedBendCorrection } from '@shared/types'

/** Kayıtlı büküm metodu (ÇEMBER) — DataApi BendingMethod adı */
export const SAVED_BEND_METHOD = 'FullCircle'

/** UI metot id → DataApi BendingMethod adı (SavedBend.method) */
export const SAVED_BEND_METHOD_BY_ID: Record<BendingMethodId, string> = {
  ring: 'FullCircle',
  arc: 'Arc',
  spiral: 'Serpantin',
  sivama: 'Sivama',
}

/** SavedBend.method → ekran adı (Türkçe kaynak metin — t() ile çevrilir) */
export function savedBendMethodLabel(method: string | null | undefined): string {
  switch ((method ?? '').toLowerCase()) {
    case 'arc':
      return 'ÇOK AÇILI'
    case 'serpantin':
      return 'SERPANTİN'
    case 'sivama':
      return 'SIVAMA'
    default:
      return 'ÇEMBER'
  }
}

/** ÇEMBER kaydı mı (method boş / FullCircle) */
export function isRingSavedBend(method: string | null | undefined): boolean {
  return !method || method.toLowerCase() === 'fullcircle'
}

/** paramsJson içinde ÇEMBER dışı metotların tasarım hedefleri (MethodRunContext.targets) bu anahtarla saklanır */
const TARGETS_KEY = 'standardTargets'

/**
 * paramsJson için mağaza anlık görüntüsü — elle hedef, metot düzeltme bağlamı ve vals onayı HARİÇ
 * (çalıştırmada yeniden sorulur). targets verilirse (ÇEMBER dışı) tasarım hedefleri de yazılır.
 */
export function snapshotParamsJson(params: BendingJobParams, targets?: Record<string, number> | null): string {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { manualTarget, methodRun, rollArrangementConfirmed, ...rest } = params
  return JSON.stringify(targets && Object.keys(targets).length > 0 ? { ...rest, [TARGETS_KEY]: targets } : rest)
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
        // ÇEMBER dışı metot alanları (2026-11-17) — yoksa eklenmez (ÇEMBER kayıtları birebir)
        ...(typeof c.field === 'string' && c.field
          ? {
              field: c.field as string,
              measuredValue: optNum(c.measuredValue),
              targetValue: optNum(c.targetValue),
            }
          : {}),
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
  if (parsed.bendingMethod !== 'ring') {
    // ÇOK AÇILI / SERPANTİN / SIVAMA (2026-11-17): hedef konum kilidi yok — kayıttaki (düzeltilmiş) girdilerle
    // hedef yeniden hesaplanır. Tasarım hedefleri + geçmiş BÜKÜM SONUCU ekranı için bağlama yazılır.
    const rawTargets = (parsed as Record<string, unknown>)[TARGETS_KEY]
    const targets: Record<string, number> = {}
    if (rawTargets && typeof rawTargets === 'object') {
      for (const [k, v] of Object.entries(rawTargets as Record<string, unknown>)) {
        const n = Number(v)
        if (Number.isFinite(n) && n > 0) targets[k] = n
      }
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { [TARGETS_KEY]: _t, ...cleanParams } = parsed as Record<string, unknown>
    const st = useBendingJobStore.getState()
    st.resetJob()
    st.setParams({
      ...(cleanParams as Partial<BendingJobParams>),
      bendingMode: parsed.bendingMode ?? AUTO_BENDING_MODE,
      rollArrangementConfirmed: false,
      manualTarget: null,
    })
    st.setParams({
      methodRun: {
        targets,
        savedBendId: saved.id,
        corrections: parseCorrections(saved.correctionsJson),
        paramsKey: methodParamsKey(useBendingJobStore.getState().params),
      },
    })
    return true
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

function optNum(v: unknown): number | null {
  return v != null && Number.isFinite(Number(v)) ? Number(v) : null
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
