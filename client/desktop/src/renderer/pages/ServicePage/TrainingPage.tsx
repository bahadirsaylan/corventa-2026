// SEKIL-44 — Eğitim ana sayfası. Konu kartı + katılımcı bilgileri (stub).
// İlerideki entity (EducationProgress) için tam UI hazır; state şimdilik local.

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { TRAINING_TOPICS } from '@/constants/trainingTopics'

import CategoryBadge from './CategoryBadge'
import ServicePageShell from './ServicePageShell'
import styles from './TrainingPage.module.css'

export default function TrainingPage() {
  const navigate = useNavigate()
  const [participant, setParticipant] = useState({ name: '', title: '', company: '' })
  const topic = TRAINING_TOPICS[0]

  return (
    <ServicePageShell title="EĞİTİM MERKEZİ" onBack={() => navigate('/service')}>
      <div className={styles.root}>
        {/* Katılımcı bilgileri */}
        <div className={styles.participantBox}>
          <div className={styles.badgeWrap}>
            <CategoryBadge label="EĞİTİM" letter="E" compact />
          </div>
          <div className={styles.participantFields}>
            <Field
              label="KATILIMCI ADI SOYADI"
              placeholder="LÜTFEN ADINIZI VE SOYADINIZI GİRİNİZ..."
              value={participant.name}
              onChange={(v) => setParticipant((p) => ({ ...p, name: v }))}
            />
            <Field
              label="KATILIMCI ÜNVANI"
              placeholder="LÜTFEN ÇALIŞTIĞINIZ POZİSYONU TANIMLAYINIZ..."
              value={participant.title}
              onChange={(v) => setParticipant((p) => ({ ...p, title: v }))}
            />
            <Field
              label="ŞİRKET ADI ÜNVANI"
              placeholder="LÜTFEN ŞİRKET ADINI TAM OLARAK GİRİNİZ..."
              value={participant.company}
              onChange={(v) => setParticipant((p) => ({ ...p, company: v }))}
            />
          </div>
        </div>

        {/* Konu kartı (SEKIL-44) */}
        <div className={styles.topicCard}>
          <div className={styles.topicHeader}>
            <span className={styles.topicHeaderLabel}>KONU :</span>
            <span className={styles.topicHeaderValue}>{topic.title}</span>
          </div>
          <div className={styles.topicBody}>
            {topic.bodySections.map((sec) => (
              <div key={sec.heading} className={styles.topicSection}>
                <span className={styles.topicHeading}>{sec.heading} :</span>
                <span className={styles.topicText}>{sec.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Aksiyon butonları (SEKIL-45) */}
        <div className={styles.actionsGrid}>
          <button
            className={styles.actionBigBtn}
            onClick={() =>
              navigate(`/service/training/topic/${topic.id}`)
            }
            disabled={!participant.name.trim()}
          >
            <span className={styles.playIcon}>▶</span>
            <span>YENİ EĞİTİM BAŞLAT</span>
          </button>

          <button
            className={styles.actionBigBtnTall}
            onClick={() => navigate(`/service/training/quiz/${topic.id}`)}
            disabled={!participant.name.trim()}
          >
            SINAVLARI BAŞLAT
          </button>

          <button
            className={styles.actionBigBtn}
            onClick={() => navigate(`/service/training/topic/${topic.id}`)}
          >
            <span className={styles.repeatIcon}>↻</span>
            <span>EĞİTİMİ TEKRARLA</span>
          </button>
        </div>
      </div>
    </ServicePageShell>
  )
}

function Field(props: {
  label: string
  placeholder: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className={styles.field}>
      <span className={styles.fieldLabel}>{props.label}</span>
      <span className={styles.fieldSep}>:</span>
      <input
        type="text"
        className={styles.fieldInput}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        placeholder={props.placeholder}
        maxLength={120}
      />
    </div>
  )
}
