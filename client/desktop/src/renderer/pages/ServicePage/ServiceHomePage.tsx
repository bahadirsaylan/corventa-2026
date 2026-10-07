// SEKIL-31 — Service modülü ana sayfası.
// 3 üst (SERVİS, KURULUM, EĞİTİM) + 3 alt (SORU, ÖNERİ, ŞİKAYET) daire buton.
// Altta son ticket önizleme (en yeni 3 ticket — type bağımsız).

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import {
  ServiceTicketStatus,
  type ServiceTicket,
} from '@shared/types'

import CategoryBadge from './CategoryBadge'
import ServicePageShell from './ServicePageShell'
import styles from './ServiceHomePage.module.css'

export default function ServiceHomePage() {
  const navigate = useNavigate()
  const [recent, setRecent] = useState<ServiceTicket[]>([])

  // En yeni 3 ticket'ı 3 tipten birleştir (Soru + Öneri + Şikayet)
  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [q, s, c] = await Promise.all([
          window.corventa.service.listTickets('question', 5),
          window.corventa.service.listTickets('suggestion', 5),
          window.corventa.service.listTickets('complaint', 5),
        ])
        if (cancelled) return
        const merged = [...q, ...s, ...c]
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 3)
        setRecent(merged)
      } catch (err) {
        console.warn('Recent tickets fetch failed', err)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <ServicePageShell title="SERVICE & DESTEK MERKEZİ" onBack={() => navigate('/dashboard')}>
      <div className={styles.root}>
        {/* ── Üst sıra: Servis / Kurulum / Eğitim ─── */}
        <div className={styles.section}>
          <div className={styles.grid}>
            <CategoryBadge
              label="SERVİCE"
              letter="S"
              onClick={() => navigate('/service/requests')}
            />
            <CategoryBadge
              label="KURULUM"
              letter="K"
              onClick={() => navigate('/service/installation')}
            />
            <CategoryBadge
              label="EĞİTİM"
              letter="E"
              onClick={() => navigate('/service/training')}
            />
          </div>
        </div>

        {/* ── Alt sıra: Soru / Öneri / Şikayet ───── */}
        <div className={`${styles.section} ${styles.sectionGray}`}>
          <div className={styles.grid}>
            <CategoryBadge
              label="SORU"
              letter="S"
              onClick={() => navigate('/service/questions')}
            />
            <CategoryBadge
              label="ÖNERİ"
              letter="Ö"
              onClick={() => navigate('/service/suggestions')}
            />
            <CategoryBadge
              label="ŞİKAYET"
              letter="Ş"
              onClick={() => navigate('/service/complaints')}
            />
          </div>

          {/* Son ticket önizleme */}
          <div className={styles.recentBox}>
            {recent.length === 0 && (
              <div className={styles.recentEmpty}>Henüz kayıtlı talep yok</div>
            )}
            {recent.map((t) => (
              <button
                key={t.id}
                className={styles.recentRow}
                onClick={() => navigate(`/service/${typeToRoute(t)}`)}
              >
                <span className={styles.recentCode}>{t.code}</span>
                <span className={styles.recentDate}>
                  {formatDate(t.createdAt)} {formatTime(t.createdAt)}
                </span>
                <span className={styles.recentStatus}>{statusLabel(t.status)}</span>
                <span className={styles.recentTitle}>{t.title.toUpperCase()}</span>
                <span className={styles.recentStars}>{stars(t)}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </ServicePageShell>
  )
}

// ──────────────────────────────────────────────────────────
// helpers

function typeToRoute(t: ServiceTicket): string {
  if (t.type === 0) return 'questions'
  if (t.type === 1) return 'suggestions'
  return 'complaints'
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('tr-TR')
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString('tr-TR')
}

function statusLabel(s: ServiceTicketStatus): string {
  switch (s) {
    case ServiceTicketStatus.Pending:
      return 'BEKLEMEDE'
    case ServiceTicketStatus.Answered:
      return 'CEVAPLANDI'
    case ServiceTicketStatus.InProgress:
      return 'DEVAM EDİYOR'
    case ServiceTicketStatus.Resolved:
      return 'ONAYLANDI KONU KAPATILDI'
    case ServiceTicketStatus.Cancelled:
      return 'İPTAL'
  }
}

function stars(t: ServiceTicket): string {
  // SEKIL-31'deki * * * * * gösterimi — burada konu uzunluğu/öncelik proxy'si
  // Şimdilik sabit; gelecekte rating-like alan eklenirse buradan beslenir
  if (t.status === ServiceTicketStatus.Resolved) return '✦✦✦✦✦'
  if (t.status === ServiceTicketStatus.Answered) return '✦✦✦✦'
  return '✦✦✦'
}
