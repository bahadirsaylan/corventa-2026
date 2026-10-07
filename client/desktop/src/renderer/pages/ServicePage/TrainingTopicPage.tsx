// SEKIL-44 detay — eğitim metni anlatımı.

import { useNavigate, useParams } from 'react-router-dom'

import { getTrainingTopic } from '@/constants/trainingTopics'

import ServicePageShell from './ServicePageShell'
import styles from './TrainingTopicPage.module.css'

export default function TrainingTopicPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const topic = getTrainingTopic(id ?? '')

  if (!topic) {
    return (
      <ServicePageShell title="EĞİTİM" onBack={() => navigate('/service/training')}>
        <div className={styles.notFound}>Eğitim konusu bulunamadı.</div>
      </ServicePageShell>
    )
  }

  return (
    <ServicePageShell
      title="EĞİTİM ANLATIMI"
      subtitle={topic.title}
      onBack={() => navigate('/service/training')}
    >
      <div className={styles.card}>
        <div className={styles.header}>
          <span className={styles.headerLabel}>KONU :</span>
          <span className={styles.headerValue}>{topic.title}</span>
        </div>
        <div className={styles.body}>
          {topic.bodySections.map((sec) => (
            <div key={sec.heading} className={styles.section}>
              <span className={styles.heading}>{sec.heading} :</span>
              <span className={styles.text}>{sec.text}</span>
            </div>
          ))}
        </div>

        <button
          className={styles.completeBtn}
          onClick={() => navigate(`/service/training/quiz/${topic.id}`)}
        >
          SINAVLARA GEÇ
        </button>
      </div>
    </ServicePageShell>
  )
}
