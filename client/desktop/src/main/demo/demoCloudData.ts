// DEMO MODU — Bulut v2 DataApi uçları (BULUT_API_V2.md §6) sahte cevapları, §5 deneme verisiyle:
//   GET  /api/molds?q=&profileType=&licensed=       önbellekteki kalıplar
//   GET  /api/molds/{code}                           kalıp + lisans durumu (400 biçim / 404 yok)
//   POST /api/molds/{code}/activate { licenseKey }   lisans etkinleştirme (bulut aktive değilse 503)
//   GET  /api/mold-code/parse?code=                  biçim kontrolü
//   GET  /api/cloud/config                           yönetilen veriler (bulut aktive değilse source 'local', hepsi boş)
//   POST /api/checklist/results                      kalite kontrol sonucu
//   GET  /api/service/requests                       1 demo servis talebi (bulutta atanmış — config.serviceRequests)
//
// Lisans anahtarları (demo):
//   KL-7H3K-9MPQ-4TXR  → 002-120-060-05 (HEB 120 özel) için GEÇERLİ
//   KL-RV8K-3MN5-TZ6H  → İPTAL EDİLMİŞ
//   KL-EX7P-R2D4-WQ9Z  → SÜRESİ DOLMUŞ (003-200-100-08)
//   başka biçimce doğru anahtar → geçersiz / bu kalıba ait değil

import { HttpError } from '@main/lib/http'
import { demoCloudActivated } from '@main/demo/demoCloud'
import { normalizeMoldCode, parseMoldCode } from '@shared/moldCode'
import type {
  CloudConfig,
  MoldActivation,
  MoldDto,
  MoldLookupResult,
  MoldProfileType,
} from '@shared/types'

function fail(status: number, rawUrl: string, error: string): never {
  throw new HttpError(status, rawUrl, error, { error })
}

const MAKERS: Record<string, string> = {
  '001': 'Corventa Makine',
  '002': 'Demo Kalıp A.Ş.',
  '003': 'Özel Vals Atölyesi',
}

function mold(
  code: string,
  profileType: MoldProfileType,
  a: number,
  b: number,
  s: number,
  name: string,
  extra: Partial<MoldDto> = {},
): MoldDto {
  const makerCode = code.slice(0, 3)
  return {
    code,
    codeVersion: 1,
    makerCode,
    makerName: MAKERS[makerCode] ?? null,
    profileType,
    a,
    b,
    s,
    isSolid: s === 0,
    kind: 'STANDARD',
    name,
    description: null,
    requiresLicense: false,
    active: true,
    defaultParams: null,
    ...extra,
  }
}

const CUSTOM = { kind: 'CUSTOM' as const, requiresLicense: true }

const MOLDS: MoldDto[] = [
  mold('001-160-160-02', 'square-out', 160, 160, 2, 'Kare kutu 160×160×2', { defaultParams: { stepDistanceMm: 12 } }),
  mold('001-160-160-00', 'square-filled', 160, 160, 0, 'Dolu kare 160'),
  mold('001-160-080-03', 'square-in', 160, 80, 3, 'Dikdörtgen kutu 160×80×3', { defaultParams: { stepDistanceMm: 15 } }),
  mold('001-114-000-04', 'circle', 114, 0, 4, 'Boru Ø114×4', { defaultParams: { stepDistanceMm: 10, notes: 'Dikişli boruda dikiş içe bakmalı' } }),
  mold('001-050-000-00', 'circle-filled', 50, 0, 0, 'Dolu mil Ø50'),
  mold('001-080-020-00', 'i-single', 80, 20, 0, 'Lama 80×20'),
  mold('001-050-050-05', 'square-out', 50, 50, 5, 'Kare kutu 50×50×5'),
  mold('001-050-050-05-01', 'l-right', 50, 50, 5, 'Köşebent 50×50×5', { description: 'Aynı ölçüdeki kare kutudan ayırmak için varyant 01' }),
  mold('001-080-080-025', 'square-out', 80, 80, 2.5, 'Kare kutu 80×80×2,5'),
  mold('001-1200-000-10', 'circle', 1200, 0, 10, 'Boru Ø1200×10 (büyük çap)'),
  mold('001-100-000-00', 't-bar', 100, 0, 0, 'T profil 100'),
  // Özel lisanslı kalıplar (§5: 3 özel lisanslı)
  mold('002-100-050-04', 'c-channel', 100, 50, 4, 'UPN 100 özel vals', { ...CUSTOM, description: 'Demo Kalıp A.Ş. özel vals takımı', defaultParams: { stepDistanceMm: 8 } }),
  mold('002-120-060-05', 'h-bar', 120, 60, 5, 'HEB 120 özel vals', { ...CUSTOM, defaultParams: { stepDistanceMm: 6, notes: 'İlk 3 pasoda yavaş ilerleyin' } }),
  mold('003-200-100-08', 'i-bar', 200, 100, 8, 'IPN 200 özel vals', { ...CUSTOM }),
  // Pasif kalıp + bu makinede desteklenmeyen profil tipi
  mold('002-060-060-03', 'square-out', 60, 60, 3, 'Kare kutu 60×60×3 (eski seri)', { active: false }),
  mold('003-090-045-06', 'custom', 90, 45, 6, 'Özel kesit 90×45×6', { kind: 'CUSTOM', description: 'Çizimle tanımlı özel kesit' }),
]

