import { formatStep, type ManuelProgramStep } from '@shared/types'
import styles from './StepEditorRow.module.css'

interface Props {
  step: ManuelProgramStep
  selected: boolean
  onSelect: () => void
}

const dateFmt = new Intl.DateTimeFormat('tr-TR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
})

export default function StepEditorRow({ step, selected, onSelect }: Props) {
  return (
    <tr className={selected ? styles.selected : ''} onClick={onSelect}>
      <td className={styles.no}>S.{String(step.stepNo).padStart(4, '0')}</td>
      <td className={styles.cmd}>{formatStep(step)}</td>
      <td className={styles.modifier}>{step.modifiedBy ?? ''}</td>
      <td className={styles.date}>
        {step.modifiedAt ? dateFmt.format(new Date(step.modifiedAt)) : ''}
      </td>
    </tr>
  )
}
