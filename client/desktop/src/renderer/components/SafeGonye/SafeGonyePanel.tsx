// GÜVENLİ GÖNYE (2026-11-19) — gönye ekranında canlı top tablosu (beklenen ↔ gidilen ↔ sonuç) + onay pencereleri.
// Kaynak: MachineState.rulerStatus.safeGonye (SignalR 10 Hz) — çalışırken canlı, bitince son rapor.
// Sadece gösterim + iki onay penceresi; kararlar backend'de (ExecuteGonyeHandler / SafeGonyeRetract).

import { useState } from 'react'
import type { SafeGonyePistonReport, SafeGonyeReport } from '@shared/types'
import { Icon } from '@/components/Icon'
import { useT, tp } from '@/i18n'
import styles from './SafeGonyePanel.module.css'

const RESULT_LABEL: Record<string, string> = {
  PENDING: 'BEKLİYOR',
  MOVING: 'GERİ ÇEKİLİYOR',
  OK: 'MEKANİK SON',
  OVERTRAVEL_WARN: 'FAZLA GİTTİ (UYARI)',
  OVERTRAVEL: 'FAZLA GİTTİ',
  OBSTACLE: 'ENGEL',
  STROKE_EXCEEDED: 'CETVEL HATALI',
  UNCHECKED: 'KONTROLSÜZ',
  STOPPED: 'DURDURULDU',
}

const RESULT_KIND: Record<string, 'ok' | 'warn' | 'err' | 'run' | 'idle'> = {
  PENDING: 'idle', MOVING: 'run', OK: 'ok', OVERTRAVEL_WARN: 'warn', OVERTRAVEL: 'err', OBSTACLE: 'err',
  STROKE_EXCEEDED: 'err', UNCHECKED: 'warn', STOPPED: 'idle',
}

const MODE_LABEL: Record<string, string> = {
  NORMAL: 'BEKLENEN MESAFEYLE',
  CONFIRMED: 'OPERATÖR ONAYLI (BEKLENEN BİLİNMİYOR)',
  OVERRIDE: 'ENGEL UYARISI YOK SAYILDI',
}

const fmt = (v: number | null | undefined) => (v == null ? '—' : v.toFixed(1))

function Row({ p }: { p: SafeGonyePistonReport }) {
  const t = useT()
  const kind = RESULT_KIND[p.result] ?? 'idle'
  return (
    <tr className={styles.row} data-kind={kind}>
      <td className={styles.name}>{t(p.name)}</td>
      <td className={styles.num}>{fmt(p.expectedMm)}</td>
      <td className={styles.num}>{fmt(p.travelMm)}</td>
      <td className={styles.result}>
        {t(RESULT_LABEL[p.result] ?? p.result)}
        {p.reliefMm > 0.5 && <span className={styles.badge}>{t('{n} mm İLERİ', { n: p.reliefMm.toFixed(0) })}</span>}
        {p.directionReversed && <span className={styles.badgeWarn}>{t('SAYAÇ TERS')}</span>}
      </td>
    </tr>
  )
}

export function SafeGonyeTable({ report, running }: { report: SafeGonyeReport; running: boolean }) {
  const t = useT()
  const failed = !running && (report.state === 'FAILED' || report.state === 'CANCELLED')
  const otherWarnings = report.warnings.filter((w) => !w.includes('SAYAÇ YÖNÜ TERS'))
  return (
    <div className={styles.panel}>
      <div className={styles.metaRow}>
        <span>{t(MODE_LABEL[report.mode] ?? report.mode)}</span>
        <span>
          {t('HIZ %{s}', { s: report.speedPercent })} · {t('TOLERANS {t} mm', { t: report.toleranceMm })}
        </span>
      </div>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>{t('TOP')}</th>
            <th>{t('BEKLENEN mm')}</th>
            <th>{t('GİDİLEN mm')}</th>
            <th>{t('SONUÇ')}</th>
          </tr>
        </thead>
        <tbody>
          {report.pistons.map((p) => (
            <Row key={String(p.piston)} p={p} />
          ))}
        </tbody>
      </table>
      {running && <div className={styles.live}>{t('GÜVENLİ GÖNYE SÜRÜYOR — HER TOP BEKLENEN MESAFEYLE KARŞILAŞTIRILIYOR…')}</div>}
      {!running && report.message && (
        <div className={failed ? styles.msgErr : report.warnings.length > 0 ? styles.msgWarn : styles.msgOk}>{tp(report.message)}</div>
      )}
      {/* Sayaç yönü ters uyarıları satırdaki SAYAÇ TERS rozetinde — liste sadece diğerleri (en fazla 2, 750 px'e sığsın) */}
      {!running && !failed && otherWarnings.length > 0 && (
        <ul className={styles.warnList}>
          {otherWarnings.slice(0, 2).map((w) => (
            <li key={w}>{tp(w)}</li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** Beklenen bilinmiyorken — "TOPLARIN ARKASINDA ENGEL / ALET YOK — KONTROL ETTİM" kontrol listesi */
export function SafeGonyeConfirmModal({
  reason,
  userName,
  onCancel,
  onConfirm,
}: {
  reason: string | null
  userName: string | null
  onCancel: () => void
  onConfirm: () => void
}) {
  const t = useT()
  const [checked, setChecked] = useState(false)
  return (
    <div className={styles.overlay} role="alertdialog" aria-modal="true">
      <div className={styles.modal}>
        <div className={styles.modalIcon}><Icon name="warning" size={48} /></div>
        <div className={styles.modalTitle}>{t('BEKLENEN GERİ GİDİŞ BİLİNMİYOR')}</div>
        <div className={styles.modalText}>
          {t('Topların son konumu bilinmediği için engel kontrolü yapılamaz. Toplar mekanik sona kadar GÜVENLİ HIZDA geri çekilecek.')}
          {reason && <div className={styles.modalReason}>{tp(reason)}</div>}
        </div>
        <button type="button" className={styles.check} data-on={checked || undefined} onClick={() => setChecked((v) => !v)}>
          <span className={styles.checkBox}>{checked && <Icon name="check" size={28} />}</span>
          <span>{t('TOPLARIN ARKASINDA ENGEL / ALET YOK — KONTROL ETTİM')}</span>
        </button>
        <div className={styles.modalUser}>{t('ONAYLAYAN: {u}', { u: userName ?? '—' })} · {t('Bu onay kullanıcı adınızla kayda geçer.')}</div>
        <div className={styles.modalActions}>
          <button type="button" className={styles.cancelBtn} onClick={onCancel}>{t('VAZGEÇ')}</button>
          <button type="button" className={styles.goBtn} disabled={!checked} onClick={onConfirm}>{t('GÖNYE AL')}</button>
        </div>
      </div>
    </div>
  )
}