interface DemoActivation extends MoldActivation {
  key: string
}

const activations = new Map<string, DemoActivation>([
  ['002-100-050-04', { key: 'KL-UP4C-7HN2-K8MW', licenseKey: 'KL-****-****-K8MW', activatedAt: '2026-09-12T08:30:00Z', expiresAt: '2027-09-12T00:00:00Z' }],
  ['003-200-100-08', { key: 'KL-EX7P-R2D4-WQ9Z', licenseKey: 'KL-****-****-WQ9Z', activatedAt: '2025-07-01T09:00:00Z', expiresAt: '2026-06-30T00:00:00Z' }],
])

const LICENSES: Record<string, { moldCode: string; expiresAt: string | null; revoked: boolean }> = {
  'KL-7H3K-9MPQ-4TXR': { moldCode: '002-120-060-05', expiresAt: '2027-11-01T00:00:00Z', revoked: false },
  'KL-RV8K-3MN5-TZ6H': { moldCode: '002-120-060-05', expiresAt: null, revoked: true },
  'KL-EX7P-R2D4-WQ9Z': { moldCode: '003-200-100-08', expiresAt: '2026-06-30T00:00:00Z', revoked: false },
}

function isLicensed(m: MoldDto): boolean {
  if (!m.requiresLicense) return true
  const a = activations.get(m.code)
  if (!a || a.revoked) return false
  return a.expiresAt == null || new Date(a.expiresAt).getTime() > Date.now()
}

function source(): 'cloud' | 'cache' {
  return demoCloudActivated() ? 'cloud' : 'cache'
}

function lookup(m: MoldDto): MoldLookupResult {
  const a = activations.get(m.code)
  return {
    mold: m,
    licensed: isLicensed(m),
    activation: a ? { licenseKey: a.licenseKey, activatedAt: a.activatedAt, expiresAt: a.expiresAt, revoked: a.revoked } : null,
    source: source(),
  }
}

function findMold(rawUrl: string, raw: string): MoldDto {
  const code = normalizeMoldCode(decodeURIComponent(raw))
  const p = parseMoldCode(code)
  if (!p.valid) fail(400, rawUrl, p.error ?? 'Kalıp kodu biçimi geçersiz')
  const m = MOLDS.find((x) => x.code === code)
  if (!m) fail(404, rawUrl, 'KALIP KODU BULUNAMADI')
  return m
}

// ── Bulut yapılandırması (§3 machine_pull_config önbelleği) ──────────────────

let syncedAt = new Date().toISOString()

