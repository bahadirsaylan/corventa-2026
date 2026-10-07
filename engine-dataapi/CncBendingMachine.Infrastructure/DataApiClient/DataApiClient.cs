using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using CncBendingMachine.Core.Entities;
using CncBendingMachine.Core.Enums;
using CncBendingMachine.Core.Interfaces;
using CncBendingMachine.Core.Models.DataApi;
using CncBendingMachine.Core.Models.Events;
using Microsoft.Extensions.Logging;

namespace CncBendingMachine.Infrastructure.DataApiClient;

public class DataApiClient : IDataApiClient
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    private readonly HttpClient _http;
    private readonly ILogger<DataApiClient> _logger;

    public DataApiClient(HttpClient http, ILogger<DataApiClient> logger)
    {
        _http = http;
        _logger = logger;
    }

    // ===== Health =====
    public async Task<bool> IsHealthyAsync(CancellationToken ct = default)
    {
        try
        {
            using var resp = await _http.GetAsync("health", ct);
            return resp.IsSuccessStatusCode;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "DataApi health check failed");
            return false;
        }
    }

    // ===== Settings: Machine =====
    public Task<MachineSettings> GetMachineSettingsAsync(CancellationToken ct = default)
        => GetRequiredAsync<MachineSettings>("api/settings/machine", ct);

    public Task<MachineSettings> UpdateMachineSettingsAsync(MachineSettings settings, CancellationToken ct = default)
        => SendAsync<MachineSettings, MachineSettings>(HttpMethod.Put, "api/settings/machine", settings, ct);

    // ===== Settings: Gonye =====
    public Task<GonyeSettings> GetGonyeSettingsAsync(CancellationToken ct = default)
        => GetRequiredAsync<GonyeSettings>("api/settings/gonye", ct);

    public Task<GonyeSettings> UpdateGonyeSettingsAsync(GonyeSettings settings, CancellationToken ct = default)
        => SendAsync<GonyeSettings, GonyeSettings>(HttpMethod.Put, "api/settings/gonye", settings, ct);

    // ===== Settings: Stages =====
    public async Task<IReadOnlyList<Stage>> GetStagesAsync(CancellationToken ct = default)
        => await GetRequiredAsync<List<Stage>>("api/settings/stages", ct);

    public Task<Stage> AddStageAsync(Stage stage, CancellationToken ct = default)
        => SendAsync<Stage, Stage>(HttpMethod.Post, "api/settings/stages", stage, ct);

    public Task<Stage> UpdateStageAsync(int id, Stage stage, CancellationToken ct = default)
        => SendAsync<Stage, Stage>(HttpMethod.Put, $"api/settings/stages/{id}", stage, ct);

    public Task DeleteStageAsync(int id, CancellationToken ct = default)
        => SendNoContentAsync(HttpMethod.Delete, $"api/settings/stages/{id}", ct);

    // ===== Service: Tickets =====
    public async Task<IReadOnlyList<ServiceTicket>> GetTicketsAsync(ServiceTicketType type, int limit = 100, CancellationToken ct = default)
    {
        var typeStr = type.ToString().ToLowerInvariant();
        return await GetRequiredAsync<List<ServiceTicket>>($"api/service/tickets?type={typeStr}&limit={limit}", ct);
    }

    public Task<ServiceTicket?> GetTicketAsync(int id, CancellationToken ct = default)
        => GetOrNullAsync<ServiceTicket>($"api/service/tickets/{id}", ct);

    public Task<ServiceTicket> AddTicketAsync(TicketCreate request, CancellationToken ct = default)
        => SendAsync<TicketCreate, ServiceTicket>(HttpMethod.Post, "api/service/tickets", request, ct);

    public Task<ServiceTicket> UpdateTicketAsync(int id, ServiceTicket ticket, CancellationToken ct = default)
        => SendAsync<ServiceTicket, ServiceTicket>(HttpMethod.Put, $"api/service/tickets/{id}", ticket, ct);

    public Task<ServiceTicket> UpdateTicketStatusAsync(int id, TicketStatusUpdate request, CancellationToken ct = default)
        => SendAsync<TicketStatusUpdate, ServiceTicket>(HttpMethod.Put, $"api/service/tickets/{id}/status", request, ct);

    // ===== Service: Requests =====
    public async Task<IReadOnlyList<ServiceRequest>> GetRequestsAsync(int limit = 100, CancellationToken ct = default)
        => await GetRequiredAsync<List<ServiceRequest>>($"api/service/requests?limit={limit}", ct);

    public async Task<IReadOnlyList<ServiceRequest>> GetReportsAsync(int limit = 100, CancellationToken ct = default)
        => await GetRequiredAsync<List<ServiceRequest>>($"api/service/reports?limit={limit}", ct);

    public Task<ServiceRequest?> GetRequestAsync(int id, CancellationToken ct = default)
        => GetOrNullAsync<ServiceRequest>($"api/service/requests/{id}", ct);

    public Task<ServiceRequest> AddRequestAsync(ServiceRequest request, CancellationToken ct = default)
        => SendAsync<ServiceRequest, ServiceRequest>(HttpMethod.Post, "api/service/requests", request, ct);

    public Task<ServiceRequest> UpdateRequestAsync(int id, ServiceRequest request, CancellationToken ct = default)
        => SendAsync<ServiceRequest, ServiceRequest>(HttpMethod.Put, $"api/service/requests/{id}", request, ct);

    public Task<ServiceRequest> StartRequestAsync(int id, CancellationToken ct = default)
        => SendAsync<object, ServiceRequest>(HttpMethod.Post, $"api/service/requests/{id}/start", new { }, ct);

    public Task<ServiceRequest> CompleteRequestAsync(int id, CancellationToken ct = default)
        => SendAsync<object, ServiceRequest>(HttpMethod.Post, $"api/service/requests/{id}/complete", new { }, ct);

    public Task ConfirmRequestAsync(int id, string code, CancellationToken ct = default)
        => SendNoContentAsync(HttpMethod.Post, $"api/service/requests/{id}/confirm", ct, new { code });

    public Task<ServiceRequest> RateRequestAsync(int id, int rating, string? note, CancellationToken ct = default)
        => SendAsync<object, ServiceRequest>(HttpMethod.Post, $"api/service/requests/{id}/rating", new { rating, note }, ct);

    // ===== BendingJobs =====
    public Task<BendingJob> CreateBendingJobAsync(BendingJob job, CancellationToken ct = default)
        => SendAsync<BendingJob, BendingJob>(HttpMethod.Post, "api/bending-jobs", job, ct);

    public Task<BendingJob?> GetBendingJobAsync(int id, CancellationToken ct = default)
        => GetOrNullAsync<BendingJob>($"api/bending-jobs/{id}", ct);

    public async Task<IReadOnlyList<BendingJob>> ListBendingJobsAsync(BendingJobStatus? status = null, int limit = 50, CancellationToken ct = default)
    {
        var url = status.HasValue
            ? $"api/bending-jobs?status={(int)status.Value}&limit={limit}"
            : $"api/bending-jobs?limit={limit}";
        return await GetRequiredAsync<List<BendingJob>>(url, ct);
    }

    public async Task<BendingJob?> GetActiveBendingJobAsync(CancellationToken ct = default)
    {
        using var resp = await _http.GetAsync("api/bending-jobs/active", ct);
        if (resp.StatusCode == HttpStatusCode.NoContent) return null;
        await EnsureSuccessAsync(resp, "GET /api/bending-jobs/active");
        return await resp.Content.ReadFromJsonAsync<BendingJob>(JsonOptions, ct);
    }

    public Task<BendingJob> UpdateBendingJobAsync(int id, BendingJobUpdate update, CancellationToken ct = default)
        => SendAsync<BendingJobUpdate, BendingJob>(HttpMethod.Put, $"api/bending-jobs/{id}", update, ct);

    public Task DeleteBendingJobAsync(int id, CancellationToken ct = default)
        => SendNoContentAsync(HttpMethod.Delete, $"api/bending-jobs/{id}", ct);

    // ===== BendingLogs =====
    public async Task<int> InsertBendingLogsBatchAsync(IReadOnlyList<BendingLog> logs, CancellationToken ct = default)
    {
        if (logs.Count == 0) return 0;

        using var resp = await _http.PostAsJsonAsync("api/bending-logs/batch", logs, JsonOptions, ct);
        await EnsureSuccessAsync(resp, "POST /api/bending-logs/batch");

        var doc = await resp.Content.ReadFromJsonAsync<JsonElement>(JsonOptions, ct);
        return doc.TryGetProperty("inserted", out var ins) ? ins.GetInt32() : logs.Count;
    }

    public async Task<IReadOnlyList<BendingLog>> QueryBendingLogsAsync(int jobId, string? category = null, bool? errorsOnly = null, int limit = 500, CancellationToken ct = default)
    {
        var query = $"jobId={jobId}&limit={limit}";
        if (!string.IsNullOrEmpty(category)) query += $"&category={Uri.EscapeDataString(category)}";
        if (errorsOnly == true) query += "&errorsOnly=true";

        using var resp = await _http.GetAsync($"api/bending-logs?{query}", ct);
        await EnsureSuccessAsync(resp, $"GET /api/bending-logs?{query}");

        var doc = await resp.Content.ReadFromJsonAsync<JsonElement>(JsonOptions, ct);
        if (!doc.TryGetProperty("logs", out var arr) || arr.ValueKind != JsonValueKind.Array)
            return Array.Empty<BendingLog>();

        return JsonSerializer.Deserialize<List<BendingLog>>(arr.GetRawText(), JsonOptions)
            ?? new List<BendingLog>();
    }

    // ===== Events (Faz 6c) =====
    public Task PublishEventAsync(MachineEvent evt, CancellationToken ct = default)
        => SendNoContentAsync(HttpMethod.Post, "api/events", ct, evt);

    // ===== Helpers =====
    private async Task<T> GetRequiredAsync<T>(string url, CancellationToken ct)
    {
        using var resp = await _http.GetAsync(url, ct);
        await EnsureSuccessAsync(resp, $"GET {url}");
        var data = await resp.Content.ReadFromJsonAsync<T>(JsonOptions, ct);
        if (data == null)
            throw new InvalidOperationException($"DataApi GET {url} bos cevap dondu");
        return data;
    }

    private async Task<T?> GetOrNullAsync<T>(string url, CancellationToken ct) where T : class
    {
        using var resp = await _http.GetAsync(url, ct);
        if (resp.StatusCode == HttpStatusCode.NotFound || resp.StatusCode == HttpStatusCode.NoContent)
            return null;
        await EnsureSuccessAsync(resp, $"GET {url}");
        return await resp.Content.ReadFromJsonAsync<T>(JsonOptions, ct);
    }

    private async Task<TResp> SendAsync<TReq, TResp>(HttpMethod method, string url, TReq body, CancellationToken ct)
    {
        using var req = new HttpRequestMessage(method, url)
        {
            Content = JsonContent.Create(body, options: JsonOptions)
        };
        using var resp = await _http.SendAsync(req, ct);
        await EnsureSuccessAsync(resp, $"{method} {url}");
        var data = await resp.Content.ReadFromJsonAsync<TResp>(JsonOptions, ct);
        if (data == null)
            throw new InvalidOperationException($"DataApi {method} {url} bos cevap dondu");
        return data;
    }

    private async Task SendNoContentAsync(HttpMethod method, string url, CancellationToken ct, object? body = null)
    {
        using var req = new HttpRequestMessage(method, url);
        if (body != null)
            req.Content = JsonContent.Create(body, options: JsonOptions);

        using var resp = await _http.SendAsync(req, ct);
        await EnsureSuccessAsync(resp, $"{method} {url}");
    }

    private async Task EnsureSuccessAsync(HttpResponseMessage resp, string operation)
    {
        if (resp.IsSuccessStatusCode) return;

        string? body = null;
        try { body = await resp.Content.ReadAsStringAsync(); } catch { }

        var msg = $"DataApi {operation} basarisiz: HTTP {(int)resp.StatusCode} {resp.ReasonPhrase}. Body: {body}";
        _logger.LogError("{Message}", msg);
        throw new HttpRequestException(msg, null, resp.StatusCode);
    }
}
