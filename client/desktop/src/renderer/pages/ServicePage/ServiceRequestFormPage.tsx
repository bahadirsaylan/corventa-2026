// SEKIL-51-TG — Yeni servis talebi oluşturma.
// Müşteri makina kimliği zaten DataApi'den makina ayarlarına gelecek;
// şimdilik SettingsPage'deki gibi sabit placeholder. İleride MachineSettings dinamik gelir.

import { useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import {
  ServicePurpose,
  type ServiceRequestCreateRequest,
} from '@shared/types'

import { useCreateServiceRequest } from '@/hooks/useService'
import { useT } from '@/i18n'
import {
  checkAlertText,
  selectLatestStall,
  stallAlertText,
  useSafetyAlertsStore,
} from '@/stores/safetyAlertsStore'

import ServicePageShell from './ServicePageShell'
import styles from './ServiceRequestFormPage.module.css'

// 2026-11-12 — başlık serbest metin değil, amaca göre seçim listesi (kullanıcı kararı).
// Seçilen metin (Türkçe) eskisi gibi problemDescription'ın ilk satırına yazılır — backend değişmedi.
type TitleOption = { label: string }

const TITLE_OPTIONS: Record<ServicePurpose, readonly TitleOption[]> = {
  [ServicePurpose.ArizaGiderme]: [
    { label: 'HİDROLİK ARIZA' },
    { label: 'ELEKTRİK / ELEKTRONİK ARIZA' },
    { label: 'PLC / YAZILIM ARIZASI' },
    { label: 'SENSÖR ARIZASI (ENCODER / BASINÇ / PARÇA SENSÖRÜ)' },
    { label: 'MOTOR / POMPA ARIZASI' },
    { label: 'MEKANİK ARIZA (TOP / RULMAN / MİL)' },
    { label: 'ACİL STOP / EMNİYET DEVRESİ' },
    { label: 'DİĞER' },
  ],
  [ServicePurpose.GenelBakim]: [
    { label: 'GÜNLÜK BAKIM' },
    { label: 'HAFTALIK BAKIM' },
    { label: 'AYLIK BAKIM' },
    { label: '6 AYLIK BAKIM' },
    { label: 'YILLIK BAKIM' },
    { label: 'YAĞ / FİLTRE DEĞİŞİMİ' },
  ],
  // Ağır bakım: tek seçenek, ayrıntı açıklamada müşterinin kendi talebi
  [ServicePurpose.AgirBakim]: [{ label: 'MÜŞTERİ TALEBİ' }],
  // Kurulum sekmesi kaldırıldı ama amaç değeri (3) eski kayıtlarda var — talep amacı olarak duruyor
  [ServicePurpose.Kurulum]: [
    { label: 'İLK KURULUM / DEVREYE ALMA' },
    { label: 'MAKİNE TAŞIMA / YENİDEN KURULUM' },
    { label: 'KALIP / APARAT MONTAJI' },
    { label: 'DİĞER' },
  ],
  [ServicePurpose.Egitim]: [
    { label: 'OPERATÖR EĞİTİMİ' },
    { label: 'BAKIM EĞİTİMİ' },
    { label: 'YAZILIM / YENİ ÖZELLİK EĞİTİMİ' },
    { label: 'İLERİ SEVİYE (AI BÜKÜM) EĞİTİMİ' },
    { label: 'DİĞER' },
  ],
}

function firstTitle(p: ServicePurpose): string {
  return TITLE_OPTIONS[p][0]?.label ?? ''
}

/** Güvenlik uyarı kodu → en uygun arıza başlığı (belirgin değilse null = ilk seçenek kalır) */
function faultTitleForCode(code: string): string | null {
  if (code === 'EncoderStall' || code.endsWith('SensorFault')) {
    return 'SENSÖR ARIZASI (ENCODER / BASINÇ / PARÇA SENSÖRÜ)'
  }
  if (code.startsWith('OilTemp')) return 'HİDROLİK ARIZA'
  return null
}

export default function ServiceRequestFormPage() {
  const navigate = useNavigate()
  const t = useT()
  const { create, submitting, error } = useCreateServiceRequest()

  // ?purpose=<ServicePurpose> ile açılırsa başlangıç amacı o olur
  const [searchParams] = useSearchParams()
  const [purpose, setPurpose] = useState<ServicePurpose>(() => {
    const p = Number(searchParams.get('purpose'))
    return (Object.values(ServicePurpose) as number[]).includes(p) && searchParams.get('purpose') !== null
      ? (p as ServicePurpose)
      : ServicePurpose.ArizaGiderme
  })

  // Form açıldığı andaki aktif güvenlik uyarıları → ARIZA GİDERME için açıklama + başlık önerisi
  const [faultPrefill] = useState(() => {
    const { check, stalls } = useSafetyAlertsStore.getState()
    const lines: string[] = []
    let suggested: string | null = null
    if (check) {
      const codes = check.payload.blocked
        ? ['OilTempCritical']
        : (check.payload.warnings ?? []).map((w) => w.code)
      const text = checkAlertText(check, t)
      if (text) lines.push(`[${codes.join(', ') || 'SafetyCheck'}] ${text}`)
      for (const c of codes) suggested ??= faultTitleForCode(c)
    }
    const stall = selectLatestStall(stalls)
    if (stall) {
      lines.push(`[EncoderStall] ${stallAlertText(stall, t)}`)
      suggested ??= faultTitleForCode('EncoderStall')
    }
    return lines.length > 0 ? { text: lines.join('\n'), title: suggested } : null
  })
  const prefillFor = (p: ServicePurpose) => (p === ServicePurpose.ArizaGiderme ? faultPrefill : null)

  const [title, setTitle] = useState(() => prefillFor(purpose)?.title ?? firstTitle(purpose))
  const [description, setDescription] = useState(() => prefillFor(purpose)?.text ?? '')
  // Kullanıcı açıklamaya yazdıysa amaç değişimi / otomatik doldurma onu ezmez
  const descTouched = useRef(false)

  function changePurpose(p: ServicePurpose) {
    if (p === purpose) return
    setPurpose(p)
    const pre = prefillFor(p)
    setTitle(pre?.title ?? firstTitle(p))
    if (!descTouched.current) setDescription(pre?.text ?? '')
  }
  // İleride MachineSettings'ten dinamik gelecek — şimdilik sabit
  const [customerName] = useState('SERSOVİS A.Ş.')

  async function handleSubmit() {
    if (!title.trim() || !description.trim()) return
    const req: ServiceRequestCreateRequest = {
      customerName: customerName.trim(),
      customerAddress: '40.198517, 28.836939',
      machineModel: '4R CPB MIDI',
      machineProductionYear: '10.2020',
      machineCode: '2010-400-001',
      machineVeAiCode: 'A-400-001',
      purpose,
      problemDescription: `${title.trim()}\n\n${description.trim()}`,
    }
    const created = await create(req)
    if (created) navigate('/service/requests')
  }

  return (
    <ServicePageShell title="YENİ SERVİS TALEBİ" onBack={() => navigate('/service/requests')}>
      <div className={styles.root}>
        {/* Amaç seçimi */}
        <div className={styles.purposeBox}>
          <span className={styles.purposeLabel}>{t('SERVİSİN AMACI :')}</span>
          <div className={styles.purposeRow}>
            {(
              [
                [ServicePurpose.ArizaGiderme, 'ARIZA GİDERME'],
                [ServicePurpose.GenelBakim, 'GENEL BAKIM'],
                [ServicePurpose.AgirBakim, 'AĞIR BAKIM'],
                [ServicePurpose.Kurulum, 'KURULUM'],
                [ServicePurpose.Egitim, 'EĞİTİM'],
              ] as const
            ).map(([val, label]) => (
              <button
                key={val}
                className={[
                  styles.purposeBtn,
                  purpose === val ? styles.purposeBtnActive : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => changePurpose(val)}
              >
                {t(label)}
              </button>
            ))}
          </div>
        </div>

        {/* Talep gövdesi */}
        <div className={styles.formBox}>
          <label className={styles.titleRow}>
            <span className={styles.titleLabel}>{t('TALEBİN BAŞLIĞI :')}</span>
            <select
              className={styles.titleSelect}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            >
              {!title && (
                <option value="" disabled>
                  {t('BAŞLIK SEÇİNİZ...')}
                </option>
              )}
              {TITLE_OPTIONS[purpose].map((o) => (
                <option key={o.label} value={o.label}>
                  {t(o.label)}
                </option>
              ))}
            </select>
          </label>
          <textarea
            className={styles.descInput}
            value={description}
            onChange={(e) => {
              descTouched.current = true
              setDescription(e.target.value)
            }}
            placeholder={t('TALEBİNİZİN DETAYINI YAZINIZ...')}
            maxLength={2000}
          />
        </div>

        {error && <div className={styles.errorBox}>{t('Hata: {err}', { err: error })}</div>}

        {/* Aksiyon */}
        <div className={styles.actionRow}>
          <button
            className={styles.cancelBtn}
            onClick={() => navigate('/service/requests')}
            disabled={submitting}
          >
            {t('GERİ DÖN')}
          </button>
          <button
            className={styles.submitBtn}
            onClick={handleSubmit}
            disabled={submitting || !title.trim() || !description.trim()}
          >
            {t('TALEBİ GÖNDER')}
          </button>
        </div>
      </div>
    </ServicePageShell>
  )
}
