// AI ÖĞRENME KURALLARI (2026-11-19) IPC handler'ları — AI reçete eşleşmesinin dikkate aldığı / yok saydığı kriterler.
//   get     → GET /api/ai-recipe-rules → { settings, defaults, isDefault }
//   save    → PUT /api/ai-recipe-rules (ADMIN+ — DataApi [RequireRole(Admin)]; Bearer başlığını http katmanı ekler)
//   explain → GET /api/bending-jobs/similar?…&explain=true → eşleşme + aday işlerin kriter kriter sonucu
// Standart sürümde AI reçete yok (FEATURES.aiRecipe=false) → hepsi hata. Demo modunda http interceptor (demoAiRecipeRules.ts) cevaplar.

import { ipcMain } from 'electron'

import { getConfig } from '@main/config/runtime-config'
import { http } from '@main/lib/http'
import { childLogger } from '@main/lib/logger'
import { Ipc } from '@shared'
import { FEATURES } from '@shared/edition'
import type {
  AiRecipeExplainRequest,
  AiRecipeExplainResponse,
  AiRecipeMatchSettings,
  AiRecipeRulesResponse,
} from '@shared/types/ai-recipe-rules'

const log = childLogger('ipc:ai-recipe-rules')

const base = (): string => getConfig().dataApi.baseUrl

const num = (v: unknown, def: number): number => {
  const n = Number(v)
  return Number.isFinite(n) ? n : def
}
const bool = (v: unknown): boolean => v === true

function assertAi(): void {
  if (!FEATURES.aiRecipe) throw new Error('STANDART SÜRÜMDE AI REÇETE YOK')
}

/** Renderer gövdesini sözleşmedeki alanlara indir (aralık kontrolü DataApi'de) */
function sanitize(b: AiRecipeMatchSettings): AiRecipeMatchSettings {
  return {
    targetDiameterEnabled: bool(b?.targetDiameterEnabled),
    targetDiameterTol: num(b?.targetDiameterTol, 0),
    targetDiameterTolUnit: b?.targetDiameterTolUnit === 'PCT' ? 'PCT' : 'MM',
    partLengthEnabled: bool(b?.partLengthEnabled),
    partLengthTolMm: num(b?.partLengthTolMm, 0),
    stepDistanceEnabled: bool(b?.stepDistanceEnabled),
    stepDistanceTolMm: num(b?.stepDistanceTolMm, 0),
    profileAEnabled: bool(b?.profileAEnabled),
    profileATolMm: num(b?.profileATolMm, 0),
    profileBEnabled: bool(b?.profileBEnabled),
    profileBTolMm: num(b?.profileBTolMm, 0),
    profileSEnabled: bool(b?.profileSEnabled),
    profileSTolMm: num(b?.profileSTolMm, 0),
    ballDiameterEnabled: bool(b?.ballDiameterEnabled),
    ballDiameterTolMm: num(b?.ballDiameterTolMm, 0),
    centerDistanceEnabled: bool(b?.centerDistanceEnabled),
    centerDistanceTolMm: num(b?.centerDistanceTolMm, 0.01),
    oilTempEnabled: bool(b?.oilTempEnabled),
    oilTempTolC: num(b?.oilTempTolC, 2),
    oilTempAllowMissing: bool(b?.oilTempAllowMissing),
    profileTypeEnabled: bool(b?.profileTypeEnabled),
    requireWithinTolerance: bool(b?.requireWithinTolerance),
    excludeFailedMeasurement: bool(b?.excludeFailedMeasurement),
    minSuccessfulRecords: Math.round(num(b?.minSuccessfulRecords, 1)),
    selection: b?.selection === 'NEWEST' ? 'NEWEST' : 'FASTEST',
    maxRecordAgeDays: Math.round(num(b?.maxRecordAgeDays, 0)),
    includeCloudRecipes: bool(b?.includeCloudRecipes),
    cloudCenterDistanceTolMm: num(b?.cloudCenterDistanceTolMm, 0),
  }
}

export function registerAiRecipeRulesHandlers(): void {
  ipcMain.handle(Ipc.IpcInvoke.AiRecipeRulesGet, async () => {
    assertAi()
    return http.get<AiRecipeRulesResponse>(`${base()}/api/ai-recipe-rules`)
  })

  ipcMain.handle(Ipc.IpcInvoke.AiRecipeRulesSave, async (_evt, body: AiRecipeMatchSettings) => {
    assertAi()
    const clean = sanitize(body)
    log.info('ai-recipe-rules save', clean)
    return http.put<AiRecipeRulesResponse>(`${base()}/api/ai-recipe-rules`, clean)
  })

  ipcMain.handle(Ipc.IpcInvoke.AiRecipeExplain, async (_evt, req: AiRecipeExplainRequest) => {
    assertAi()
    const p = new URLSearchParams({
      targetDiameterMm: String(num(req?.targetDiameterMm, 0)),
      partLengthMm: String(num(req?.partLengthMm, 0)),
      stepDistanceMm: String(num(req?.stepDistanceMm, 0)),
      profileA: String(num(req?.profileA, 0)),
      profileB: String(num(req?.profileB, 0)),
      profileS: String(num(req?.profileS, 0)),
      ballDiameterMm: String(num(req?.ballDiameterMm, 0)),
      explain: 'true',
      explainLimit: String(Math.min(50, Math.max(1, Math.round(num(req?.explainLimit, 20))))),
    })
    if (req?.oilTempC != null && Number.isFinite(Number(req.oilTempC))) p.set('oilTempC', String(Math.round(Number(req.oilTempC))))
    if (req?.centerDistanceMm != null && Number(req.centerDistanceMm) > 0) p.set('centerDistanceMm', String(Number(req.centerDistanceMm)))
    if (typeof req?.profileType === 'string' && /^[A-Za-z]{1,20}$/.test(req.profileType)) p.set('profileType', req.profileType)
    return http.get<AiRecipeExplainResponse>(`${base()}/api/bending-jobs/similar?${p.toString()}`)
  })
}
