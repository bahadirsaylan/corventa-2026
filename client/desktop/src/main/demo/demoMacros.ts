// DEMO MODU — Usta öğrenme programı / makro (EXCEL 28). DataApi /api/macros sözleşmesiyle birebir:
//   GET liste (adımsız, son güncellenen önce) · GET {id} · POST (OPERATOR+) · PUT (OPERATOR+, adımlar tamamen
//   değişir) · DELETE (ADMIN+). Aynı doğrulama kuralları ve hata metinleri (MacrosController.Validate).
// Kayıtlar süreç boyunca bellekte tutulur; başlangıçta tek örnek makro vardır.

import { demoRequireRole } from '@main/demo/demoAuth'
import { HttpError } from '@main/lib/http'
import type { Macro, MacroAxis, MacroStep, MacroStepType } from '@shared/types'

const AXES: MacroAxis[] = ['Left', 'Right', 'Upper', 'Lower', 'Rotation', 'PneumaticLeft', 'PneumaticRight']
const TYPES: MacroStepType[] = ['Position', 'Distance', 'Pneumatic']
const MAX_STEPS = 500

let nextMacroId = 2
let nextStepId = 100
const macros: Macro[] = [
  {
    id: 1,
    name: 'ÖRNEK MAKRO',
    description: 'Demo örneği — sol piston, rotasyon, sağ piston',
    createdAt: new Date(Date.now() - 86_400_000).toISOString(),
    updatedAt: new Date(Date.now() - 86_400_000).toISOString(),
    createdBy: 'operator',
    updatedBy: 'operator',
    stepCount: 4,
    steps: [
      { id: 1, stepOrder: 1, axis: 'Left', stepType: 'Position', value: 40, speedPercent: 30 },
      { id: 2, stepOrder: 2, axis: 'Rotation', stepType: 'Position', value: 300, speedPercent: 40 },
      { id: 3, stepOrder: 3, axis: 'Right', stepType: 'Position', value: 25.5, speedPercent: 30 },
      { id: 4, stepOrder: 4, axis: 'Left', stepType: 'Position', value: 0, speedPercent: 30 },
    ],
  },
]

function fail(status: number, url: string, error: string): never {
  throw new HttpError(status, url, error, { error })
}

function summary(m: Macro) {
  const { steps: _s, ...rest } = m
  return { ...rest, stepCount: m.steps.length }
}

/** MacrosController.Validate ile aynı kurallar — hata metni döner (geçerliyse adımlarla birlikte null) */
function validate(b: Record<string, unknown>): { error: string } | { name: string; description: string | null; steps: MacroStep[] } {
  const name = String(b.name ?? '').trim()
  if (!name) return { error: 'Makro adı zorunlu' }
  if (name.length > 100) return { error: 'Makro adı en fazla 100 karakter' }
  const rawDesc = typeof b.description === 'string' ? b.description.trim() : ''
  const description = rawDesc || null
  if (description && description.length > 1000) return { error: 'Açıklama en fazla 1000 karakter' }
  const input = Array.isArray(b.steps) ? (b.steps as Record<string, unknown>[]) : []
  if (input.length > MAX_STEPS) return { error: `Bir makroda en fazla ${MAX_STEPS} adım olabilir` }

  const steps: MacroStep[] = []
  for (let i = 0; i < input.length; i++) {
    const s = input[i] ?? {}
    const no = i + 1
    const axis = AXES.find((a) => a.toLowerCase() === String(s.axis ?? '').trim().toLowerCase())
    if (!axis) return { error: `Adım ${no}: geçersiz eksen '${String(s.axis ?? '')}'` }
    const type = TYPES.find((t) => t.toLowerCase() === String(s.stepType ?? '').trim().toLowerCase())
    if (!type) return { error: `Adım ${no}: geçersiz adım tipi '${String(s.stepType ?? '')}'` }
    const pneu = axis === 'PneumaticLeft' || axis === 'PneumaticRight'
    if (pneu && type !== 'Pneumatic') return { error: `Adım ${no}: pnömatik eksende tip 'Pneumatic' olmalı` }
    if (!pneu && type === 'Pneumatic') return { error: `Adım ${no}: 'Pneumatic' tipi sadece pnömatik eksende kullanılır` }
    if (type === 'Distance' && axis !== 'Rotation') return { error: `Adım ${no}: 'Distance' tipi sadece rotasyonda kullanılır` }
    const value = Number(s.value)
    if (s.value == null || !Number.isFinite(value)) return { error: `Adım ${no}: değer zorunlu` }
    if (Math.abs(value) > 1_000_000) return { error: `Adım ${no}: değer aralık dışı` }
    let speed = Math.round(Number(s.speedPercent) || 0)
    if (pneu) speed = 0
    else if (speed < 1 || speed > 100) return { error: `Adım ${no}: hız 1-100 % arası olmalı` }
    steps.push({ id: nextStepId++, stepOrder: no, axis, stepType: type, value: Math.round(value * 1000) / 1000, speedPercent: speed })
  }
  return { name, description, steps }
}

/** /api/macros* isteklerini cevaplar */
export function demoMacros(rawUrl: string, path: string, method: string, b: Record<string, unknown>): unknown {
  if (path === '/api/macros' && method === 'GET') {
    return [...macros].sort((x, y) => y.updatedAt.localeCompare(x.updatedAt)).map(summary)
  }
  if (path === '/api/macros' && method === 'POST') {
    const actor = demoRequireRole(rawUrl, 'OPERATOR')
    const v = validate(b)
    if ('error' in v) fail(400, rawUrl, v.error)
    const now = new Date().toISOString()
    const macro: Macro = {
      id: nextMacroId++,
      name: v.name,
      description: v.description,
      createdAt: now,
      updatedAt: now,
      createdBy: actor.username,
      updatedBy: actor.username,
      stepCount: v.steps.length,
      steps: v.steps,
    }
    macros.push(macro)
    return structuredClone(macro)
  }
  const m = /^\/api\/macros\/(\d+)$/.exec(path)
  if (m) {
    const id = Number(m[1])
    const idx = macros.findIndex((x) => x.id === id)
    if (method === 'GET') {
      if (idx < 0) fail(404, rawUrl, `Makro #${id} bulunamadı`)
      return structuredClone({ ...macros[idx], stepCount: macros[idx].steps.length })
    }
    if (method === 'PUT') {
      const actor = demoRequireRole(rawUrl, 'OPERATOR')
      const v = validate(b)
      if ('error' in v) fail(400, rawUrl, v.error)
      if (idx < 0) fail(404, rawUrl, `Makro #${id} bulunamadı`)
      const cur = macros[idx]
      macros[idx] = {
        ...cur,
        name: v.name,
        description: v.description,
        updatedAt: new Date().toISOString(),
        updatedBy: actor.username,
        stepCount: v.steps.length,
        steps: v.steps,
      }
      return structuredClone(macros[idx])
    }
    if (method === 'DELETE') {
      demoRequireRole(rawUrl, 'ADMIN')
      if (idx < 0) fail(404, rawUrl, `Makro #${id} bulunamadı`)
      macros.splice(idx, 1)
      return { ok: true }
    }
  }
  fail(404, rawUrl, 'Demo modunda desteklenmiyor')
}
