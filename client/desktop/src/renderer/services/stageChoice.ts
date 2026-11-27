// STAGE SEÇİMİ (2026-11-26, kullanıcı): "Girilen ölçülere göre birden çok stage uygunsa en uygununu varsayılan
// getirelim ama operatör de seçebilsin."
// Uygunluk kuralı backend ile AYNI (PreparationController.RecommendStage / Core StageSelector):
//   aktif stage + MaxProfileAMm tanımlı + profil A ≤ MaxProfileAMm; en küçük eşikli = ÖNERİLEN (en uygun).
// Operatörün seçimi store'da profil A ile birlikte tutulur (params.stageChoice) — A değişirse seçim geçersiz,
// önerilen kullanılır. Seçim yoksa davranış birebir eskisi (önerilen stage).

import type { StageInfo } from '@shared/types'
import { useBendingJobStore } from '@/store/bendingJobStore'

export interface StageOption {
  stageNumber: number
  name: string
  maxProfileAMm: number
  recommended: boolean
}

let cache: { at: number; value: Promise<StageInfo[]> } | null = null
const TTL_MS = 30_000

function loadStages(): Promise<StageInfo[]> {
  const now = Date.now()
  if (cache && now - cache.at < TTL_MS) return cache.value
  const value = window.corventa.settings.getStages().then((s) => s ?? [])
  cache = { at: now, value }
  value.catch(() => {
    if (cache?.value === value) cache = null
  })
  return value
}

/** Profil A'ya uygun stage'ler — en uygun (önerilen) önce. A geçersizse / okunamazsa boş liste. */
export async function loadStageOptions(profileA: number): Promise<StageOption[]> {
  if (!(profileA > 0)) return []
  const stages = await loadStages()
  return stages
    .filter((s) => s.isActive !== false && s.maxProfileAMm != null && Number(s.maxProfileAMm) > 0 && profileA <= Number(s.maxProfileAMm))
    .sort((a, b) => Number(a.maxProfileAMm) - Number(b.maxProfileAMm))
    .map((s, i) => ({
      stageNumber: s.stageNumber,
      name: s.name || `Stage ${s.stageNumber}`,
      maxProfileAMm: Number(s.maxProfileAMm),
      recommended: i === 0,
    }))
}

/** Operatörün bu profil A için seçtiği stage (yoksa null → önerilen kullanılır). */
export function chosenStage(profileA: number): number | null {
  const c = useBendingJobStore.getState().params.stageChoice
  if (!c || !(profileA > 0)) return null
  return Math.abs(c.profileA - profileA) < 1e-6 && c.stageNumber > 0 ? c.stageNumber : null
}

/** Seçimi yaz — önerilen seçilirse kayıt silinir (varsayılana dönüş). */
export function setStageChoice(profileA: number, stageNumber: number, recommended: boolean): void {
  useBendingJobStore.getState().setParams({ stageChoice: recommended ? null : { profileA, stageNumber } })
}
