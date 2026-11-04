using CncBendingMachine.Core.Entities;
using CncBendingMachine.Core.Enums;
using CncBendingMachine.DataApi.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CncBendingMachine.DataApi.Controllers;

[ApiController]
[Route("api/bending-jobs")]
public class BendingJobsController : ControllerBase
{
    private readonly ILogger<BendingJobsController> _logger;
    private readonly AppDbContext _db;

    public BendingJobsController(ILogger<BendingJobsController> logger, AppDbContext db)
    {
        _logger = logger;
        _db = db;
    }

    // POST /api/bending-jobs — Bending API tum field'lari hesaplayip gonderir
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] BendingJob body)
    {
        if (body is null)
            return BadRequest(new { error = "Body is required" });

        body.Id = 0;
        body.CreatedAt = DateTime.UtcNow;
        if (body.Status == default)
            body.Status = BendingJobStatus.Ready;

        _db.BendingJobs.Add(body);
        await _db.SaveChangesAsync();

        _logger.LogInformation("BendingJob #{Id} created (status={Status})", body.Id, body.Status);
        return CreatedAtAction(nameof(GetById), new { id = body.Id }, body);
    }

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] BendingJobStatus? status = null, [FromQuery] int limit = 50)
    {
        var query = _db.BendingJobs.AsNoTracking().AsQueryable();

        if (status.HasValue)
            query = query.Where(j => j.Status == status.Value);

        var jobs = await query
            .OrderByDescending(j => j.CreatedAt)
            .Take(limit)
            .ToListAsync();

        return Ok(jobs);
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var job = await _db.BendingJobs.AsNoTracking().FirstOrDefaultAsync(j => j.Id == id);
        if (job == null) return NotFound(new { error = $"Job #{id} bulunamadı" });
        return Ok(job);
    }

    // GET /api/bending-jobs/active — Calisan job var mi (Bending API StartJob oncesi kontrol icin)
    [HttpGet("active")]
    public async Task<IActionResult> GetActive()
    {
        var running = await _db.BendingJobs.AsNoTracking()
            .FirstOrDefaultAsync(j => j.Status == BendingJobStatus.Running);
        return running == null ? NoContent() : Ok(running);
    }

    public class UpdateBendingJobRequest
    {
        public BendingJobStatus? Status { get; set; }
        public DateTime? StartedAt { get; set; }
        public DateTime? CompletedAt { get; set; }
        public double? DurationSeconds { get; set; }
        public int? CompletedPasos { get; set; }
        public int? TotalPasos { get; set; }
        public double? MeasuredDiameterMm { get; set; }
        public string? ErrorMessage { get; set; }
    }

    // PATCH-tarzi update — sadece set edilen field'lar guncellenir
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateBendingJobRequest body)
    {
        if (body is null)
            return BadRequest(new { error = "Body is required" });

        var job = await _db.BendingJobs.FindAsync(id);
        if (job == null) return NotFound(new { error = $"Job #{id} bulunamadı" });

        if (body.Status.HasValue) job.Status = body.Status.Value;
        if (body.StartedAt.HasValue) job.StartedAt = body.StartedAt.Value;
        if (body.CompletedAt.HasValue) job.CompletedAt = body.CompletedAt.Value;
        if (body.DurationSeconds.HasValue) job.DurationSeconds = body.DurationSeconds.Value;
        if (body.CompletedPasos.HasValue) job.CompletedPasos = body.CompletedPasos.Value;
        if (body.TotalPasos.HasValue) job.TotalPasos = body.TotalPasos.Value;
        if (body.MeasuredDiameterMm.HasValue) job.MeasuredDiameterMm = body.MeasuredDiameterMm.Value;
        if (body.ErrorMessage != null) job.ErrorMessage = body.ErrorMessage;

        await _db.SaveChangesAsync();
        return Ok(job);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var job = await _db.BendingJobs.FindAsync(id);
        if (job == null) return NotFound(new { error = $"Job #{id} bulunamadı" });

        if (job.Status == BendingJobStatus.Running)
            return BadRequest(new { error = "Çalışan iş silinemez. Önce durdurun." });

        _db.BendingJobs.Remove(job);
        await _db.SaveChangesAsync();
        _logger.LogInformation("BendingJob #{Id} silindi", id);
        return Ok(new { success = true });
    }
}
