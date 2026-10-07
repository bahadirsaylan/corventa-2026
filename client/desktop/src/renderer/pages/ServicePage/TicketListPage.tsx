// SEKIL 32-43 — Soru / Öneri / Şikayet üç tipi için tek paylaşılan sayfa.
// Tipe göre değişen: başlık, açıklama metni, badge harfi, butonlar, action etiketleri.
//
// State akışı (tek sayfada, modal yok):
//   1) listele                → satıra tıkla → state 'detail'
//   2) yeni oluştur butonu    → state 'compose'
//   3) SSS satırına tıkla     → ekleme expand (sadece o satır açılır)
//   4) detail'de aksiyon basıldıktan sonra → state 'list' + refresh

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import {
  ServiceTicketStatus,
  type ServiceTicket,
} from '@shared/types'

import { useFaqEntries, useTickets, type TicketTypeStr } from '@/hooks/useService'

import CategoryBadge from './CategoryBadge'
import ServicePageShell from './ServicePageShell'
import TicketCompose from './TicketCompose'
import TicketDetail from './TicketDetail'
import styles from './TicketListPage.module.css'

interface Props {
  type: TicketTypeStr
}

type LocalView = 'list' | 'detail' | 'compose'

export default function TicketListPage({ type }: Props) {
  const navigate = useNavigate()
  const { tickets, loading, refresh } = useTickets(type)
  const faq = useFaqEntries(type)

  const [view, setView] = useState<LocalView>('list')
  const [selectedTicket, setSelectedTicket] = useState<ServiceTicket | null>(null)
  const [expandedFaqCode, setExpandedFaqCode] = useState<string | null>(null)

  const cfg = TYPE_CONFIG[type]

  function openDetail(t: ServiceTicket) {
    setSelectedTicket(t)
    setView('detail')
  }

  async function closeDetail() {
    setSelectedTicket(null)
    setView('list')
    await refresh()
  }

  async function closeCompose(created: boolean) {
    setView('list')
    if (created) await refresh()
  }

  return (
    <ServicePageShell title={cfg.pageTitle} onBack={() => navigate('/service')}>
      {/* Açıklama paneli — type'a göre */}
      <div className={styles.introRow}>
        <div className={styles.badgeWrap}>
          <CategoryBadge label={cfg.smallLabel} letter={cfg.letter} compact />
        </div>
        <div className={styles.intro}>{cfg.intro}</div>
      </div>

      {/* Liste veya detail veya compose */}
      {view === 'list' && (
        <>
          <div className={styles.ticketList}>
            {loading && <div className={styles.empty}>Yükleniyor...</div>}
            {!loading && tickets.length === 0 && (
              <div className={styles.empty}>Henüz {cfg.singular.toLowerCase()} kaydı yok</div>
            )}
            {tickets.map((t) => (
              <button
                key={t.id}
                className={[styles.ticketRow, isHighlighted(t) ? styles.ticketRowHi : '']
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => openDetail(t)}
              >
                <span className={styles.ticketCode}>{t.code}</span>
                <span className={styles.ticketSep}>-</span>
                <span className={styles.ticketTitle}>{t.title.toUpperCase()}</span>
                <span className={styles.ticketStatus}>{statusLabel(t.status)}</span>
              </button>
            ))}
          </div>

          <div className={styles.actionRow}>
            <button
              className={styles.primaryBtn}
              onClick={() => setView('compose')}
            >
              {cfg.createBtn}
            </button>
            <button
              className={styles.primaryBtn}
              onClick={() => {
                // İlk cevaplanmış ticket'a git
                const answered = tickets.find((t) => t.response)
                if (answered) openDetail(answered)
              }}
              disabled={!tickets.some((t) => t.response)}
            >
              CEVABI GÖR
            </button>
          </div>

          {/* SSS / En Çok Alınan / Sık Karşılaşılan */}
          <div className={styles.faqHeader}>{cfg.faqHeader}</div>
          <div className={styles.faqList}>
            {faq.map((f) => (
              <div key={f.code} className={styles.faqItem}>
                <button
                  className={styles.faqRow}
                  onClick={() =>
                    setExpandedFaqCode((prev) => (prev === f.code ? null : f.code))
                  }
                >
                  <span className={styles.faqCode}>{f.code}</span>
                  <span className={styles.faqQuestion}>{f.question}</span>
                </button>
                {expandedFaqCode === f.code && (
                  <div className={styles.faqAnswer}>{f.answer}</div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {view === 'detail' && selectedTicket && (
        <TicketDetail
          ticket={selectedTicket}
          type={type}
          onClose={closeDetail}
        />
      )}

      {view === 'compose' && (
        <TicketCompose type={type} onClose={closeCompose} />
      )}
    </ServicePageShell>
  )
}

// ──────────────────────────────────────────────────────────
// Type-spesifik metinler
// ──────────────────────────────────────────────────────────

interface TypeConfig {
  pageTitle: string
  smallLabel: string
  letter: string
  intro: string
  createBtn: string
  faqHeader: string
  singular: string
}

const TYPE_CONFIG: Record<TicketTypeStr, TypeConfig> = {
  question: {
    pageTitle: 'SORU MERKEZİ',
    smallLabel: 'SORU',
    letter: 'S',
    intro:
      'TEKNOLOJİNİN BİZE SUNDUĞU EN ÖNEMLİ DEĞER İLETİŞİMDİR. TAKILDIĞINIZ HER KONUDA BİLGİ VE TECRÜBEMİZLE SİZ DEĞERLİ MÜŞTERİLERİMİZE YARDIMCI OLMAYA ÇALIŞACAĞIZ.',
    createBtn: 'YENİ SORU OLUŞTUR',
    faqHeader: 'SIK SORULAN SORULAR',
    singular: 'soru',
  },
  suggestion: {
    pageTitle: 'ÖNERİ MERKEZİ',
    smallLabel: 'ÖNERİ',
    letter: 'Ö',
    intro:
      'SİZLERİN DEĞERLİ FİKİRLERİ BİZİM İÇİN ÇOK KIYMETLİDİR. GELECEĞİ FİKİRLER ŞEKİLLENDİRİR. ŞİRKET POLİTİKAMIZ GEREĞİ HER ÖNERİ DEĞERLENDİRİLEREK TARAFINIZA BİLGİLENDİRME YAPILACAKTIR.',
    createBtn: 'YENİ ÖNERİ OLUŞTUR',
    faqHeader: 'EN FAZLA ALINAN ÖNERİLER',
    singular: 'öneri',
  },
  complaint: {
    pageTitle: 'ŞİKAYET MERKEZİ',
    smallLabel: 'ŞİKAYET',
    letter: 'Ş',
    intro:
      'HER NE KADAR SORUNLAR MÜKEMMELLİYETİN BİR PARÇASI OLSA DA, OLUŞTURDUĞUMUZ MADURİYETTEN DOLAYI ÖZÜR DİLERİZ. GÖSTERMİŞ OLDUĞUNUZ ANLAYIŞ İÇİN TEŞEKKÜR EDERİZ.',
    createBtn: 'YENİ ŞİKAYET OLUŞTUR',
    faqHeader: 'SIK KARŞILAŞILAN ŞİKAYETLER',
    singular: 'şikayet',
  },
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
      return 'KAPATILDI'
    case ServiceTicketStatus.Cancelled:
      return 'İPTAL'
  }
}

function isHighlighted(t: ServiceTicket): boolean {
  return t.status === ServiceTicketStatus.Answered
}
