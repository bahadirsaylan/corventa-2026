// Check list ortak tanımlar (2026-11-16).
// LOCAL_TEMPLATE: bulut şablonu yokken kullanılan yerleşik günlük check list. DataApi'ye templateId 'local-daily'
// ile kaydedilir (GEÇMİŞ için); DataApi bu sonuçları buluta GÖNDERMEZ (CloudSyncService). Madde id'leri kayıtlarla
// eşleşir — değiştirmeyin (yeni madde eklenebilir; değişiklik gerekirse version artırın).

import type { CloudChecklistTemplate } from '@shared/types'

export const LOCAL_TEMPLATE_ID = 'local-daily'

export const LOCAL_TEMPLATE: CloudChecklistTemplate = {
  id: LOCAL_TEMPLATE_ID,
  version: 1,
  name: 'GÜNLÜK CHECK LIST',
  items: [
    { id: 'estop', text: 'Acil stop butonları test edildi', category: 'Güvenlik' },
    { id: 'guards', text: 'Koruma kapakları kapalı ve sabit', category: 'Güvenlik' },
    { id: 'phase', text: 'Faz sırası lambası yeşil', category: 'Güvenlik' },

    { id: 'oilLevel', text: 'Hidrolik yağ seviyesi minimum üstünde', category: 'Hidrolik' },
    { id: 'oilTemp', text: 'Yağ sıcaklığı 50°C altında (ilk çalışmada)', category: 'Hidrolik' },
    { id: 'leak', text: 'Hidrolik kaçak görsel kontrol yapıldı', category: 'Hidrolik' },
    { id: 'pressure', text: 'S1 / S2 hat basınçları normal aralıkta', category: 'Hidrolik' },

    { id: 'airPressure', text: 'Pnömatik hat basıncı 6 bar civarında', category: 'Pnömatik' },
    { id: 'airFilter', text: 'Hava filtresi temiz, su tahliyesi yapıldı', category: 'Pnömatik' },

    { id: 'partSensor', text: 'Parça varlık sensörleri (sol/sağ) temiz', category: 'Sensör' },
    { id: 'radiusSensor', text: 'Yarıçap (Keyence GT2) sensör kafaları temiz', category: 'Sensör' },
    { id: 'encoder', text: 'Lineer cetvel okumaları kararlı', category: 'Sensör' },

    { id: 'fan', text: 'Soğutma fanı çalışıyor', category: 'Genel' },
    { id: 'noise', text: 'Anormal ses / titreşim yok', category: 'Genel' },
    { id: 'workArea', text: 'Çalışma alanı temiz, parçalar yerleştirildi', category: 'Genel' },
  ],
}

/** ISO → "16.11.2026 14:32" (yerel saat). Geçersizse boş. */
export function formatStamp(iso: string | null | undefined, locale: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString(locale, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
