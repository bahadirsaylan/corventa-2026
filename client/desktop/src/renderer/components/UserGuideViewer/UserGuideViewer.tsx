// PDF kullanım kılavuzu — uygulama İÇİNDE tam ekran görüntüleyici (kiosk'tan çıkmadan).
// 2026-11-16 (test: "KULLANIM KİTABI SAYFA SAYFA OLMALI"): dokunmatik için SAYFA SAYFA gezinme —
// büyük ÖNCEKİ / SONRAKİ tuşları, "SAYFA 3 / 42" göstergesi (dokununca numpad ile sayfaya git),
// sayfa üzerinde ve alt şeritte sola / sağa kaydırma. Son açılan sayfa bu cihazda hatırlanır.
// Sayfa pdf.js (pdfjs-dist, sabit sürüm) ile tuvale TEK SAYFA, alana sığacak şekilde çizilir.
// Chromium'un yerleşik görüntüleyicisi (#page / view=FitH) denendi: ekran ölçeğine göre sayfayı
// kırpıyor ya da sayfaları alt alta küçük akıtıyordu — tutarlı tek sayfa gösterimi vermedi.

import { useEffect, useRef, useState, type TouchEvent } from 'react'
import { GlobalWorkerOptions, getDocument, type PDFDocumentProxy, type RenderTask } from 'pdfjs-dist'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { useT, tp } from '@/i18n'
import { IconLabel } from '@/components/Icon'
import NumpadModal from '@/components/NumpadModal/NumpadModal'
import styles from './UserGuideViewer.module.css'

GlobalWorkerOptions.workerSrc = pdfWorkerUrl

const LAST_PAGE_KEY = 'corventa.userGuidePage'

function readLastPage(): number {
  try {
    const n = Number(localStorage.getItem(LAST_PAGE_KEY))
    return Number.isInteger(n) && n >= 1 ? n : 1
  } catch {
    return 1
  }
}

function saveLastPage(n: number): void {
  try {
    localStorage.setItem(LAST_PAGE_KEY, String(n))
  } catch {
    /* depolama kapalı — bu oturumda geçerli */
  }
}

