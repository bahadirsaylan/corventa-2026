// Servis ağı ekranı (SEKIL-6) — dashboard'daki Corventa logosuna tıklanınca açılır.
// Sol panel: yetkili servisler · orta: harita + pinler · sağ panel: Corventa + servis talebi butonları.
// Veri: constants/serviceNetwork.ts (ileride buluttan gelecek).

import { useNavigate } from 'react-router-dom'
import CorventaLogo from '@/components/CorventaLogo/CorventaLogo'
import {
  MACHINE_LOCATION,
  SERVICE_POINTS,
  projectToScene,
} from '@/constants/serviceNetwork'
import mapImage from '@/assets/images/service-map-bursa.jpg'
import styles from './ServiceNetworkPage.module.css'

const SCENE_W = 1080
const SCENE_H = 750

function inScene(p: { x: number; y: number }) {
  return p.x >= 0 && p.x <= SCENE_W && p.y >= 0 && p.y <= SCENE_H
}

export default function ServiceNetworkPage() {
  const navigate = useNavigate()
  const machine = projectToScene(MACHINE_LOCATION.lat, MACHINE_LOCATION.lon)

  return (
    <div className={styles.page}>
      <img src={mapImage} alt="" className={styles.map} draggable={false} />

      {/* Pinler */}
      {SERVICE_POINTS.map((sp) => {
        const p = projectToScene(sp.lat, sp.lon)
        if (!inScene(p)) return null
        return (
          <span key={sp.name} className={styles.pin} style={{ left: p.x, top: p.y }} aria-hidden>
            <PinIcon color="var(--color-primary)" />
          </span>
        )
      })}
      {inScene(machine) && (
        <span className={`${styles.pin} ${styles.pinMachine}`} style={{ left: machine.x, top: machine.y }} aria-hidden>
          <MachinePinIcon />
        </span>
      )}

      {/* Sol panel — yetkili servisler */}
      <aside className={`${styles.panel} ${styles.panelLeft}`}>
        {SERVICE_POINTS.map((sp) => (
          <div key={sp.name} className={styles.provider}>
            <div className={styles.providerHead}>
              <span className={styles.providerIcon}>
                <PinIcon color="var(--color-primary)" />
              </span>
              <span className={styles.providerName}>{sp.name}</span>
            </div>
            <span className={styles.line}>{sp.city}</span>
            <span className={styles.line}>{sp.phone}</span>
            <span className={styles.line}>{sp.web}</span>
            <span className={styles.line}>{sp.email}</span>
          </div>
        ))}
      </aside>

      {/* Sağ panel — Corventa + servis talepleri */}
      <aside className={`${styles.panel} ${styles.panelRight}`}>
        <div className={styles.logo}>
          <CorventaLogo size="compact" />
        </div>
        <span className={styles.city}>{MACHINE_LOCATION.city}</span>
        <div className={styles.contact}>
          <span className={styles.line}>{MACHINE_LOCATION.phone}</span>
          <span className={styles.line}>{MACHINE_LOCATION.web}</span>
          <span className={styles.line}>{MACHINE_LOCATION.email}</span>
        </div>
        <div className={styles.actions}>
          <button type="button" className={styles.actionBtn} onClick={() => navigate('/service/requests/new')}>
            SERVİS TALEBİ OLUŞTUR
          </button>
          <button type="button" className={styles.actionBtn} onClick={() => navigate('/service/requests')}>
            SERVİS TALEBİ SORGULA
          </button>
        </div>
      </aside>

      {/* Ana ekrana dön */}
      <button type="button" className={styles.homeBtn} onClick={() => navigate('/dashboard')} aria-label="Ana ekran">
        <svg viewBox="0 0 100 90" fill="currentColor">
          <polygon points="50,4 4,44 14,44 50,13 86,44 96,44" />
          <polygon points="18,46 50,18 82,46 82,86 60,86 60,60 40,60 40,86 18,86" />
          <rect x="68" y="10" width="10" height="22" />
        </svg>
      </button>

      <span className={styles.attribution}>© OpenStreetMap katkıda bulunanlar</span>
    </div>
  )
}

function PinIcon({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 40 56" width="40" height="56">
      <ellipse cx="20" cy="51" rx="9" ry="3.5" fill="none" stroke={color} strokeWidth="3" />
      <path d="M20 50 C8 34 2 26 2 19 A18 18 0 0 1 38 19 C38 26 32 34 20 50 Z" fill={color} />
      <circle cx="20" cy="19" r="7.5" fill="#bfe0de" />
    </svg>
  )
}

function MachinePinIcon() {
  return (
    <svg viewBox="0 0 90 66" width="90" height="66">
      <polygon points="45,30 84,63 6,63" fill="none" stroke="#2f8fd6" strokeWidth="4" strokeLinejoin="round" />
      <path d="M45 52 C33 36 27 28 27 21 A18 18 0 0 1 63 21 C63 28 57 36 45 52 Z" fill="#2f8fd6" />
      <circle cx="45" cy="21" r="7.5" fill="#bfe0de" />
    </svg>
  )
}
