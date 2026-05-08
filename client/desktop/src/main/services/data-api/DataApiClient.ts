// DataApi (port 5002) HTTP client — DB CRUD operations.

import { getConfig } from '@main/config/runtime-config'
import { http } from '@main/lib/http'
import type { BendingJob } from '@shared/types'

export class DataApiClient {
  private get baseUrl(): string {
    return getConfig().dataApi.baseUrl
  }

  async isHealthy(): Promise<boolean> {
    try {
      await http.get(`${this.baseUrl}/health`, { timeoutMs: 3_000 })
      return true
    } catch {
      return false
    }
  }

  // ---------- BendingJobs ----------

  createBendingJob(job: Partial<BendingJob>): Promise<BendingJob> {
    return http.post<BendingJob>(`${this.baseUrl}/api/bending-jobs`, job)
  }

  getBendingJob(id: number): Promise<BendingJob> {
    return http.get<BendingJob>(`${this.baseUrl}/api/bending-jobs/${id}`)
  }

  getActiveBendingJob(): Promise<BendingJob | null> {
    return http.get<BendingJob | null>(`${this.baseUrl}/api/bending-jobs/active`)
  }
}

export const dataApi = new DataApiClient()
