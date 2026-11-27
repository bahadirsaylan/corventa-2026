import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import UserGuideViewer from '@/components/UserGuideViewer/UserGuideViewer'
import { roleCan, type Permission } from '@/constants/permissions'
import { useSessionStore } from '@/stores/sessionStore'
import { useT } from '@/i18n'
import styles from './SettingsMenuGrid.module.css'
import { FEATURES } from '@shared/edition'

interface MenuItem {
  label: string
  permission: Permission
  /** Rota veya özel eylem ('guide' = PDF kılavuz) */
  to: string
  /** Sürüm bayrağı vb. — false ise hiç çizilmez */
  show?: boolean
}

// Sıra: önce eski sol sütun, sonra eski sağ sütun. Görünür öğeler iki sütuna eşit bölünür.
// 2026-11-19 (kullanıcı): YETKİSİ OLMAYAN ÖĞE HİÇ GÖRÜNMEZ (eskiden soluk + kilit). Rota koruması (RequireRole) aynen durur.
const ITEMS: MenuItem[] = [
  { label: 'GARANTİ SÜRESİ', permission: 'warranty', to: '/settings/warranty' },
  // STANDART SÜRÜM (2026-11-17): bulut / kalıp girişleri FEATURES kapalıysa gizli
  { label: 'BULUT BAĞLANTISI', permission: 'big-data', to: '/settings/big-data', show: FEATURES.cloud },
  { label: 'KULLANICI YÖNETİMİ', permission: 'user-management', to: '/settings/users' },
  { label: 'OPERATÖR AYARLARI', permission: 'operator-settings', to: '/settings/operator' },
  { label: 'KARŞILAMA MESAJI', permission: 'welcome-message', to: '/settings/welcome-message' },
  { label: 'CHECK LIST', permission: 'checklist', to: '/settings/checklist' },
  { label: 'PDF KULLANIM KİTABI', permission: 'pdf-guide', to: 'guide' },
  { label: 'BAKIM SÜRESİ', permission: 'maintenance', to: '/settings/maintenance' },
  // 2026-11-19: gönye (cetvel sıfırlama) sayfası şimdilik herkese açık — Admin Ayarları dışından da giriş
  { label: 'GÖNYE / CETVEL SIFIRLAMA', permission: 'encoder-reset', to: '/settings/encoder-reset' },
  { label: 'KALIP KODU SORGULA', permission: 'mold-query', to: '/settings/mold-code', show: FEATURES.moldLicense },
  { label: 'HATA RAPORLARI', permission: 'error-reports', to: '/settings/error-reports' },
  // 2026-11-19 — kapatılan uyarılar (kirlilik / bakım / güvenlik) — kim, ne zaman, kaçıncı kez
  { label: 'UYARI KAYITLARI', permission: 'alert-acks', to: '/settings/alert-acks' },
  { label: 'BÜKÜM GEÇMİŞİ', permission: 'bending-history', to: '/settings/bending-history' },
  { label: 'KULLANMA SÜRELERİ', permission: 'machine-hours', to: '/settings/machine-hours' },
  { label: 'KIVRIM ADETLERİ RAPORU', permission: 'bending-count', to: '/settings/bending-count' },
  { label: 'DİL SEÇİMİ', permission: 'language', to: '/settings/language' },
  { label: 'SERTİFİKA SORGULA', permission: 'certificate', to: '/settings/certificate' },
  { label: 'KALIP KÜTÜPHANESİ', permission: 'mold-library', to: '/settings/mold-library', show: FEATURES.moldLicense },
  // SATIŞ / TAKAS / HİBE → MÜŞTERİ DEĞİŞİKLİĞİ içinde "neden" adımı (madde 17)
  { label: 'MÜŞTERİ DEĞİŞİKLİĞİ', permission: 'customer-change', to: '/settings/customer-change' },
  { label: 'HIZLI MENÜ', permission: 'side-menu', to: '/settings/side-menu' },
  { label: 'ADMİN AYARLARI', permission: 'admin-settings', to: '/settings/admin' },
  // 2026-11-23 — sensör AKTİF / PASİF / DEAKTİF (şimdilik sadece arayüz, makineye etkisi yok)
  { label: 'SENSÖR DURUMLARI', permission: 'admin-settings', to: '/settings/sensors' },
  // 2026-11-19 — AI reçete eşleşmesi neye bakar / neyi yok sayar (sadece AI sürümü, ADMİN+)
  { label: 'AI ÖĞRENME KURALLARI', permission: 'ai-recipe-rules', to: '/settings/ai-recipe-rules', show: FEATURES.aiRecipe },
  // 2026-11-19 — tüm canlı makine değerleri + motor / fan / alarm (sadece SÜPERADMİN)
  { label: 'MAKİNE DEĞERLERİ', permission: 'machine-values', to: '/settings/machine-values' },
  // CETVEL SIFIRLAMA → Admin Ayarları > GÖNYE & STAGE sekmesine taşındı (sadece admin)
]

export default function SettingsMenuGrid() {
  const navigate = useNavigate()
  const tr = useT()
  const role = useSessionStore((s) => s.role)

  // PDF kılavuz uygulama içinde (kiosk'tan çıkmadan) tam ekran açılır
  const [showGuide, setShowGuide] = useState(false)

  const visible = ITEMS.filter((it) => it.show !== false && roleCan(role, it.permission))
  const half = Math.ceil(visible.length / 2)
  const columns = [visible.slice(0, half), visible.slice(half)]

  const open = (it: MenuItem) => (it.to === 'guide' ? setShowGuide(true) : navigate(it.to))

  return (
    <div className={styles.grid}>
      {showGuide && <UserGuideViewer onClose={() => setShowGuide(false)} />}
      {columns.map((col, i) => (
        <div key={i} className={styles.col}>
          {col.map((it) => (
            <button key={it.label} type="button" className={styles.settingsBtn} onClick={() => open(it)}>
              <span className={styles.btnLabel}>{tr(it.label)}</span>
            </button>
          ))}
        </div>
      ))}
    </div>
  )
}
