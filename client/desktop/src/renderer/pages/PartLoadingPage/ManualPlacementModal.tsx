// ELLE KONUMLANDIRMA (sensörsüz) modalı — parça varlık sensörü arızalıyken açılır.
// Operatör parça ucunu seçtiği tarafta merkezden ZeroResetDistanceMm uzağa (sensör hizasına) koyar,
// onay kutusunu işaretler ve ONAYLA'ya basar; ardından sayfadaki KIVRIMI BAŞLAT ile büküm başlar. Bu yolda pipeline parça sensörünü BEKLEMEZ ve
// Zero adımında "sensörden uzaklaş / yavaş yaklaş / sensör görünce dur" aramasını atlar — parça doğrudan
// sıfır (başlangıç) pozisyonuna gider. Taraf = job'un ActiveSensorSide'ı (Left/Right); backend start'ta
// manualPlacementSide ile job tarafının aynı olmasını şart koşar (farklıysa 400).

import { useState } from 'react'
import { useT } from '@/i18n'
import styles from './ManualPlacementModal.module.css'

export type PlacementSide = 'Left' | 'Right'

/**
 * Taraf seçimi KAPALI — sensörlü akış job'u hep 'Left' ile yaratır; Right-side yolu (dönüş yönü / aktif
 * piston / ölçüm tarafı) sahada ve demoda hiç doğrulanmadı. Sensör arızasında devreye giren yol sensörlü
 * akışla birebir aynı tarafı kullansın. Right-side akış makinede doğrulanınca true yapılabilir.
 */
const SIDE_SELECTION_ENABLED = false

interface Props {
  /** MachineSettings.ZeroResetDistanceMm — okunamadıysa null (onay kapalı) */
  distanceMm: number | null
  /** (2026-11-23) Parça boyu (mm) — çizim ölçekli; yoksa sadece mesafe ölçeklenir */
  partLengthMm?: number | null
  /** (2026-11-23) MachineSettings.LeftPartSensorOnMachineRight — "SOL" sensör makinede önden bakınca SAĞDA mı */
  leftSensorOnMachineRight?: boolean
  initialSide?: PlacementSide
  onCancel: () => void
  onConfirm: (side: PlacementSide) => void
}

export default function ManualPlacementModal({ distanceMm, partLengthMm = null, leftSensorOnMachineRight = true, initialSide = 'Left', onCancel, onConfirm }: Props) {
  const t = useT()
  const [side, setSide] = useState<PlacementSide>(SIDE_SELECTION_ENABLED ? initialSide : 'Left')
  const [placed, setPlaced] = useState(false)

  const mmText =
    distanceMm == null ? '—' : Number.isInteger(distanceMm) ? String(distanceMm) : distanceMm.toFixed(1)
  const canConfirm = placed && distanceMm != null

  return (
    <div className={styles.overlay}>
      <div className={styles.modal} role="dialog" aria-modal="true">
        <div className={styles.header}>
          <WarningGlyph />
          <span>{t('SENSÖR ÇALIŞMIYOR — ELLE KONUMLANDIR')}</span>
        </div>

        <div className={styles.body}>
          {/* Taraf seçimi — job bu tarafla kaydedilir, dönüş yönü / aktif piston / ölçüm tarafı buna göre */}
          {SIDE_SELECTION_ENABLED && (
            <>
            <div className={styles.sideLabel}>{t('PARÇA HANGİ TARAFTAN YÜKLENDİ?')}</div>
            <div className={styles.sideRow}>
              <button
                type="button"
                className={styles.sideBtn}
                data-on={side === 'Left' || undefined}
                onClick={() => setSide('Left')}
              >
                <ArrowGlyph dir="left" />
                {t('SOL')}
              </button>
              <button
                type="button"
                className={styles.sideBtn}
                data-on={side === 'Right' || undefined}
                onClick={() => setSide('Right')}
              >
                {t('SAĞ')}
                <ArrowGlyph dir="right" />
              </button>
            </div>
            </>
          )}

          <PlacementDiagram
            screenRight={(side === 'Left') === leftSensorOnMachineRight}
            distanceMm={distanceMm}
            partLengthMm={partLengthMm}
            mmText={mmText}
          />

          <ol className={styles.steps}>
            <li>{t('PARÇAYI TOPLARIN ARASINA YERLEŞTİRİN.')}</li>
            <li>
              {t('PARÇA UCUNU SEÇİLEN TARAFTA MERKEZDEN {mm} MM UZAĞA (SENSÖR HİZASINA) GETİRİN.', { mm: mmText })}
            </li>
            <li>{t('ONAYDAN SONRA PARÇAYI ELLE OYNATMAYIN — MAKİNA SENSÖR ARAMADAN DOĞRUDAN SIFIRA GİDER.')}</li>
          </ol>

          {distanceMm == null && (
            <div className={styles.error}>{t('SENSÖR MESAFESİ AYARI OKUNAMADI — ELLE KONUMLANDIRMA YAPILAMAZ')}</div>
          )}

          <label className={styles.check} data-on={placed || undefined}>
            <input type="checkbox" checked={placed} onChange={(e) => setPlaced(e.target.checked)} />
            <span className={styles.checkBox} aria-hidden>
              {placed && <CheckGlyph />}
            </span>
            <span>{t('PARÇAYI ÖLÇÜYE GÖRE YERLEŞTİRDİM')}</span>
          </label>
        </div>

        <div className={styles.actions}>
          <button type="button" className={`${styles.btn} ${styles.cancel}`} onClick={onCancel}>
            {t('VAZGEÇ')}
          </button>
          <button
            type="button"
            className={`${styles.btn} ${styles.confirm}`}
            disabled={!canConfirm}
            onClick={() => canConfirm && onConfirm(side)}
          >
            {t('ONAYLA')}
          </button>
        </div>
      </div>
    </div>
  )
}