function cloudConfig(): CloudConfig {
  if (!demoCloudActivated()) {
    return {
      warranty: null,
      maintenancePolicy: null,
      checklistTemplate: null,
      welcomeMessage: null,
      servicePoints: [],
      serviceRequests: [],
      syncedAt: null,
      source: 'local',
    }
  }
  return {
    warranty: {
      startDate: '2026-03-15T00:00:00Z',
      categories: [
        { key: 'mechanical', label: 'MEKANİK ÜNİTE', days: 1095 },
        { key: 'hydraulic', label: 'HİDROLİK ÜNİTE', days: 730 },
        { key: 'electronic', label: 'ELEKTRONİK ÜNİTE', days: 730 },
        { key: 'cnc', label: 'CNC ÜNİTE', days: 365 },
      ],
      exclusions: null,
      notes: 'Bu makineye özel garanti — Demo Kalıp A.Ş. bayi anlaşması',
      isMachineSpecific: true,
      updatedAt: '2026-10-20T10:00:00Z',
    },
    maintenancePolicy: {
      name: 'MIDI standart bakım',
      rules: [
        { periodKey: 'daily', minDurationMinutes: 10 },
        { periodKey: 'weekly', minDurationMinutes: 30 },
        { periodKey: 'monthly', minDurationMinutes: 60 },
        { periodKey: 'six-monthly', minDurationMinutes: 120 },
        { periodKey: 'twelve-monthly', minDurationMinutes: 240 },
      ],
      reminderAfterMinutes: 180,
      autoCloseAfterMinutes: 15,
      updatedAt: '2026-10-20T10:00:00Z',
    },
    checklistTemplate: {
      id: 'qc-midi',
      version: 3,
      name: 'SEVKİYAT ÖNCESİ KALİTE KONTROL',
      items: [
        { id: 'qc01', text: 'Acil stop butonları ve kapı emniyetleri test edildi', category: 'Güvenlik' },
        { id: 'qc02', text: 'Faz sırası ve motor dönüş yönü doğru', category: 'Elektrik' },
        { id: 'qc03', text: 'Hidrolik kaçak kontrolü (30 dk basınç altında)', category: 'Hidrolik' },
        { id: 'qc04', text: 'S1 / S2 basınç sensörleri kalibre edildi', category: 'Hidrolik' },
        { id: 'qc05', text: 'Tüm piston cetvelleri sıfırlandı ve doğrulandı', category: 'Ölçüm' },
        { id: 'qc06', text: 'Rotasyon encoder yönü ve ölçeği doğru', category: 'Ölçüm' },
        { id: 'qc07', text: 'Parça varlık sensörleri (sol/sağ) test edildi', category: 'Sensör' },
        { id: 'qc08', text: 'Geri esneme ölçüm sensörü kalibre edildi', category: 'Sensör' },
        { id: 'qc09', text: 'Deneme bükümü yapıldı (Ø1000 kare kutu 40×40×2)', category: 'Büküm' },
        { id: 'qc10', text: 'Etiket, seri no plakası ve kılavuz makinede', category: 'Genel' },
      ],
    },
    welcomeMessage: 'CORVENTA MIDI #42\n\nDemo Atölye ailesine hoş geldiniz.\nGünlük bakımı unutmayın — iyi çalışmalar!',
    servicePoints: [
      { name: 'İMAGES SERVİCES', city: 'MUSTAFA KEMAL PAŞA / BURSA', phone: '+90 (224) 526 13 52', web: 'www.imageservices.com', email: 'servis@imageservices.com', lat: 40.0355, lon: 28.4115 },
      { name: 'KELESTEK', city: 'KELES / BURSA', phone: '+90 (224) 699 23 23', web: 'www.kelestek.com', email: 'service@kelestek.com', lat: 39.9135, lon: 29.2327 },
      { name: 'DURSUNMAK', city: 'DURSUNBEY / BALIKESİR', phone: '+90 (266) 476 63 63', web: 'www.dursunmak.com', email: 'info@dursunmak.com', lat: 39.5858, lon: 28.6253 },
      { name: 'GEMLİK HİDROLİK', city: 'GEMLİK / BURSA', phone: '+90 (224) 513 40 40', web: 'www.gemlikhidrolik.com', email: 'servis@gemlikhidrolik.com', lat: 40.4318, lon: 29.1571 },
    ],
    serviceRequests: [
      { localId: '7', status: 'ASSIGNED', assignedTo: 'Serkan Usta', assignedOrg: 'KELESTEK', updatedAt: '2026-10-31T14:20:00Z', note: 'Pazartesi 09:00 ziyaret planlandı' },
    ],
    syncedAt,
    source: 'cache',
  }
}

