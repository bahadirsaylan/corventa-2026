// YAĞ KİRLİLİK UYARISI (2026-11-19) — K1–K3 kirlilik sensörlerinden biri kararlı olarak KİRLİ (veya sensör / kablo
// arızalı) ise uyarı kuyruğundan (alertQueueStore) bir kez açılır. Kirli küme değişirse (ör. K3 de kirlendi) ya da
// temiz kalıp yeniden kirlenirse tekrar açılır; aynı küme oturumda tekrar açılmaz (alt şeritte kalıcı uyarı sürer).
// Basılan düğme UYARI KAYITLARI'na yazılır (kim, ne zaman, kaçıncı kez). Sadece uyarı — hareket engellemez.

import { useNavigate } from 'react-router-dom'
import { ALERT_PRIORITY, useAlertSlot } from '@/stores/alertQueueStore'
import { contaminationKey, markContaminationPrompted, useContaminationStore } from '@/stores/contaminationStore'
import { logAlertAck } from '@/services/alertAcks'
import type { AlertAckCreateBody } from '@shared/types/alert-ack'
import { useT } from '@/i18n'
import { Icon } from '@/components/Icon'
import styles from './ContaminationAlertOverlay.module.css'

const SLOT_ID = 'contamination'

/** Kayda yazılan sabit TÜRKÇE metin (ekran dili ne olursa olsun) */
export function contaminationAckMessage(list: readonly string[]): string {
  return `YAĞ KİRLİLİK UYARISI — ${list.join(', ')}: FİLTRE KİRLİ VEYA KİRLİLİK SENSÖRÜ / KABLOSU ARIZALI — ` +
    'servis / bakım ekibine haber verin; devam ederseniz pistonlar ve hidrolik sistem zarar görebilir.'
}

export default function ContaminationAlertOverlay() {
  const t = useT()
  const navigate = useNavigate()
  const dirty = useContaminationStore((s) => s.dirty)
  const promptedKey = useContaminationStore((s) => s.promptedKey)
  // 2026-11-27 (kullanıcı): yağ 35 °C (ayar) altındayken pencere yok — sadece alt şeritte uyarı
  const modalAllowed = useContaminationStore((s) => s.modalAllowed)
  const key = contaminationKey(dirty)
  const want = dirty.length > 0 && key !== promptedKey && modalAllowed
  const visible = useAlertSlot(SLOT_ID, ALERT_PRIORITY.contamination, want)

  if (!visible) return null

  const answer = (action: AlertAckCreateBody['action']) => {
    logAlertAck({
      slotId: SLOT_ID,
      alertKind: 'Contamination',
      alertKey: key,
      message: contaminationAckMessage(dirty),
      severity: 'error',
      action,
    })
    markContaminationPrompted(key)
  }

  return (
    <div className={styles.overlay} role="alertdialog" aria-modal="true" aria-labelledby="contamination-title">
      <div className={styles.card}>
        <div className={styles.icon}><Icon name="warning" size="xxl" /></div>
        <div id="contamination-title" className={styles.title}>{t('YAĞ KİRLİLİK UYARISI')}</div>

        <ul className={styles.list}>
          {dirty.map((k) => (
            <li key={k} className={styles.row}>
              <span>{t('KİRLİLİK SENSÖRÜ {k}', { k })}</span>
              <span className={styles.rowValue}>{t('KİRLİ / ARIZA')}</span>
            </li>
          ))}
        </ul>

        <div className={styles.subtitle}>
          {t('FİLTRE KİRLİ VEYA KİRLİLİK SENSÖRÜ / KABLOSU ARIZALI — servis / bakım ekibine haber verin; devam ederseniz pistonlar ve hidrolik sistem zarar görebilir.')}
        </div>
        <div className={styles.note}>
          {t('Bu uyarıya verdiğiniz cevap kullanıcı adınız ve saatiyle kayda geçer.')}
        </div>

        <div className={styles.actions}>
          <button type="button" className={styles.closeBtn} onClick={() => answer('DISMISSED')}>
            {t('ANLADIM, KAPAT')}
          </button>
          <button
            type="button"
            className={styles.serviceBtn}
            onClick={() => {
              answer('OPENED_SERVICE_REQUEST')
              navigate('/service/requests/new')
            }}
          >
            {t('SERVİS TALEBİ')}
          </button>
        </div>
      </div>
    </div>
  )
}
