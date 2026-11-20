// CETVELLER GEÇERSİZ (2026-11-19, GÜVENLİ GÖNYE) — Remote I/O yeniden başladı / PLC bağlantısı koptu / gönye cetvel
// sıfırlamadan sonra yarıda kaldı → uyarı kuyruğundan (alertQueueStore) bir kez açılır (aynı olay: sebep + an).
// Büküm sürerken kuyruk duraklar (büküm zaten kesinti zinciriyle durdurulur, alarm ekranı açılır).
// Açılıştaki geçersizlik (APP_START — her sabah beklenen) pencere AÇMAZ; alt şeritte kalıcı uyarı yeter.
// Sadece görünürlük; hareket kilidi backend'de (konum / stage / sıkıştırma / büküm 409).

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useShallow } from 'zustand/react/shallow'
import { ALERT_PRIORITY, useAlertSlot } from '@/stores/alertQueueStore'
import { useMachineStateStore } from '@/stores/machineStateStore'
import { useCan } from '@/stores/sessionStore'
import { useT, tp } from '@/i18n'
import { Icon } from '@/components/Icon'
import styles from '@/components/ContaminationAlertOverlay/ContaminationAlertOverlay.module.css'

const SLOT_ID = 'rulers-invalid'

export default function RulersInvalidOverlay() {
  const t = useT()
  const navigate = useNavigate()
  const canGonye = useCan('encoder-reset')
  const r = useMachineStateStore(useShallow((s) => ({
    valid: s.state.rulerStatus?.valid ?? true,
    reason: s.state.rulerStatus?.invalidReason ?? null,
    message: s.state.rulerStatus?.invalidMessage ?? null,
    since: s.state.rulerStatus?.invalidSince ?? null,
  })))
  const [seenKey, setSeenKey] = useState<string | null>(null)
  const key = !r.valid && r.reason && r.reason !== 'APP_START' ? `${r.reason}|${r.since ?? ''}` : null
  const visible = useAlertSlot(SLOT_ID, ALERT_PRIORITY.rulers, key != null && key !== seenKey)

  if (!visible || key == null) return null

  return (
    <div className={styles.overlay} role="alertdialog" aria-modal="true" aria-labelledby="rulers-title">
      <div className={styles.card}>
        <div className={styles.icon}><Icon name="warning" size="xxl" /></div>
        <div id="rulers-title" className={styles.title}>{t('CETVELLER GEÇERSİZ')}</div>
        <ul className={styles.list}>
          <li className={styles.row}>
            <span>{tp(r.message ?? '')}</span>
          </li>
        </ul>
        <div className={styles.subtitle}>
          {t('Topların konumu bilinmiyor — konum hareketleri, stage, sıkıştırma ve büküm kilitli. Parça sıkılıysa önce TAHLİYE yapın (üst top geri çekilir), sonra GÜVENLİ GÖNYE ALIN. Elle (jog) hareket serbesttir; dikkatli kullanın.')}
        </div>
        <div className={styles.actions}>
          <button type="button" className={styles.closeBtn} onClick={() => setSeenKey(key)}>
            {t('ANLADIM, KAPAT')}
          </button>
          {canGonye && (
            <button
              type="button"
              className={styles.serviceBtn}
              onClick={() => {
                setSeenKey(key)
                navigate('/settings/encoder-reset')
              }}
            >
              {t('GÖNYE EKRANI')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
