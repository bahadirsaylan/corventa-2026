using CncBendingMachine.Core.Entities;
using CncBendingMachine.Core.Enums;
using CncBendingMachine.Core.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace CncBendingMachine.DataApi.Persistence;

public class ServiceRepository : IServiceRepository
{
    private readonly AppDbContext _context;

    public ServiceRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<IReadOnlyList<ServiceTicket>> GetTicketsAsync(ServiceTicketType type, int limit = 100)
    {
        return await _context.ServiceTickets
            .Where(t => t.Type == type)
            .OrderByDescending(t => t.CreatedAt)
            .Take(limit)
            .ToListAsync();
    }

    public async Task<ServiceTicket?> GetTicketAsync(int id)
    {
        return await _context.ServiceTickets.FirstOrDefaultAsync(t => t.Id == id);
    }

    public async Task<ServiceTicket> AddTicketAsync(ServiceTicket ticket)
    {
        ticket.CreatedAt = DateTime.UtcNow;
        if (string.IsNullOrEmpty(ticket.Code))
        {
            ticket.Code = await GenerateTicketCodeAsync(ticket.Type);
        }
        _context.ServiceTickets.Add(ticket);
        await _context.SaveChangesAsync();
        return ticket;
    }

    public async Task UpdateTicketAsync(ServiceTicket ticket)
    {
        _context.ServiceTickets.Update(ticket);
        await _context.SaveChangesAsync();
    }

    private async Task<string> GenerateTicketCodeAsync(ServiceTicketType type)
    {
        var prefix = type switch
        {
            ServiceTicketType.Question => "S",
            ServiceTicketType.Suggestion => "Ö",
            ServiceTicketType.Complaint => "Ş",
            _ => "S"
        };
        var now = DateTime.UtcNow;
        var yy = now.ToString("yy");
        var mm = now.ToString("MM");

        var countThisMonth = await _context.ServiceTickets
            .CountAsync(t => t.Type == type && t.CreatedAt.Year == now.Year && t.CreatedAt.Month == now.Month);

        return $"{prefix}.{yy}.{mm}.{(countThisMonth + 1):D3}";
    }

    public async Task<IReadOnlyList<ServiceRequest>> GetRequestsAsync(int limit = 100)
    {
        return await _context.ServiceRequests
            .OrderByDescending(r => r.CreatedAt)
            .Take(limit)
            .ToListAsync();
    }

    public async Task<IReadOnlyList<ServiceRequest>> GetReportsAsync(int limit = 100)
    {
        return await _context.ServiceRequests
            .Where(r => r.ReportCode != null)
            .OrderByDescending(r => r.CompletedAt ?? r.CreatedAt)
            .Take(limit)
            .ToListAsync();
    }

    public async Task<ServiceRequest?> GetRequestAsync(int id)
    {
        return await _context.ServiceRequests.FirstOrDefaultAsync(r => r.Id == id);
    }

    public async Task<ServiceRequest> AddRequestAsync(ServiceRequest request)
    {
        request.CreatedAt = DateTime.UtcNow;
        if (string.IsNullOrEmpty(request.Code))
        {
            request.Code = await GenerateRequestCodeAsync();
        }
        _context.ServiceRequests.Add(request);
        await _context.SaveChangesAsync();
        return request;
    }

    public async Task UpdateRequestAsync(ServiceRequest request)
    {
        _context.ServiceRequests.Update(request);
        await _context.SaveChangesAsync();
    }

    private async Task<string> GenerateRequestCodeAsync()
    {
        var now = DateTime.UtcNow;
        var yy = now.ToString("yy");
        var mm = now.ToString("MM");
        var countThisMonth = await _context.ServiceRequests
            .CountAsync(r => r.CreatedAt.Year == now.Year && r.CreatedAt.Month == now.Month);
        return $"T.{yy}.{mm}.{(countThisMonth + 1):D3}";
    }
}
