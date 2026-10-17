using CncBendingMachine.Core.Entities;
using CncBendingMachine.Core.Enums;
using CncBendingMachine.Core.Models.DataApi;
using CncBendingMachine.Core.Models.Events;

namespace CncBendingMachine.Core.Interfaces;

// DataApi (port 5002) ile HTTP konusan tek noktalı istemci. Bending API DB'ye direkt erismiyor.
public interface IDataApiClient
{
    // ===== Health =====
    Task<bool> IsHealthyAsync(CancellationToken ct = default);

    // ===== Settings: Machine =====
    Task<MachineSettings> GetMachineSettingsAsync(CancellationToken ct = default);
    Task<MachineSettings> UpdateMachineSettingsAsync(MachineSettings settings, CancellationToken ct = default);

    // ===== Settings: Gonye =====
    Task<GonyeSettings> GetGonyeSettingsAsync(CancellationToken ct = default);
    Task<GonyeSettings> UpdateGonyeSettingsAsync(GonyeSettings settings, CancellationToken ct = default);

    // ===== Settings: Stages =====
    Task<IReadOnlyList<Stage>> GetStagesAsync(CancellationToken ct = default);
    Task<Stage> AddStageAsync(Stage stage, CancellationToken ct = default);
    Task<Stage> UpdateStageAsync(int id, Stage stage, CancellationToken ct = default);
    Task DeleteStageAsync(int id, CancellationToken ct = default);

    // ===== Service: Tickets =====
    Task<IReadOnlyList<ServiceTicket>> GetTicketsAsync(ServiceTicketType type, int limit = 100, CancellationToken ct = default);
    Task<ServiceTicket?> GetTicketAsync(int id, CancellationToken ct = default);
    Task<ServiceTicket> AddTicketAsync(TicketCreate request, CancellationToken ct = default);
    Task<ServiceTicket> UpdateTicketAsync(int id, ServiceTicket ticket, CancellationToken ct = default);
    Task<ServiceTicket> UpdateTicketStatusAsync(int id, TicketStatusUpdate request, CancellationToken ct = default);

    // ===== Service: Requests =====
    Task<IReadOnlyList<ServiceRequest>> GetRequestsAsync(int limit = 100, CancellationToken ct = default);
    Task<IReadOnlyList<ServiceRequest>> GetReportsAsync(int limit = 100, CancellationToken ct = default);
    Task<ServiceRequest?> GetRequestAsync(int id, CancellationToken ct = default);
    Task<ServiceRequest> AddRequestAsync(ServiceRequest request, CancellationToken ct = default);
    Task<ServiceRequest> UpdateRequestAsync(int id, ServiceRequest request, CancellationToken ct = default);
    Task<ServiceRequest> StartRequestAsync(int id, CancellationToken ct = default);
    Task<ServiceRequest> CompleteRequestAsync(int id, CancellationToken ct = default);
    Task ConfirmRequestAsync(int id, string code, CancellationToken ct = default);
    Task<ServiceRequest> RateRequestAsync(int id, int rating, string? note, CancellationToken ct = default);

    // ===== BendingJobs =====
    Task<BendingJob> CreateBendingJobAsync(BendingJob job, CancellationToken ct = default);
    Task<BendingJob?> GetBendingJobAsync(int id, CancellationToken ct = default);
    Task<IReadOnlyList<BendingJob>> ListBendingJobsAsync(BendingJobStatus? status = null, int limit = 50, CancellationToken ct = default);
    Task<BendingJob?> GetActiveBendingJobAsync(CancellationToken ct = default);
    Task<BendingJob> UpdateBendingJobAsync(int id, BendingJobUpdate update, CancellationToken ct = default);
    Task DeleteBendingJobAsync(int id, CancellationToken ct = default);

    // ===== BendingLogs =====
    Task<int> InsertBendingLogsBatchAsync(IReadOnlyList<BendingLog> logs, CancellationToken ct = default);
    Task<IReadOnlyList<BendingLog>> QueryBendingLogsAsync(int jobId, string? category = null, bool? errorsOnly = null, int limit = 500, CancellationToken ct = default);

    // ===== Events (Faz 6c — sensor-triggered events) =====
    /// <summary>
    /// MachineEvent envelope'unu DataApi'ye yayınlar (POST /api/events).
    /// DataApi cache'ler ve /corventa üzerinden bağlı UI client'lerine broadcast eder.
    /// Hot path'te değil — fire-and-forget pattern uygundur (publisher exception swallow eder).
    /// </summary>
    Task PublishEventAsync(MachineEvent evt, CancellationToken ct = default);
}