// Üstten görünüş (makineye ÖNDEN bakış) — 2026-11-23: sensör FİZİKSEL yerinde (ayar LeftPartSensorOnMachineRight) ve ÖLÇEKLİ:
// merkez ↔ sensör = ZeroResetDistanceMm, parça boyu = iş parça boyu (biliniyorsa). Parça ucu sensör hizasında, gövdesi
// toplardan geçip karşı tarafa uzanır. Ölçü çizgisi merkez ↔ parça ucu.
function PlacementDiagram({ screenRight, distanceMm, partLengthMm, mmText }: {
  screenRight: boolean
  distanceMm: number | null
  partLengthMm: number | null
  mmText: string
}) {
  const t = useT()
  const W = 640
  const cx = W / 2
  const sgn = screenRight ? 1 : -1
  const d = distanceMm != null && distanceMm > 0 ? distanceMm : 800
  const L = partLengthMm != null && partLengthMm > 0 ? partLengthMm : null
  // ölçek: merkezden iki yana en uzak nokta (sensör tarafı d, karşı taraf L − d) çizime sığsın
  const reach = Math.max(d, L != null ? L - d : d * 1.3, 1)
  const k = (W / 2 - 34) / reach
  const sensorX = cx + sgn * d * k
  const partOtherX = L != null ? cx + sgn * (d - L) * k : (screenRight ? 20 : W - 20)
  const partX = Math.min(sensorX, partOtherX)
  const partW = Math.max(4, Math.abs(partOtherX - sensorX))
  const dimY = 150
  const lenY = 168
  const lenText = L != null ? (Number.isInteger(L) ? String(L) : L.toFixed(0)) : null
  return (
    <svg viewBox={`0 0 ${W} ${L != null ? 190 : 180}`} className={styles.diagram} role="img" aria-label={t('YERLEŞTİRME ŞEMASI')}>
      {/* Parça */}
      <rect x={partX} y={74} width={partW} height={22} fill="#9ca3af" stroke="#374151" strokeWidth={2} />
      {/* Toplar (merkez) */}
      <circle cx={cx} cy={46} r={26} fill="#e5e7eb" stroke="#374151" strokeWidth={3} />
      <circle cx={cx} cy={124} r={26} fill="#e5e7eb" stroke="#374151" strokeWidth={3} />
      <line x1={cx} y1={8} x2={cx} y2={dimY + 8} stroke="#374151" strokeWidth={2} strokeDasharray="6 4" />
      <text x={cx} y={14} textAnchor="middle" className={styles.svgLabel} dx={screenRight ? -44 : 44}>
        {t('MERKEZ')}
      </text>
      {/* Sensör (fiziksel yerinde) */}
      <rect x={sensorX - 12} y={36} width={24} height={20} fill="#f59e0b" stroke="#92400e" strokeWidth={2} />
      <line x1={sensorX} y1={56} x2={sensorX} y2={dimY + 8} stroke="#92400e" strokeWidth={2} />
      <text x={sensorX} y={28} textAnchor="middle" className={styles.svgLabel}>
        {t('SENSÖR')}
      </text>
      {/* Ölçü çizgisi merkez ↔ parça ucu (ölçekli) */}
      <line x1={Math.min(cx, sensorX)} y1={dimY} x2={Math.max(cx, sensorX)} y2={dimY} stroke="#c93235" strokeWidth={3} />
      <path
        d={`M${sensorX} ${dimY} l${-sgn * 12} -7 v14 z M${cx} ${dimY} l${sgn * 12} -7 v14 z`}
        fill="#c93235"
      />
      <text x={(cx + sensorX) / 2} y={dimY - 8} textAnchor="middle" className={styles.svgDim}>
        {mmText} mm
      </text>
      {/* Parça boyu (biliniyorsa) */}
      {lenText != null && (
        <>
          <line x1={partX} y1={lenY} x2={partX + partW} y2={lenY} stroke="#374151" strokeWidth={1.5} />
          <line x1={partX} y1={lenY - 6} x2={partX} y2={lenY + 6} stroke="#374151" strokeWidth={1.5} />
          <line x1={partX + partW} y1={lenY - 6} x2={partX + partW} y2={lenY + 6} stroke="#374151" strokeWidth={1.5} />
          <text x={partX + partW / 2} y={lenY + 18} textAnchor="middle" className={styles.svgLabel}>
            {t('PARÇA {mm} mm', { mm: lenText })}
          </text>
        </>
      )}
    </svg>
  )
}

function WarningGlyph() {
  return (
    <svg viewBox="0 0 24 24" className={styles.headerIcon} aria-hidden>
      <path d="M12 3 2 21h20L12 3z" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M12 10v5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="12" cy="18" r="1.3" fill="currentColor" />
    </svg>
  )
}

function ArrowGlyph({ dir }: { dir: 'left' | 'right' }) {
  return (
    <svg viewBox="0 0 24 24" className={styles.sideIcon} aria-hidden>
      <path
        d={dir === 'left' ? 'M20 12H5m6-7-7 7 7 7' : 'M4 12h15m-6-7 7 7-7 7'}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function CheckGlyph() {
  return (
    <svg viewBox="0 0 24 24" className={styles.checkIcon} aria-hidden>
      <path d="m5 12 5 5 9-10" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
