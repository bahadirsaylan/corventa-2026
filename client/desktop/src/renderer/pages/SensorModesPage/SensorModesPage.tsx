// Ayarlar > SENSÖR DURUMLARI (2026-11-23, kullanıcı) — her sensör için AKTİF / PASİF / DEAKTİF seçimi.
// ŞİMDİLİK SADECE ARAYÜZ: seçimler bu cihazda (localStorage) hatırlanır, makineye / backend'e HİÇBİR ETKİSİ YOK.
// İşlev eklenince seçimler MachineSettings'e taşınacak.

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from '@/components/Icon'
import { useT } from '@/i18n'
import styles from './SensorModesPage.module.css'

type SensorMode = 'active' | 'passive' | 'disabled'

interface SensorGroup {
  title: string
  items: { key: string; label: string }[]
}

const LEFT_GROUPS: SensorGroup[] = [
  {
    title: 'PARÇA VARLIK SENSÖRLERİ',
    items: [
      { key: 'partLeft', label: 'SOL PARÇA VARLIK' },
      { key: 'partRight', label: 'SAĞ PARÇA VARLIK' },
    ],
  },
  {
    title: 'GERİ ESNEME ÖLÇÜM SENSÖRLERİ',
    items: [
      { key: 'measureLeft', label: 'SOL ÖLÇÜM SENSÖRÜ' },
      { key: 'measureRight', label: 'SAĞ ÖLÇÜM SENSÖRÜ' },
    ],
  },
  {
    title: 'PİSTON CETVELLERİ',
    items: [
      { key: 'rulerRight', label: 'SAĞ TOP CETVELİ' },
      { key: 'rulerLeft', label: 'SOL TOP CETVELİ' },
      { key: 'rulerUpper', label: 'ÜST TOP CETVELİ' },
      { key: 'rulerLower', label: 'ALT TOP CETVELİ' },
    ],
  },
]

const RIGHT_GROUPS: SensorGroup[] = [
  {
    title: 'YAN DAYAMA CETVELLERİ',
    items: [
      { key: 'sideRightBody', label: 'SAĞ GÖVDE' },
      { key: 'sideLeftBody', label: 'SOL GÖVDE' },
      { key: 'sideRightJoint', label: 'SAĞ MAFSAL' },
      { key: 'sideLeftJoint', label: 'SOL MAFSAL' },
      { key: 'sideRightReel', label: 'SAĞ MAKARA' },
      { key: 'sideLeftReel', label: 'SOL MAKARA' },
    ],
  },
  {
    title: 'HİDROLİK SENSÖRLERİ',
    items: [
      { key: 's1Pressure', label: 'S1 BASINÇ' },
      { key: 's2Pressure', label: 'S2 BASINÇ' },
      { key: 's1Flow', label: 'S1 AKIŞ' },
      { key: 's2Flow', label: 'S2 AKIŞ' },
      { key: 'oilTemp', label: 'YAĞ SICAKLIĞI' },
      { key: 'oilLevel', label: 'YAĞ SEVİYESİ' },
      { key: 'humidity', label: 'NEM' },
    ],
  },
]

const MODES: { value: SensorMode; label: string }[] = [
  { value: 'active', label: 'AKTİF' },
  { value: 'passive', label: 'PASİF' },
  { value: 'disabled', label: 'DEAKTİF' },
]

const STORAGE_KEY = 'corventa.sensorModes.preview'

function loadModes(): Record<string, SensorMode> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const v = raw ? (JSON.parse(raw) as unknown) : null
    return v && typeof v === 'object' ? (v as Record<string, SensorMode>) : {}
  } catch {
    return {}
  }
}

export default function SensorModesPage() {
  const navigate = useNavigate()
  const t = useT()
  const [modes, setModes] = useState<Record<string, SensorMode>>(loadModes)

  function setMode(key: string, mode: SensorMode) {
    setModes((prev) => {
      const next = { ...prev, [key]: mode }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      } catch {
        /* depolama yoksa sadece ekranda kalır */
      }
      return next
    })
  }

  function renderGroups(groups: SensorGroup[]) {
    return groups.map((g) => (
      <section key={g.title} className={styles.card}>
        <div className={styles.sectionTitle}>{t(g.title)}</div>
        {g.items.map((it) => {
          const cur = modes[it.key] ?? 'active'
          return (
            <div key={it.key} className={styles.row}>
              <span className={styles.rowLabel}>{t(it.label)}</span>
              <div className={styles.segment} role="radiogroup" aria-label={t(it.label)}>
                {MODES.map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    role="radio"
                    aria-checked={cur === m.value}
                    className={`${styles.segBtn} ${cur === m.value ? styles[`seg_${m.value}`] : ''}`}
                    onClick={() => setMode(it.key, m.value)}
                  >
                    {t(m.label)}
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </section>
    ))
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate('/settings')} aria-label={t('Geri')}>
          <Icon name="back" size="lg" />
        </button>
        <h1 className={styles.title}>{t('SENSÖR DURUMLARI')}</h1>
      </div>

      <div className={styles.body}>
        <div className={styles.notice}>
          {t('ÖNİZLEME — seçimler henüz makineye uygulanmıyor.')}
          <span className={styles.legend}>
            {t('AKTİF: kullanılır · PASİF: gösterilir, hata vermez · DEAKTİF: yok sayılır')}
          </span>
        </div>
        <div className={styles.columns}>
          <div className={styles.col}>{renderGroups(LEFT_GROUPS)}</div>
          <div className={styles.col}>{renderGroups(RIGHT_GROUPS)}</div>
        </div>
      </div>
    </div>
  )
}
