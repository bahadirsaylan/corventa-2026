// 2026-11-19 (kullanıcı): API'den dönen hata cevapları (ör. "xarc hesaplanamadi") ekranda siyah kutuda kırmızı
// yazı olarak çıkınca operatör makinede kritik arıza oldu sanıyordu. Bu pencere aynı bilgiyi SAKİN gösterir:
// bilgi ikonu, anlaşılır açıklama, ne yapılacağı; ham backend metni en altta küçük gri "TEKNİK DETAY" olarak.
// Bilinen hesap / bağlantı hatalarında "makinede arıza yok" güvencesi verilir; bilinmeyen hatada iddia edilmez.

import { translateProgress, useLang, useT } from '@/i18n'
import { Icon } from '@/components/Icon'
import styles from './ApiNoticeModal.module.css'

interface Friendly {
  message: string
  hint?: string
  /** Bilinen, makine arızası olmayan hata → güvence satırı gösterilir */
  noFault: boolean
}

// Backend BendingCalculator / demo hesap hata metinleri (ASCII Türkçe dahil)
const CALC_ERROR = /xarc hesaplanamad|discriminant negatif|R2 de[gğ]eri negatif|piston pozisyonu negatif|bu parametrelerle b[uü]k[uü]m yap[iı]lamaz|hesaplama hatas|hesap yap[iı]lamad/i
const CONNECTION_ERROR = /ula[sş][iı]lamad|ECONNREFUSED|fetch failed|ETIMEDOUT|timeout|zaman a[sş][iı]m/i

/** Ham API hata metnini operatörün anlayacağı açıklamaya çevirir (çeviri anahtarı = Türkçe metin). */
export function friendlyApiError(raw: string): Friendly {
  if (CALC_ERROR.test(raw)) {
    return {
      message: 'GİRİLEN ÖLÇÜLERLE BÜKÜM HESABI YAPILAMADI',
      hint: 'PROFİL ÖLÇÜSÜNÜ (A), HEDEF ÇAPI VE MAKİNE AYARLARINDAKİ TOP ÇAPINI KONTROL EDİP TEKRAR DENEYİN.',
      noFault: true,
    }
  }
  if (CONNECTION_ERROR.test(raw)) {
    return {
      message: 'MAKİNE YAZILIMINA ŞU AN ULAŞILAMADI',
      hint: 'BİRKAÇ SANİYE BEKLEYİP TEKRAR DENEYİN. SÜRERSE PROGRAMI YENİDEN BAŞLATIN.',
      noFault: true,
    }
  }
  return { message: raw, noFault: false }
}

interface Props {
  /** Başlık (Türkçe anahtar), ör. 'BÜKÜM BAŞLATILAMADI' */
  title: string
  /** Backend'den / akıştan gelen ham hata metni */
  message: string
  onClose: () => void
}

export default function ApiNoticeModal({ title, message, onClose }: Props) {
  const t = useT()
  const lang = useLang()
  const f = friendlyApiError(message)
  const shownMessage = f.message === message ? t(translateProgress(message, lang)) : t(f.message)
  const showDetail = f.message !== message
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} role="alertdialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <span className={styles.headIcon}>
          <Icon name="info" size={48} />
        </span>
        <h2 className={styles.title}>{t(title)}</h2>
        <p className={styles.message}>{shownMessage}</p>
        {f.hint && <p className={styles.hint}>{t(f.hint)}</p>}
        {f.noFault && <p className={styles.reassure}>{t('MAKİNEDE ARIZA YOK — GÜVENLE TEKRAR DENEYEBİLİRSİNİZ.')}</p>}
        {showDetail && (
          <p className={styles.detail}>
            {t('TEKNİK DETAY')}: {message}
          </p>
        )}
        <button type="button" className={styles.okBtn} onClick={onClose}>
          {t('TAMAM')}
        </button>
      </div>
    </div>
  )
}
