using CncBendingMachine.Core.Entities;
using CncBendingMachine.Core.Enums;

namespace CncBendingMachine.Core.Interfaces;

public interface IServiceRepository
{
    // Tickets (Soru / Öneri / Şikayet)
    Task<IReadOnlyList<ServiceTicket>> GetTicketsAsync(ServiceTicketType type, int limit = 100);
    Task<ServiceTicket?> GetTicketAsync(int id);
    Task<ServiceTicket> AddTicketAsync(ServiceTicket ticket);
    Task UpdateTicketAsync(ServiceTicket ticket);

    // Requests (Servis Talebi)
    Task<IReadOnlyList<ServiceRequest>> GetRequestsAsync(int limit = 100);
    Task<IReadOnlyList<ServiceRequest>> GetReportsAsync(int limit = 100);
    Task<ServiceRequest?> GetRequestAsync(int id);
    Task<ServiceRequest> AddRequestAsync(ServiceRequest request);
    Task UpdateRequestAsync(ServiceRequest request);
}
