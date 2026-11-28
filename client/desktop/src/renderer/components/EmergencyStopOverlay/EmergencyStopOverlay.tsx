// 2026-11-28 (kullanıcı) — ACİL STOP EKRANI. Fiziksel acil stop basılıyken (MachineState.safety.emergencyStopOK = false)
// tüm ekranı kaplayan pencere açılır; acil stop bırakılana kadar ekranda başka işlem yapılamaz (dokunma + fiziksel klavye
// engellenir). Pencerede sadece ALARMI SESSİZE AL var. Acil stop bırakılınca kendiliğinden kapanır; altta açık olan ekran
// (ör. büküm kesildiyse ALARM sayfası) kaldığı gibi görünür.
// Ayar MachineSettings.emergencyStopLockScreenEnabled (vars. açık; kapalı = eski davranış, sadece alt şerit uyarısı).
// Veri yokken / bayatken (backend / PLC bağlantısı yok) AÇILMAZ — o durumu bağlantı şeridi gösterir.

import { useEffect, useState } from 'react'
import AlarmMuteButton from '@/components/AlarmMuteButton/AlarmMuteButton'
import { Icon } from '@/components/Icon'
import { useT } from '@/i18n'
import { useConnectionStore } from '@/stores/connectionStore'
import { useMachineStateStore } from '@/stores/machineStateStore'
import styles from './EmergencyStopOverlay.module.css'

const FRESH_MS = 3_000
const SETTINGS_REFRESH_MS = 30_000

export default function EmergencyStopOverlay() {
  const t = useT()
  const pressed = useMachineStateStore((s) => s.hasReceivedFirstUpdate && s.state.safety.emergencyStopOK === false)
  const fresh = useConnectionStore((s) => s.staleMs < FRESH_MS)
  const [enabled, setEnabled] = useState(true)

  // Ayar — okunamazsa varsayılan AÇIK
  useEffect(() => {
    let alive = true
    const load = async () => {
      try {
        const m = (await window.corventa.settings.getMachine()) as Record<string, unknown>
        if (alive && typeof m?.emergencyStopLockScreenEnabled === 'boolean') setEnabled(m.emergencyStopLockScreenEnabled)
      } catch {
        /* backend yok — varsayılan */
      }
    }
    void load()
    const timer = setInterval(() => void load(), SETTINGS_REFRESH_MS)
    return () => {
      alive = false
      clearInterval(timer)
    }
  }, [])

  const active = enabled && pressed && fresh

  // Açıkken fiziksel klavye de çalışmasın: odaktaki alan bırakılır, tuşlar yakalanıp yutulur
  useEffect(() => {
    if (!active) return
    const el = document.activeElement
    if (el instanceof HTMLElement) el.blur()
    const swallow = (e: KeyboardEvent) => {
      e.preventDefault()
      e.stopPropagation()
    }
    window.addEventListener('keydown', swallow, true)
    window.addEventListener('keyup', swallow, true)
    window.addEventListener('keypress', swallow, true)
    return () => {
      window.removeEventListener('keydown', swallow, true)
      window.removeEventListener('keyup', swallow, true)
      window.removeEventListener('keypress', swallow, true)
    }
  }, [active])

  if (!active) return null

  return (
    <div className={styles.overlay} role="alertdialog" aria-modal="true" aria-label={t('ACİL STOP BASILI')}>
      <div className={styles.card}>
        <Icon name="warning" size="lg" />
        <h1 className={styles.title}>{t('ACİL STOP BASILI')}</h1>
        <p className={styles.text}>{t('MAKİNE DURDURULDU. ACİL STOP BIRAKILANA KADAR İŞLEM YAPILAMAZ.')}</p>
        <p className={styles.hint}>{t('TEHLİKE ORTADAN KALKINCA ACİL STOP BUTONUNU ÇEVİREREK BIRAKIN.')}</p>
        <AlarmMuteButton variant="inline" />
      </div>
    </div>
  )
}