export default function UserGuideViewer({ onClose }: { onClose: () => void }) {
  const t = useT()
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState<number | null>(null)
  const [page, setPage] = useState(1)
  const [rendering, setRendering] = useState(false)
  const [jumpOpen, setJumpOpen] = useState(false)
  const swipeX = useRef<number | null>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // PDF'i main'den oku, pdf.js ile aç
  useEffect(() => {
    let alive = true
    let loaded: PDFDocumentProxy | null = null
    window.corventa.system
      .readUserGuide()
      .then(async (r) => {
        if (!r.ok || !r.data) throw new Error(r.error ?? t('PDF açılamadı'))
        // pdf.js veriyi worker'a devreder — kopya verilir
        const bytes = new Uint8Array(r.data as Uint8Array<ArrayBuffer>)
        const pdf = await getDocument({ data: bytes, isEvalSupported: false }).promise
        if (!alive) {
          void pdf.destroy()
          return
        }
        loaded = pdf
        setTotal(pdf.numPages)
        setPage(Math.min(readLastPage(), pdf.numPages))
        setDoc(pdf)
      })
      .catch((e) => {
        if (alive) setError(tp(e instanceof Error ? e.message : String(e)))
      })
    return () => {
      alive = false
      if (loaded) void loaded.destroy()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Seçili sayfayı alana SIĞACAK şekilde (en ve boy) tuvale çiz; keskinlik için cihaz piksel oranı
  useEffect(() => {
    if (!doc) return
    let cancelled = false
    let task: RenderTask | null = null
    setRendering(true)
    void (async () => {
      try {
        const p = await doc.getPage(page)
        const canvas = canvasRef.current
        const body = bodyRef.current
        if (cancelled || !canvas || !body) return
        const box = body.getBoundingClientRect()
        const base = p.getViewport({ scale: 1 })
        const fit = Math.max(0.1, Math.min((box.width - 24) / base.width, (box.height - 24) / base.height))
        const dpr = Math.max(1, window.devicePixelRatio || 1)
        const vp = p.getViewport({ scale: fit * dpr })
        canvas.width = Math.floor(vp.width)
        canvas.height = Math.floor(vp.height)
        canvas.style.width = `${Math.floor(vp.width / dpr)}px`
        canvas.style.height = `${Math.floor(vp.height / dpr)}px`
        const ctx = canvas.getContext('2d')
        if (!ctx) return
        task = p.render({ canvasContext: ctx, viewport: vp })
        await task.promise
      } catch (e) {
        // Sayfa değişince önceki çizim iptal edilir (RenderingCancelledException) — hata değil
        if (!cancelled && !(e instanceof Error && e.name === 'RenderingCancelledException')) {
          setError(tp(e instanceof Error ? e.message : String(e)))
        }
      } finally {
        if (!cancelled) setRendering(false)
      }
    })()
    return () => {
      cancelled = true
      task?.cancel()
    }
  }, [doc, page])

  function goTo(n: number) {
    const max = total ?? Number.MAX_SAFE_INTEGER
    const next = Math.min(max, Math.max(1, Math.round(n)))
    if (!Number.isFinite(next) || next === page) return
    setPage(next)
    saveLastPage(next)
  }

  const canPrev = page > 1
  const canNext = total == null || page < total

  function onTouchStart(e: TouchEvent) {
    swipeX.current = e.touches[0]?.clientX ?? null
  }
  function onTouchEnd(e: TouchEvent) {
    const x0 = swipeX.current
    swipeX.current = null
    const x1 = e.changedTouches[0]?.clientX
    if (x0 == null || x1 == null) return
    const dx = x1 - x0
    if (Math.abs(dx) < 80) return
    if (dx < 0 && canNext) goTo(page + 1)
    else if (dx > 0 && canPrev) goTo(page - 1)
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.header}>
        <span className={styles.title}>{t('PDF KULLANIM KİTABI')}</span>
        <button type="button" className={styles.closeBtn} onClick={onClose}>
          <IconLabel icon="close" trailing>{t('KAPAT')}</IconLabel>
        </button>
      </div>
      <div ref={bodyRef} className={styles.body} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        {error ? (
          <p className={styles.message}>
            {t('PDF açılamadı')}: {error}
          </p>
        ) : doc ? (
          <canvas
            ref={canvasRef}
            className={styles.canvas}
            data-busy={rendering || undefined}
            aria-label={t('PDF KULLANIM KİTABI')}
          />
        ) : (
          <p className={styles.message}>{t('Yükleniyor…')}</p>
        )}
      </div>
      {doc && !error && (
        <div className={styles.nav} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
          <button type="button" className={styles.navBtn} disabled={!canPrev} onClick={() => goTo(page - 1)}>
            <IconLabel icon="back">{t('ÖNCEKİ')}</IconLabel>
          </button>
          <button type="button" className={styles.pageBtn} onClick={() => setJumpOpen(true)}>
            {total != null
              ? t('SAYFA {p} / {n}', { p: page, n: total })
              : t('SAYFA {n}', { n: page })}
          </button>
          <button type="button" className={styles.navBtn} disabled={!canNext} onClick={() => goTo(page + 1)}>
            <IconLabel icon="next" trailing>{t('SONRAKİ')}</IconLabel>
          </button>
        </div>
      )}
      {jumpOpen && (
        <NumpadModal
          fieldLabel={total != null ? t('SAYFA (1 – {total})', { total }) : t('SAYFA')}
          initialValue=""
          digitsOnly
          maxLength={4}
          onConfirm={(v) => {
            const n = Number(v)
            if (v.trim() !== '' && Number.isFinite(n) && n >= 1) goTo(n)
          }}
          onClose={() => setJumpOpen(false)}
        />
      )}
    </div>
  )
}
