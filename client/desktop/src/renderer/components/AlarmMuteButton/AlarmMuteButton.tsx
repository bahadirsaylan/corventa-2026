// 2026-11-20 — ALARMI SESSİZE AL. Alarm (siren / ikaz) çalarken ekranın alt ortasında belirir: acil stop, encoder durması,
// sıkıştırma arızası, basınç düşüşü vb. uyarılarında operatör sireni susturur. Güvenlik girişleri (acil stop / termik / faz)
// normale dönünce backend susturmayı kaldırır — sonraki arıza yine çalar. Hareket / güvenlik durumuna etkisi YOK.
// variant="inline": ACİL STOP ekranında kart içinde aynı düğme.

import { useState } from 'react'
import { Icon } from '@/components/Icon'
import { useT } from '@/i18n'
import { useMachineStateStore } from '@/stores/machineStateStore'
import styles from './AlarmMuteButton.module.css'

export default function AlarmMuteButton({ variant = 'floating' }: { variant?: 'floating' | 'inline' }) {
  const t = useT()
  const alarm = useMachineStateStore((s) => s.state.alarmActive)
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  if (!alarm) return null

  async function mute() {
    if (busy) return
    setBusy(true)
    setFailed(false)
    try {
      await window.corventa.machine.muteAlarm()
    } catch {
      setFailed(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      type="button"
      className={variant === 'floating' ? styles.floating : styles.inline}
      disabled={busy}
      onClick={() => void mute()}
    >
      <Icon name="warning" size="lg" />
      <span>{failed ? t('SUSTURULAMADI — TEKRAR DENE') : t('ALARMI SESSİZE AL')}</span>
    </button>
  )
}
