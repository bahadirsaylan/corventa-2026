// 2026-11-20 (kullanıcı): STAGE, BÜKÜM DEĞERLERİ ONAYLANDIKTAN HEMEN SONRA alınır — parça konmadan önce.
// Eskiden KIVRIMI BAŞLAT'ta (parça topların üzerindeyken) yapılıyordu → parça düşebiliyordu.
// Ölçü ekranındaki ONAYLA'dan sonra bütün metotlar vals topu dizilimi ekranına gelir; ekran açılınca:
//   hedef stage (büküm akışıyla aynı kural, resolveTargetStage) → makine zaten o stage'de ve konumdaysa hiçbir şey,
//   değilse 5 sn geri sayım (StageMoveCountdown, VAZGEÇ) → stage geçişi. Bitene kadar ONAY kapalı.
// Vazgeçilirse / yapılamazsa / koşul yoksa (gönye, cetvel, motor) akış eskisi gibi büküm başlarken yapar.
// Parça sensörü BEKLENMEZ (kullanıcı: "koyarsa kendi bilir") — uyarı geri sayım penceresinde.

import { useCallback, useEffect, useState } from 'react'
import { currentProfileA, isAtStage, resolveTargetStage } from '@/services/bendingOrchestrator'
import { loadRollOverlap, rollOverlapMessage } from '@/services/machineGeometry'
import { awaitStageReturn, stageMoveAllowed, startStageMove } from '@/services/stageReturn'

// 'blocked' (2026-11-20): üst-alt top BİNDİRİR (profil A < top dış−iç farkı) — stage alınmaz, ONAY kapalı
export type EarlyStagePhase = 'checking' | 'countdown' | 'moving' | 'ready' | 'deferred' | 'blocked'

export function useEarlyStage() {
  const [phase, setPhase] = useState<EarlyStagePhase>('checking')
  const [targetStage, setTargetStage] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [blockMessage, setBlockMessage] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        let a = 0
        try { a = currentProfileA() } catch { a = 0 }
        const overlapMsg = rollOverlapMessage(await loadRollOverlap(), a)
        if (overlapMsg) {
          if (alive) {
            setBlockMessage(overlapMsg)
            setPhase('blocked')
          }
          return
        }
        await awaitStageReturn() // tahliye sonrası dönüş sürüyorsa önce o bitsin
        const target = await resolveTargetStage()
        if (!alive) return
        setTargetStage(target)
        if (await isAtStage(target)) setPhase('ready')
        else if (stageMoveAllowed()) setPhase('countdown')
        else setPhase('deferred')
      } catch {
        if (alive) setPhase('deferred')
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  const run = useCallback(async () => {
    if (targetStage == null) return
    setPhase('moving')
    try {
      // Arka planda (ekran değişse de sürer) — büküm akışı başlamadan önce bitmesini bekler
      await startStageMove(targetStage)
      setPhase('ready')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setPhase('deferred')
    }
  }, [targetStage])

  const cancel = useCallback(() => setPhase('deferred'), [])
  /** 2026-11-20 (kullanıcı): ekran beklemeden geçilebilir — geri sayım sürüyorsa hareketi HEMEN başlat (arka planda) */
  const startNowIfPending = useCallback(() => {
    if (phase === 'countdown' && targetStage != null) void run()
  }, [phase, targetStage, run])
  const busy = phase === 'checking' || phase === 'countdown' || phase === 'moving'
  return { phase, targetStage, error, clearError: () => setError(null), run, cancel, startNowIfPending, busy, blockMessage }
}
