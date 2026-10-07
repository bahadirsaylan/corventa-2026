// Service modülü için renderer hook'ları.
// preload bridge (window.corventa.service.*) üzerinden DataApi'ye gider.
// Cloud uyumu: bileşenler bu hook'lara bakar; HTTP/cloud geçişi tek noktada (preload).

import { useCallback, useEffect, useState } from 'react'

import type {
  ServiceRequest,
  ServiceRequestCreateRequest,
  ServiceTicket,
  ServiceTicketAction,
  ServiceTicketCreateRequest,
} from '@shared/types'

import {
  FAQ_COMPLAINTS,
  FAQ_QUESTIONS,
  FAQ_SUGGESTIONS,
  type FaqEntry,
} from '@/constants/serviceFaq'

export type TicketTypeStr = 'question' | 'suggestion' | 'complaint'

// ──────────────────────────────────────────────────────────
// TICKETS
// ──────────────────────────────────────────────────────────

export function useTickets(type: TicketTypeStr, limit = 100) {
  const [tickets, setTickets] = useState<ServiceTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const list = await window.corventa.service.listTickets(type, limit)
      setTickets(list)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [type, limit])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { tickets, loading, error, refresh }
}

export function useCreateTicket(type: TicketTypeStr) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const create = useCallback(
    async (
      input: Omit<ServiceTicketCreateRequest, 'type'>,
    ): Promise<ServiceTicket | null> => {
      setSubmitting(true)
      setError(null)
      try {
        const created = await window.corventa.service.createTicket({
          ...input,
          type,
        })
        return created
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
        return null
      } finally {
        setSubmitting(false)
      }
    },
    [type],
  )

  return { create, submitting, error }
}

export function useUpdateTicketStatus() {
  const update = useCallback(
    async (
      id: number,
      action: ServiceTicketAction,
      response?: string,
    ): Promise<ServiceTicket | null> => {
      try {
        return await window.corventa.service.updateTicketStatus(id, action, response)
      } catch (err) {
        console.error('updateTicketStatus failed', err)
        return null
      }
    },
    [],
  )
  return { update }
}

// ──────────────────────────────────────────────────────────
// REQUESTS / REPORTS
// ──────────────────────────────────────────────────────────

export function useServiceRequests(limit = 100) {
  const [requests, setRequests] = useState<ServiceRequest[]>([])
  const [reports, setReports] = useState<ServiceRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [r, rep] = await Promise.all([
        window.corventa.service.listRequests(limit),
        window.corventa.service.listReports(limit),
      ])
      setRequests(r)
      setReports(rep)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [limit])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { requests, reports, loading, error, refresh }
}

export function useServiceRequest(id: number | null) {
  const [request, setRequest] = useState<ServiceRequest | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (id === null) return
    setLoading(true)
    setError(null)
    try {
      const r = await window.corventa.service.getRequest(id)
      setRequest(r)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    if (id !== null) void refresh()
  }, [id, refresh])

  return { request, loading, error, refresh, setRequest }
}

export function useCreateServiceRequest() {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const create = useCallback(
    async (req: ServiceRequestCreateRequest): Promise<ServiceRequest | null> => {
      setSubmitting(true)
      setError(null)
      try {
        return await window.corventa.service.createRequest(req)
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
        return null
      } finally {
        setSubmitting(false)
      }
    },
    [],
  )

  return { create, submitting, error }
}

// ──────────────────────────────────────────────────────────
// FAQ — bugün constants, yarın DataApi fetch. Bileşen değişmez.
// ──────────────────────────────────────────────────────────

export function useFaqEntries(type: TicketTypeStr): FaqEntry[] {
  switch (type) {
    case 'question':
      return FAQ_QUESTIONS
    case 'suggestion':
      return FAQ_SUGGESTIONS
    case 'complaint':
      return FAQ_COMPLAINTS
  }
}
