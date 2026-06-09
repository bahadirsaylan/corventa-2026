// SEKIL-46/47 — Sınav: yes-no veya A/B/C/D. Soru sırasıyla ilerler.
// Stub: cevaplar local state'te. İleride EducationProgress entity → DataApi'ye gönderilir.

import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { getTrainingTopic, type QuizQuestion } from '@/constants/trainingTopics'

import ServicePageShell from './ServicePageShell'
import styles from './TrainingQuizPage.module.css'

export default function TrainingQuizPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const topic = getTrainingTopic(id ?? '')

  const [currentIdx, setCurrentIdx] = useState(0)
  const [answers, setAnswers] = useState<number[]>([])
  const [done, setDone] = useState(false)

  const currentQ: QuizQuestion | undefined = topic?.questions[currentIdx]

  const score = useMemo(() => {
    if (!topic) return 0
    let s = 0
    answers.forEach((ans, i) => {
      if (ans === topic.questions[i].correctIndex) s += 1
    })
    return s
  }, [answers, topic])

  if (!topic) {
    return (
      <ServicePageShell title="SINAV" onBack={() => navigate('/service/training')}>
        <div className={styles.empty}>Eğitim konusu bulunamadı.</div>
      </ServicePageShell>
    )
  }

  if (done || !currentQ) {
    const total = topic.questions.length
    const passed = score >= Math.ceil(total * 0.6)
    return (
      <ServicePageShell
        title="EĞİTİM TAMAMLANDI"
        onBack={() => navigate('/service/training')}
      >
        <div className={styles.resultRoot}>
          <div className={[styles.resultBadge, passed ? styles.resultPass : styles.resultFail]
            .filter(Boolean)
            .join(' ')}
          >
            {passed ? '✦ EĞİTİM TAMAMLANDI ✦' : 'TEKRAR DENEYİN'}
          </div>
          <div className={styles.resultScore}>
            <span className={styles.resultScoreNum}>{score}</span>
            <span className={styles.resultScoreOf}>/ {total}</span>
          </div>
          <div className={styles.resultActions}>
            <button
              className={styles.resultBtn}
              onClick={() => {
                setAnswers([])
                setCurrentIdx(0)
                setDone(false)
              }}
            >
              TEKRAR DENE
            </button>
            <button
              className={styles.resultBtn}
              onClick={() => navigate('/service/training')}
            >
              EĞİTİM MERKEZİNE DÖN
            </button>
          </div>
        </div>
      </ServicePageShell>
    )
  }

  function pickAnswer(idx: number) {
    const next = [...answers, idx]
    setAnswers(next)
    if (currentIdx + 1 >= topic!.questions.length) {
      setDone(true)
    } else {
      setCurrentIdx(currentIdx + 1)
    }
  }

  return (
    <ServicePageShell
      title="SINAV"
      subtitle={`SORU ${currentIdx + 1} / ${topic.questions.length}`}
      onBack={() => navigate('/service/training')}
    >
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <span className={styles.cardHeaderLabel}>KONU :</span>
          <span className={styles.cardHeaderValue}>{topic.title}</span>
        </div>
        <div className={styles.cardBody}>{currentQ.prompt}</div>
      </div>

      {currentQ.type === 'yes-no' ? (
        <div className={styles.yesNoRow}>
          {currentQ.options.map((opt, i) => (
            <button
              key={opt}
              className={styles.yesNoBtn}
              onClick={() => pickAnswer(i)}
            >
              {opt}
            </button>
          ))}
        </div>
      ) : (
        <div className={styles.multiGrid}>
          {currentQ.options.map((opt, i) => (
            <button
              key={opt}
              className={styles.multiBtn}
              onClick={() => pickAnswer(i)}
            >
              {String.fromCharCode(65 + i)} &nbsp;&nbsp; {opt}
            </button>
          ))}
        </div>
      )}
    </ServicePageShell>
  )
}
