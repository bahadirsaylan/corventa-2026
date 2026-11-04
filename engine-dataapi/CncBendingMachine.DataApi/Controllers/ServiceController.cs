using CncBendingMachine.Core.Entities;
using CncBendingMachine.Core.Enums;
using CncBendingMachine.Core.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace CncBendingMachine.DataApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ServiceController : ControllerBase
{
    private readonly ILogger<ServiceController> _logger;
    private readonly IServiceRepository _repo;

    public ServiceController(ILogger<ServiceController> logger, IServiceRepository repo)
    {
        _logger = logger;
        _repo = repo;
    }

    // ============================================================
    // TICKETS
    // ============================================================

    [HttpGet("tickets")]
    public async Task<IActionResult> GetTickets([FromQuery] string type, [FromQuery] int limit = 100)
    {
        if (!TryParseTicketType(type, out var ticketType))
            return BadRequest(new { error = "type parametresi: question, suggestion veya complaint olmalı" });

        var tickets = await _repo.GetTicketsAsync(ticketType, limit);
        return Ok(tickets);
    }

    [HttpGet("tickets/{id:int}")]
    public async Task<IActionResult> GetTicket(int id)
    {
        var ticket = await _repo.GetTicketAsync(id);
        if (ticket == null) return NotFound(new { error = "Ticket bulunamadı" });
        return Ok(ticket);
    }

    public class CreateTicketRequest
    {
        public string Type { get; set; } = "";
        public string Title { get; set; } = "";
        public string Body { get; set; } = "";
        public string? CreatedBy { get; set; }
    }

    [HttpPost("tickets")]
    public async Task<IActionResult> CreateTicket([FromBody] CreateTicketRequest req)
    {
        if (req is null) return BadRequest(new { error = "Body zorunlu" });
        if (string.IsNullOrWhiteSpace(req.Title))
            return BadRequest(new { error = "Başlık zorunlu" });
        if (string.IsNullOrWhiteSpace(req.Body))
            return BadRequest(new { error = "Açıklama zorunlu" });
        if (!TryParseTicketType(req.Type, out var ticketType))
            return BadRequest(new { error = "type parametresi: question, suggestion veya complaint olmalı" });

        var ticket = new ServiceTicket
        {
            Type = ticketType,
            Status = ServiceTicketStatus.Pending,
            Title = req.Title.Trim(),
            Body = req.Body.Trim(),
            CreatedBy = req.CreatedBy
        };

        var created = await _repo.AddTicketAsync(ticket);
        _logger.LogInformation("ServiceTicket {Code} oluşturuldu ({Type})", created.Code, created.Type);
        return Ok(created);
    }

    public class UpdateTicketStatusRequest
    {
        public string Action { get; set; } = "";
        public string? Response { get; set; }
    }

    // PUT /api/service/tickets/{id} — full update (Bending API'nin IServiceRepository.UpdateTicketAsync(ServiceTicket) icin)
    [HttpPut("tickets/{id:int}")]
    public async Task<IActionResult> UpdateTicket(int id, [FromBody] ServiceTicket body)
    {
        if (body is null) return BadRequest(new { error = "Body zorunlu" });

        var ticket = await _repo.GetTicketAsync(id);
        if (ticket == null) return NotFound(new { error = "Ticket bulunamadı" });

        ticket.Type = body.Type;
        ticket.Status = body.Status;
        ticket.Title = body.Title ?? ticket.Title;
        ticket.Body = body.Body ?? ticket.Body;
        ticket.Response = body.Response;
        ticket.AnsweredAt = body.AnsweredAt;
        ticket.ClosedAt = body.ClosedAt;
        ticket.CreatedBy = body.CreatedBy;

        await _repo.UpdateTicketAsync(ticket);
        return Ok(ticket);
    }

    [HttpPut("tickets/{id:int}/status")]
    public async Task<IActionResult> UpdateTicketStatus(int id, [FromBody] UpdateTicketStatusRequest req)
    {
        var ticket = await _repo.GetTicketAsync(id);
        if (ticket == null) return NotFound(new { error = "Ticket bulunamadı" });

        var action = (req?.Action ?? "").ToLowerInvariant();
        switch (action)
        {
            case "resolved":
            case "closed":
                ticket.Status = ServiceTicketStatus.Resolved;
                ticket.ClosedAt = DateTime.UtcNow;
                break;
            case "in-progress":
            case "continue":
                ticket.Status = ServiceTicketStatus.InProgress;
                break;
            case "answered":
                ticket.Status = ServiceTicketStatus.Answered;
                ticket.AnsweredAt = DateTime.UtcNow;
                break;
            case "cancelled":
                ticket.Status = ServiceTicketStatus.Cancelled;
                ticket.ClosedAt = DateTime.UtcNow;
                break;
            default:
                return BadRequest(new { error = "Action: resolved, in-progress, answered veya cancelled" });
        }

        if (!string.IsNullOrWhiteSpace(req?.Response))
            ticket.Response = req!.Response;

        await _repo.UpdateTicketAsync(ticket);
        return Ok(ticket);
    }

    // ============================================================
    // REQUESTS
    // ============================================================

    [HttpGet("requests")]
    public async Task<IActionResult> GetRequests([FromQuery] int limit = 100)
    {
        var list = await _repo.GetRequestsAsync(limit);
        return Ok(list);
    }

    [HttpGet("reports")]
    public async Task<IActionResult> GetReports([FromQuery] int limit = 100)
    {
        var list = await _repo.GetReportsAsync(limit);
        return Ok(list);
    }

    [HttpGet("requests/{id:int}")]
    public async Task<IActionResult> GetRequest(int id)
    {
        var r = await _repo.GetRequestAsync(id);
        if (r == null) return NotFound(new { error = "Servis talebi bulunamadı" });
        return Ok(r);
    }

    [HttpPost("requests")]
    public async Task<IActionResult> CreateRequest([FromBody] ServiceRequest body)
    {
        if (body is null) return BadRequest(new { error = "Body zorunlu" });
        if (string.IsNullOrWhiteSpace(body.CustomerName))
            return BadRequest(new { error = "Müşteri adı zorunlu" });

        body.Id = 0;
        body.Code = string.Empty;
        body.CreatedAt = default;
        body.Status = ServiceRequestStatus.Planned;
        body.ReportCode = null;
        body.ConfirmCode = null;
        body.IsConfirmed = false;
        body.Rating = null;
        body.StartedAt = null;
        body.CompletedAt = null;

        var created = await _repo.AddRequestAsync(body);
        _logger.LogInformation("ServiceRequest {Code} oluşturuldu", created.Code);
        return Ok(created);
    }

    [HttpPut("requests/{id:int}")]
    public async Task<IActionResult> UpdateRequest(int id, [FromBody] ServiceRequest body)
    {
        var existing = await _repo.GetRequestAsync(id);
        if (existing == null) return NotFound(new { error = "Servis talebi bulunamadı" });
        if (body is null) return BadRequest(new { error = "Body zorunlu" });

        existing.CustomerName = body.CustomerName ?? existing.CustomerName;
        existing.CustomerAddress = body.CustomerAddress ?? existing.CustomerAddress;
        existing.MachineModel = body.MachineModel ?? existing.MachineModel;
        existing.MachineProductionYear = body.MachineProductionYear ?? existing.MachineProductionYear;
        existing.MachineCode = body.MachineCode ?? existing.MachineCode;
        existing.MachineVeAiCode = body.MachineVeAiCode ?? existing.MachineVeAiCode;
        existing.TechnicianName = body.TechnicianName ?? existing.TechnicianName;
        existing.ContactInfo = body.ContactInfo;
        existing.Purpose = body.Purpose;
        existing.ProblemDescription = body.ProblemDescription;
        existing.WorkDoneCodes = body.WorkDoneCodes ?? "[]";
        existing.PartsUsedCodes = body.PartsUsedCodes ?? "[]";
        existing.MissingPartsCodes = body.MissingPartsCodes ?? "[]";

        await _repo.UpdateRequestAsync(existing);
        return Ok(existing);
    }

    [HttpPost("requests/{id:int}/start")]
    public async Task<IActionResult> StartRequest(int id)
    {
        var r = await _repo.GetRequestAsync(id);
        if (r == null) return NotFound(new { error = "Servis talebi bulunamadı" });
        if (r.Status == ServiceRequestStatus.Completed)
            return BadRequest(new { error = "Servis zaten tamamlanmış" });

        r.Status = ServiceRequestStatus.InProgress;
        r.StartedAt ??= DateTime.UtcNow;
        await _repo.UpdateRequestAsync(r);
        return Ok(r);
    }

    [HttpPost("requests/{id:int}/complete")]
    public async Task<IActionResult> CompleteRequest(int id)
    {
        var r = await _repo.GetRequestAsync(id);
        if (r == null) return NotFound(new { error = "Servis talebi bulunamadı" });

        if (string.IsNullOrEmpty(r.ReportCode))
        {
            var now = DateTime.UtcNow;
            r.ReportCode = $"SR.{now:yyMMdd}{new Random().Next(10000000, 99999999)}";
        }

        if (string.IsNullOrEmpty(r.ConfirmCode))
        {
            r.ConfirmCode = new Random().Next(100000, 999999).ToString();
        }

        r.Status = ServiceRequestStatus.Completed;
        r.CompletedAt = DateTime.UtcNow;
        await _repo.UpdateRequestAsync(r);

        _logger.LogInformation("ServiceRequest {Code} tamamlandı, ConfirmCode: {ConfirmCode}",
            r.Code, r.ConfirmCode);

        return Ok(r);
    }

    public class ConfirmRequestBody
    {
        public string Code { get; set; } = "";
    }

    [HttpPost("requests/{id:int}/confirm")]
    public async Task<IActionResult> ConfirmRequest(int id, [FromBody] ConfirmRequestBody req)
    {
        var r = await _repo.GetRequestAsync(id);
        if (r == null) return NotFound(new { error = "Servis talebi bulunamadı" });
        if (string.IsNullOrEmpty(r.ConfirmCode))
            return BadRequest(new { error = "Bu talep için onay kodu üretilmemiş (önce complete yapılmalı)" });
        if (req?.Code != r.ConfirmCode)
            return BadRequest(new { error = "Onay kodu hatalı" });

        r.IsConfirmed = true;
        await _repo.UpdateRequestAsync(r);
        return Ok(new { success = true });
    }

    public class RatingRequest
    {
        public int Rating { get; set; }
        public string? Note { get; set; }
    }

    [HttpPost("requests/{id:int}/rating")]
    public async Task<IActionResult> RateRequest(int id, [FromBody] RatingRequest req)
    {
        if (req is null || req.Rating < 1 || req.Rating > 10)
            return BadRequest(new { error = "Rating 1-10 arası olmalı" });

        var r = await _repo.GetRequestAsync(id);
        if (r == null) return NotFound(new { error = "Servis talebi bulunamadı" });

        r.Rating = req.Rating;
        r.RatingNote = req.Note;
        await _repo.UpdateRequestAsync(r);
        return Ok(r);
    }

    private static bool TryParseTicketType(string? s, out ServiceTicketType type)
    {
        switch ((s ?? "").ToLowerInvariant())
        {
            case "question": case "soru": case "s":
                type = ServiceTicketType.Question; return true;
            case "suggestion": case "oneri": case "öneri": case "o": case "ö":
                type = ServiceTicketType.Suggestion; return true;
            case "complaint": case "sikayet": case "şikayet": case "s2": case "ş":
                type = ServiceTicketType.Complaint; return true;
            default:
                type = ServiceTicketType.Question; return false;
        }
    }
}
