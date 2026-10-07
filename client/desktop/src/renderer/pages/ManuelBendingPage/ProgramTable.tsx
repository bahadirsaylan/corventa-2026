// SEKIL-22: Program listesi tablosu

import type { ManuelProgram } from '@shared/types'
import styles from './ProgramTable.module.css'

interface Props {
  programs: ManuelProgram[]
  selected: string | null
  onSelect: (programNo: string) => void
}

const dateFmt = new Intl.DateTimeFormat('tr-TR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
})

function fmt(iso: string): string {
  try {
    return dateFmt.format(new Date(iso))
  } catch {
    return iso
  }
}

export default function ProgramTable({ programs, selected, onSelect }: Props) {
  return (
    <div className={styles.scroll}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>PROGRAM NO</th>
            <th>PROGRAM ADI</th>
            <th>KAYIT TARİHİ</th>
            <th>DEĞİŞTİRME TARİHİ</th>
          </tr>
        </thead>
        <tbody>
          {programs.map((p) => {
            const isSelected = selected === p.programNo
            return (
              <tr
                key={p.programNo}
                className={isSelected ? styles.selected : ''}
                onClick={() => onSelect(p.programNo)}
              >
                <td className={styles.colNo}>{p.programNo}</td>
                <td className={styles.colName}>{p.name}</td>
                <td className={styles.colDate}>{fmt(p.createdAt)}</td>
                <td className={styles.colDate}>{fmt(p.updatedAt)}</td>
              </tr>
            )
          })}
          {programs.length === 0 && (
            <tr>
              <td colSpan={4} className={styles.empty}>
                Henüz kayıtlı program yok. "YENİ KIVRIM" ile başla.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