const DEMO_SERVICE_REQUEST = {
  id: 7,
  code: 'ST-2026-0007',
  customerName: 'Demo Atölye',
  customerAddress: 'Nilüfer / Bursa',
  machineModel: 'MIDI',
  machineProductionYear: '2026',
  machineCode: 'CRV-MIDI-2026-0042',
  machineVeAiCode: 'AI-042',
  technicianName: '',
  contactInfo: '+90 555 000 00 00',
  purpose: 0,
  status: 1,
  problemDescription: 'Sol pistonda yavaşlama ve S2 basıncında dalgalanma.',
  workDoneCodes: '[]',
  partsUsedCodes: '[]',
  missingPartsCodes: '[]',
  reportCode: null,
  confirmCode: null,
  isConfirmed: false,
  rating: null,
  ratingNote: null,
  createdAt: '2026-10-30T09:15:00Z',
  startedAt: null,
  completedAt: null,
}

let checklistSeq = 1

/** İstek bu modülün ucu değilse undefined döner (DemoMachine sıradaki yönlendirmeye geçer) */
export function demoCloudData(
  rawUrl: string,
  u: URL,
  path: string,
  method: string,
  b: Record<string, unknown>,
): { handled: true; value: unknown } | undefined {
  const done = (value: unknown) => ({ handled: true as const, value })
  let m: RegExpExecArray | null

  if (path === '/api/molds' && method === 'GET') {
    const q = (u.searchParams.get('q') ?? '').trim().toLocaleLowerCase('tr-TR')
    const pt = u.searchParams.get('profileType') ?? ''
    const lic = u.searchParams.get('licensed')
    const items = MOLDS.filter((x) => {
      if (pt && x.profileType !== pt) return false
      const l = isLicensed(x)
      if (lic === 'true' && !l) return false
      if (lic === 'false' && l) return false
      if (!q) return true
      return [x.code, x.name ?? '', x.makerName ?? '', x.makerCode].some((f) => f.toLocaleLowerCase('tr-TR').includes(q))
    }).map((x) => ({ ...x, licensed: isLicensed(x) }))
    return done({ items, syncedAt })
  }

  if ((m = /^\/api\/molds\/([^/]+)\/activate$/.exec(path)) && method === 'POST') {
    const md = findMold(rawUrl, m[1])
    if (!demoCloudActivated()) {
      fail(503, rawUrl, 'Bulut bağlantısı yok — lisans etkinleştirmek için makine buluta bağlı olmalı (Ayarlar > Bulut Bağlantısı)')
    }
    if (!md.requiresLicense) fail(400, rawUrl, 'Bu kalıp lisans gerektirmiyor')
    const key = String(b.licenseKey ?? '').trim().toUpperCase()
    if (!/^KL-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(key)) fail(400, rawUrl, 'LICENSE: Lisans anahtarı biçimi geçersiz')
    const lic = LICENSES[key]
    if (!lic || lic.moldCode !== md.code) fail(400, rawUrl, 'LICENSE: Lisans anahtarı geçersiz veya bu kalıba ait değil')
    if (lic.revoked) fail(400, rawUrl, 'LICENSE: Lisans iptal edilmiş')
    if (lic.expiresAt && new Date(lic.expiresAt).getTime() <= Date.now()) fail(400, rawUrl, 'LICENSE: Lisans süresi dolmuş')
    activations.set(md.code, {
      key,
      licenseKey: `KL-****-****-${key.slice(-4)}`,
      activatedAt: new Date().toISOString(),
      expiresAt: lic.expiresAt,
    })
    return done(lookup(md))
  }

  if ((m = /^\/api\/molds\/([^/]+)$/.exec(path)) && method === 'GET') {
    return done(lookup(findMold(rawUrl, m[1])))
  }

  if (path === '/api/mold-code/parse' && method === 'GET') {
    const p = parseMoldCode(u.searchParams.get('code') ?? '')
    return done({ valid: p.valid, makerCode: p.makerCode ?? null, a: p.a ?? null, b: p.b ?? null, s: p.s ?? null, isSolid: p.isSolid ?? null, variant: p.variant ?? null, error: p.error })
  }

  if (path === '/api/cloud/config' && method === 'GET') return done(cloudConfig())

  if (path === '/api/checklist/results' && method === 'POST') {
    if (!String(b.inspectorName ?? '').trim()) fail(400, rawUrl, 'Kontrolcü adı zorunlu')
    syncedAt = new Date().toISOString()
    return done({ id: checklistSeq++, savedAt: syncedAt, pushed: demoCloudActivated() })
  }

  if (path === '/api/service/requests' && method === 'GET') return done([DEMO_SERVICE_REQUEST])
  if (path === '/api/service/requests/7' && method === 'GET') return done(DEMO_SERVICE_REQUEST)

  return undefined
}
