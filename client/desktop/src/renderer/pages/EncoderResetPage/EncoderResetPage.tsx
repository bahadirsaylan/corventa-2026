// Ayarlar > Cetvel Sıfırlama — encoder gruplarını manuel sıfırlama paneli.
// Backend: POST /api/machine/reset-encoders?bitmask=X (bit0=R/L, bit1=U/L, bit2=Pnö, bit3=Rot, bit4=SolRadius, bit5=SağRadius)
// UI: her grup için son sıfırlama zamanı + checkbox + "Seçilenleri Sıfırla" büyük buton.

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './EncoderResetPage.module.css'

interface EncoderGroup {
  key: string
  label: string
  bitmask: number
  desc: string
}

const GROUPS: EncoderGroup[] = [
  { key: 'rightLeft', label: 'SAĞ / SOL PİSTON',   bitmask: 0x01, desc: 'Sağ + sol büyük piston cetvelleri (Renishaw 5112)' },
  { key: 'upperLower',label: 'ÜST / ALT PİSTON',   bitmask: 0x02, desc: 'Üst + alt piston cetvelleri' },
  { key: 'pneumatic', label: 'PNÖMATİK',           bitmask: 0x04, desc: 'Pnömatik silindir encoder (springback prop)' },
  { key: 'rotation',  label: 'ROTASYON',           bitmask: 0x08, desc: 'RV3100 rotasyon encoder' },
  { key: 'leftRadius',label: 'SOL RADIUS SENSÖRÜ', bitmask: 0x10, desc: 'GT-5102 Ch#0 Keyence GT2 sol radius' },
  { key: 'rightRadius',label: 'SAĞ RADIUS SENSÖRÜ',bitmask: 0x20, desc: 'GT-5102 Ch#1 Keyence GT2 sağ radius' },
]

// Mock son sıfırlama zamanları — gerçek zamanlar orchestrator PhysicalState'ten gelecek
const MOCK_LAST_RESET: Record<string, string | null> = {
  rightLeft: '2026-08-14 09:12', upperLower: '2026-08-14 09:12',
  pneumatic: '2026-08-10 15:34', rotation: '2026-08-14 09:14',
  leftRadius: null, rightRadius: null,
}

export default function EncoderResetPage() {
  const navigate = useNavigate()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [resetting, setResetting] = useState(false)

  function toggle(k: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(k)) next.delete(k)
      else next.add(k)
      return next
    })
  }

  function selectAll() { setSelected(new Set(GROUPS.map((g) => g.key))) }
  function clearAll()  { setSelected(new Set()) }

  const combinedBitmask = GROUPS
    .filter((g) => selected.has(g.key))
    .reduce((sum, g) => sum + g.bitmask, 0)

  async function handleReset() {
    if (selected.size === 0) return
    setResetting(true)
    // Gerçek çağrı: window.corventa.machine.resetEncodersByMask(combinedBitmask)
    setTimeout(() => {
      alert(`Bitmask 0x${combinedBitmask.toString(16).toUpperCase()} (${selected.size} grup) sıfırlandı (mock)`)
      setResetting(false)
      setSelected(new Set())
    }, 1200)
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate('/settings')} aria-label="Geri">←</button>
        <h1 className={styles.title}>CETVEL SIFIRLAMA</h1>
      </div>

      <div className={styles.body}>
        <div className={styles.warnBar}>
          ⚠ CETVEL SIFIRLAMA MAKİNE FİZİKSEL POZİSYON REFERANSINI DEĞİŞTİRİR.
          &nbsp;GÖNYE İŞLEMİ SIRASINDA VEYA HİDROLİK MOTOR KAPALIYKEN YAPINIZ.
        </div>

        <div className={styles.card}>
          <div className={styles.sectionTitleRow}>
            <span className={styles.sectionTitle}>ENCODER GRUPLARI</span>
            <div className={styles.selectActions}>
              <button className={styles.smallBtn} onClick={selectAll}>TÜMÜNÜ SEÇ</button>
              <button className={styles.smallBtn} onClick={clearAll}>TEMİZLE</button>
            </div>
          </div>

          <div className={styles.groupList}>
            {GROUPS.map((g) => {
              const isSelected = selected.has(g.key)
              const lastReset = MOCK_LAST_RESET[g.key]
              return (
                <label key={g.key} className={`${styles.groupRow} ${isSelected ? styles.rowSelected : ''}`}>
                  <input
                    type="checkbox"
                    className={styles.checkbox}
                    checked={isSelected}
                    onChange={() => toggle(g.key)}
                  />
                  <div className={styles.groupInfo}>
                    <span className={styles.groupLabel}>{g.label}</span>
                    <span className={styles.groupDesc}>{g.desc}</span>
                  </div>
                  <div className={styles.lastResetCol}>
                    <span className={styles.lastResetLabel}>SON SIFIRLAMA</span>
                    <span className={styles.lastResetValue}>
                      {lastReset ?? 'HİÇ YAPILMADI'}
                    </span>
                  </div>
                  <span className={styles.bitmask}>bit 0x{g.bitmask.toString(16).toUpperCase()}</span>
                </label>
              )
            })}
          </div>
        </div>

        {/* Bitmask ön izleme + reset butonu */}
        <div className={styles.actionRow}>
          <div className={styles.bitmaskPreview}>
            <span className={styles.bitmaskLabel}>SEÇİLEN</span>
            <span className={styles.bitmaskValue}>
              {selected.size === 0 ? '—' : `0x${combinedBitmask.toString(16).toUpperCase()} (${selected.size} grup)`}
            </span>
          </div>
          <button
            type="button"
            className={styles.resetBtn}
            onClick={handleReset}
            disabled={selected.size === 0 || resetting}
          >
            {resetting ? 'SIFIRLANIYOR...' : '↻ SEÇİLENLERİ SIFIRLA'}
          </button>
        </div>
      </div>
    </div>
  )
}
