// Admin Ayarları > ÖLÇÜM & SENSÖR — radyus (Keyence GT2) sensörleri (2026-11-02, web Dashboard'daki kartların karşılığı).
// Canlı okuma (SignalR state) + SIFIRLA (o anki değer sıfır olur, ofset DB'ye yazılır) + TEMİZLE (sıfır kaldırılır)
// + PLC ENCODER SIFIRLA (GT-5102 sayacı donanımsal 0 — onaylı). Hareket komutu yok; büküm sırasında kilitli.
// SIFIRLA / TEMİZLE backend'de ofseti DB'ye yazar → formdaki SIFIR OFSETİ alanı onUpdatedOffset ile eşitlenir
// (aksi halde eski değer formda kalır ve sonraki KAYDET yeni sıfırı ezerdi).

import { useState } from 'react'

import ConfirmModal from '@/components/ConfirmModal/ConfirmModal'
import { settingsFormStyles as styles } from '@/components/SettingsForm/SettingsForm'
import { useT } from '@/i18n'
import { useMachineStateStore } from '@/stores/machineStateStore'
import own from './RadiusSensorCard.module.css'

type Side = 'left' | 'right'
type Action = 'zero' | 'clear' | 'reset-encoder'

const OFFSET_KEY: Record<Side, string> = {
  left: 'leftRadiusSensorZeroOffsetMm',
  right: 'rightRadiusSensorZeroOffsetMm',
}

const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e))

interface Props {
  bendingActive: boolean
  /** Backend ofseti DB'ye yazdı → form değerini (kayıtlı + düzenlenen) bu değere eşitle */
  onUpdatedOffset: (key: string, value: number) => void
}

export default function RadiusSensorCard({ bendingActive, onUpdatedOffset }: Props) {
  const t = useT()
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [confirmReset, setConfirmReset] = useState<Side | null>(null)

  async function run(side: Side, action: Action) {
    setBusy(true)
    setMsg(null)
    try {
      const r = (await window.corventa.bending.radiusSensorAction(side, action)) as { offsetMm?: number } | undefined
      if (action === 'zero' && typeof r?.offsetMm === 'number') onUpdatedOffset(OFFSET_KEY[side], r.offsetMm)
      if (action === 'clear') onUpdatedOffset(OFFSET_KEY[side], 0)
      const sideText = side === 'left' ? t('SOL') : t('SAĞ')
      setMsg({
        ok: true,
        text:
          action === 'zero'
            ? t('{side} SENSÖR SIFIRLANDI', { side: sideText })
            : action === 'clear'
              ? t('{side} SENSÖR SIFIRI TEMİZLENDİ', { side: sideText })
              : t('{side} PLC ENCODER SIFIRLANDI', { side: sideText }),
      })
    } catch (e) {
      setMsg({ ok: false, text: errMsg(e) })
    } finally {
      setBusy(false)
    }
  }

  const locked = busy || bendingActive

  return (
    <div className={styles.card}>
      <div className={styles.sectionTitle}>{t('RADYUS SENSÖRLERİ')}</div>
      <p className={styles.sectionNote}>
        {t('SIFIRLA: sensörün o anki değeri sıfır kabul edilir ve ofset kaydedilir. TEMİZLE: sıfır kaldırılır, ham değer kullanılır. PLC ENCODER SIFIRLA: sensör sayacı PLC içinde sıfırlanır.')}
      </p>
      {bendingActive && (
        <p className={styles.message} data-kind="err">
          {t('Büküm devam ediyor — sensör sıfırlanamaz.')}
        </p>
      )}
      {msg && (
        <p className={styles.message} data-kind={msg.ok ? 'ok' : 'err'}>
          {msg.text}
        </p>
      )}
      <div className={own.grid}>
        <SensorColumn side="left" locked={locked} onAction={run} onResetEncoder={() => setConfirmReset('left')} />
        <SensorColumn side="right" locked={locked} onAction={run} onResetEncoder={() => setConfirmReset('right')} />
      </div>

      {confirmReset && (
        <ConfirmModal
          message={t('{side} radyus sensörünün PLC encoder sayacı sıfırlanacak. Ölçüm çubuğu geri çekili ve parçaya değmiyor olmalı.', {
            side: confirmReset === 'left' ? t('SOL') : t('SAĞ'),
          })}
          confirmLabel="SIFIRLA"
          variant="danger"
          onCancel={() => setConfirmReset(null)}
          onConfirm={() => {
            const side = confirmReset
            setConfirmReset(null)
            void run(side, 'reset-encoder')
          }}
        />
      )}
    </div>
  )
}

function SensorColumn({
  side,
  locked,
  onAction,
  onResetEncoder,
}: {
  side: Side
  locked: boolean
  onAction: (side: Side, action: Action) => void
  onResetEncoder: () => void
}) {
  const t = useT()
  const left = side === 'left'
  const raw = useMachineStateStore((s) => (left ? s.state.leftRadiusSensorRaw : s.state.rightRadiusSensorRaw) ?? 0)
  const mm = useMachineStateStore((s) => (left ? s.state.leftRadiusSensorMm : s.state.rightRadiusSensorMm) ?? 0)
  const eff = useMachineStateStore(
    (s) => (left ? s.state.leftRadiusSensorEffectiveMm : s.state.rightRadiusSensorEffectiveMm) ?? 0,
  )
  const zeroed = useMachineStateStore(
    (s) => (left ? s.state.leftRadiusSensorZeroed : s.state.rightRadiusSensorZeroed) === true,
  )

  return (
    <div className={own.col}>
      <div className={own.head}>
        <span className={own.title}>{left ? t('SOL') : t('SAĞ')}</span>
        <span className={own.badge} data-zeroed={zeroed || undefined}>
          {zeroed ? t('SIFIRLI') : t('HAM')}
        </span>
      </div>
      <div className={own.value}>
        {(zeroed ? eff : mm).toFixed(4)} <span className={own.unit}>mm</span>
      </div>
      <div className={own.sub}>
        PULSE: {raw}
        {zeroed && ` · ${t('HAM')}: ${mm.toFixed(4)} mm`}
      </div>
      <div className={own.btnRow}>
        <button type="button" className={styles.saveBtn} disabled={locked} onClick={() => onAction(side, 'zero')}>
          {t('SIFIRLA')}
        </button>
        <button type="button" className={styles.resetBtn} disabled={locked || !zeroed} onClick={() => onAction(side, 'clear')}>
          {t('TEMİZLE')}
        </button>
      </div>
      <button type="button" className={`${styles.resetBtn} ${own.encoderBtn}`} disabled={locked} onClick={onResetEncoder}>
        {t('PLC ENCODER SIFIRLA')}
      </button>
    </div>
  )
}
