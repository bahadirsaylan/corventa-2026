using CncBendingMachine.Core.Entities;
using CncBendingMachine.Core.Enums;
using CncBendingMachine.Core.Interfaces;
using CncBendingMachine.Core.Models.DataApi;

namespace CncBendingMachine.Infrastructure.DataApiClient;

public class DataApiServiceRepository : IServiceRepository
{
    private readonly IDataApiClient _client;

    public DataApiServiceRepository(IDataApiClient client)
    {
        _client = client;
    }

    // ===== Tickets =====

    public Task<IReadOnlyList<ServiceTicket>> GetTicketsAsync(ServiceTicketType type, int limit = 100)
        => _client.GetTicketsAsync(type, limit);

    public Task<ServiceTicket?> GetTicketAsync(int id)
        => _client.GetTicketAsync(id);

    // Eski imza ServiceTicket aliyor; DataApi POST /api/service/tickets icin TicketCreate DTO bekler.
    // Type/Title/Body/CreatedBy mapleyerek yolla. Geri kalan field'lari (Code, CreatedAt vs.)
    // DataApi server-side dolduruyor — donen ServiceTicket'i geri donuyoruz.
    public Task<ServiceTicket> AddTicketAsync(ServiceTicket ticket)
    {
        var req = new TicketCreate
        {
            Type = ticket.Type.ToString().ToLowerInvariant(),
            Title = ticket.Title,
            Body = ticket.Body,
            CreatedBy = ticket.CreatedBy
        };
        return _client.AddTicketAsync(req);
    }

    public async Task UpdateTicketAsync(ServiceTicket ticket)
        => await _client.UpdateTicketAsync(ticket.Id, ticket);

    // ===== Requests =====

    public Task<IReadOnlyList<ServiceRequest>> GetRequestsAsync(int limit = 100)
        => _client.GetRequestsAsync(limit);

    public Task<IReadOnlyList<ServiceRequest>> GetReportsAsync(int limit = 100)
        => _client.GetReportsAsync(limit);

    public Task<ServiceRequest?> GetRequestAsync(int id)
        => _client.GetRequestAsync(id);

    public Task<ServiceRequest> AddRequestAsync(ServiceRequest request)
        => _client.AddRequestAsync(request);

    public async Task UpdateRequestAsync(ServiceRequest request)
        => await _client.UpdateRequestAsync(request.Id, request);
}
