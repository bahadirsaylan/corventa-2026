// Kalıp kodu sorgulama + lisans etkinleştirme durumu (BULUT_API_V2.md §2.4, §6).
// KALIP KODU ekranı (büküm akışı) ve Ayarlar > KALIP KODU SORGULA aynı mantığı kullanır.

import { useCallback, useRef, useState } from 'react'
import type { CloudResult, MoldLookupResult } from '@shared/types'
import { moldCodeFormatError, normalizeMoldCode } from '@/services/moldCode'

export type MoldLookupStatus = 'idle' | 'searching' | 'found' | 'notfound' | 'error'

/** Kalıbın bu makinede kullanılabilirliği */
export type MoldUsability = 'ok' | 'needs-license' | 'license-expired' | 'license-revoked' | 'inactive'

export function moldUsability(r: MoldLookupResult): MoldUsability {
  if (!r.mold.active) return 'inactive'
  if (!r.mold.requiresLicense) return 'ok'
  if (r.licensed) return 'ok'
  const a = r.activation
  if (a?.revoked) return 'license-revoked'
  if (a?.expiresAt && new Date(a.expiresAt).getTime() <= Date.now()) return 'license-expired'
  return 'needs-license'
}

/** DataApi hata metninden bulut kod önekini at ("LICENSE: Lisans süresi dolmuş" → "Lisans süresi dolmuş") */
export function cleanCloudError(error: string): string {
  return error.replace(/^(LICENSE|AUTH|CODE|INPUT|NOTFOUND):\s*/i, '')
}

/** Sonuç zarfı hatası → ekranda gösterilecek metin (Türkçe kaynak; bilinen durumlar t() anahtarı) */
function lookupErrorText(r: { status: number; error: string }): { notFound: boolean; text: string } {
  if (r.status === 404) return { notFound: true, text: 'KALIP KODU BULUNAMADI' }
  if (r.status === 0) return { notFound: false, text: 'DataApi yanıt vermiyor — bağlantıyı kontrol edin' }
  return { notFound: false, text: cleanCloudError(r.error) }
}

export function useMoldLookup(initialCode = '') {
  const [code, setCode] = useState(initialCode)
  const [status, setStatus] = useState<MoldLookupStatus>('idle')
  const [result, setResult] = useState<MoldLookupResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activating, setActivating] = useState(false)
  const [activationError, setActivationError] = useState<string | null>(null)
  const [activationOk, setActivationOk] = useState(false)
  // Geç gelen eski cevap yeni sorgunun sonucunu ezmesin
  const seq = useRef(0)

  const formatError = code ? moldCodeFormatError(code) : null

  const lookup = useCallback(async (raw?: string) => {
    const c = normalizeMoldCode(raw ?? code)
    if (!c || moldCodeFormatError(c)) return
    const my = ++seq.current
    setCode(c)
    setStatus('searching')
    setResult(null)
    setError(null)
    setActivationError(null)
    setActivationOk(false)
    let r: CloudResult<MoldLookupResult>
    try {
      r = await window.corventa.molds.get(c)
    } catch (e) {
      r = { ok: false, status: 0, error: e instanceof Error ? e.message : String(e) }
    }
    if (my !== seq.current) return
    if (r.ok) {
      setResult(r.data)
      setStatus('found')
    } else {
      const { notFound, text } = lookupErrorText(r)
      setError(text)
      setStatus(notFound ? 'notfound' : 'error')
    }
  }, [code])

  const activate = useCallback(async (licenseKey: string) => {
    if (!result) return
    setActivating(true)
    setActivationError(null)
    setActivationOk(false)
    try {
      const r = await window.corventa.molds.activate(result.mold.code, licenseKey)
      if (r.ok) {
        setResult(r.data)
        setActivationOk(true)
      } else {
        setActivationError(r.status === 0 ? 'DataApi yanıt vermiyor — bağlantıyı kontrol edin' : cleanCloudError(r.error))
      }
    } catch (e) {
      setActivationError(e instanceof Error ? e.message : String(e))
    } finally {
      setActivating(false)
    }
  }, [result])

  const edit = useCallback((next: string) => {
    seq.current++
    setCode(next)
    setStatus('idle')
    setResult(null)
    setError(null)
    setActivationError(null)
    setActivationOk(false)
  }, [])

  return {
    code,
    setCode: edit,
    formatError,
    status,
    result,
    error,
    lookup,
    activate,
    activating,
    activationError,
    activationOk,
  }
}

export type MoldLookupState = ReturnType<typeof useMoldLookup>
