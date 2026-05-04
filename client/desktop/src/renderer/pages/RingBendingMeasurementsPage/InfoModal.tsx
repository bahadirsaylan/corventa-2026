import { useEffect } from 'react'
import styles from './InfoModal.module.css'

interface InfoModalProps {
  title: string
  description: string
  onClose: () => void
}

export default function InfoModal({ title, description, onClose }: InfoModalProps) {
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <span className={styles.modalTitle}>{title}</span>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
            ⊗
          </button>
        </div>
        <p className={styles.modalDescription}>{description}</p>
      </div>
    </div>
  )
}
