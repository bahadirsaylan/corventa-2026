using CncBendingMachine.Core.Entities;
using Microsoft.EntityFrameworkCore;

namespace CncBendingMachine.DataApi.Persistence;

// HasData seed icin DateTime sabit; aksi halde migration deterministic olmaz

public class AppDbContext : DbContext
{
    private static readonly DateTime SeedTimestamp = new(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc);

    public DbSet<MachineSettings> MachineSettings => Set<MachineSettings>();
    public DbSet<GonyeSettings> GonyeSettings => Set<GonyeSettings>();
    public DbSet<Stage> Stages => Set<Stage>();
    public DbSet<BendingJob> BendingJobs => Set<BendingJob>();
    public DbSet<BendingLog> BendingLogs => Set<BendingLog>();
    public DbSet<ServiceTicket> ServiceTickets => Set<ServiceTicket>();
    public DbSet<ServiceRequest> ServiceRequests => Set<ServiceRequest>();

    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<MachineSettings>(entity =>
        {
            entity.ToTable("MachineSettings");
            entity.HasKey(e => e.Id);
        });

        modelBuilder.Entity<GonyeSettings>(entity =>
        {
            entity.ToTable("GonyeSettings");
            entity.HasKey(e => e.Id);
        });

        modelBuilder.Entity<Stage>(entity =>
        {
            entity.ToTable("Stages");
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.StageNumber).IsUnique();
            entity.Property(e => e.Name).HasMaxLength(100);
            entity.Property(e => e.Description).HasMaxLength(500);
        });

        modelBuilder.Entity<BendingJob>(entity =>
        {
            entity.ToTable("BendingJobs");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.ActiveSensorSide).HasMaxLength(10);
            entity.Property(e => e.ErrorMessage).HasMaxLength(2000);
            entity.Property(e => e.Notes).HasMaxLength(2000);
            entity.Property(e => e.OperatorName).HasMaxLength(200);
            entity.Property(e => e.ValsCode).HasMaxLength(50);
            entity.HasIndex(e => e.Status);
            entity.HasIndex(e => e.CreatedAt);
        });

        modelBuilder.Entity<BendingLog>(entity =>
        {
            entity.ToTable("BendingLogs");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Category).HasMaxLength(50);
            entity.Property(e => e.Message).HasMaxLength(1000);
            entity.Property(e => e.ValueLabels).HasMaxLength(200);
            entity.HasIndex(e => e.BendingJobId);
            entity.HasIndex(e => new { e.BendingJobId, e.Timestamp });
        });

        modelBuilder.Entity<ServiceTicket>(entity =>
        {
            entity.ToTable("ServiceTickets");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Code).HasMaxLength(50);
            entity.Property(e => e.Title).HasMaxLength(300);
            entity.Property(e => e.Body).HasMaxLength(4000);
            entity.Property(e => e.Response).HasMaxLength(4000);
            entity.Property(e => e.CreatedBy).HasMaxLength(200);
            entity.HasIndex(e => e.Type);
            entity.HasIndex(e => e.Status);
            entity.HasIndex(e => e.CreatedAt);
        });

        modelBuilder.Entity<ServiceRequest>(entity =>
        {
            entity.ToTable("ServiceRequests");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Code).HasMaxLength(50);
            entity.Property(e => e.CustomerName).HasMaxLength(200);
            entity.Property(e => e.CustomerAddress).HasMaxLength(500);
            entity.Property(e => e.MachineModel).HasMaxLength(100);
            entity.Property(e => e.MachineProductionYear).HasMaxLength(20);
            entity.Property(e => e.MachineCode).HasMaxLength(100);
            entity.Property(e => e.MachineVeAiCode).HasMaxLength(100);
            entity.Property(e => e.TechnicianName).HasMaxLength(200);
            entity.Property(e => e.ContactInfo).HasMaxLength(500);
            entity.Property(e => e.ProblemDescription).HasMaxLength(2000);
            entity.Property(e => e.WorkDoneCodes).HasMaxLength(4000);
            entity.Property(e => e.PartsUsedCodes).HasMaxLength(4000);
            entity.Property(e => e.MissingPartsCodes).HasMaxLength(4000);
            entity.Property(e => e.ReportCode).HasMaxLength(50);
            entity.Property(e => e.ConfirmCode).HasMaxLength(20);
            entity.Property(e => e.RatingNote).HasMaxLength(1000);
            entity.HasIndex(e => e.Status);
            entity.HasIndex(e => e.CreatedAt);
        });

        SeedDefaultData(modelBuilder);
    }

    private static void SeedDefaultData(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<MachineSettings>().HasData(new MachineSettings
        {
            Id = 1,
            LeftPistonStrokeMm = 422.0,
            RightPistonStrokeMm = 422.0,
            UpperPistonStrokeMm = 161.0,
            LowerPistonStrokeMm = 195.0,
            LeftPistonMaxReg = 21093,
            RightPistonMaxReg = 21127,
            UpperPistonMaxReg = 7981,
            LowerPistonMaxReg = 9732,
            PneumaticStrokeMm = 265.0,
            PneumaticMaxReg = 13250,
            RollerDiameterMm = 220.0,
            RotationEncoderPpr = 1024,
            SafetyMarginMm = 1.0,
            CreatedAt = SeedTimestamp,
            UpdatedAt = SeedTimestamp
        });

        modelBuilder.Entity<GonyeSettings>().HasData(new GonyeSettings
        {
            Id = 1,
            LeftOffsetMm = 3.75,
            RightOffsetMm = 3.75,
            UpperOffsetMm = 0.0,
            LowerOffsetMm = 10.5,
            ReferencePressureBar = 70,
            CreatedAt = SeedTimestamp,
            UpdatedAt = SeedTimestamp
        });

        modelBuilder.Entity<Stage>().HasData(
            new Stage
            {
                Id = 1,
                StageNumber = 1,
                Name = "Stage 1",
                Description = "Gonye pozisyonu - Küçük kapasite",
                LeftOffsetMm = 0,
                RightOffsetMm = 0,
                LowerOffsetMm = 0,
                MaxProfileAMm = 50,   // GEÇİCİ: kullanıcı sonra ayarlayacak
                IsActive = true,
                DisplayOrder = 1,
                CreatedAt = SeedTimestamp,
                UpdatedAt = SeedTimestamp
            },
            new Stage
            {
                Id = 2,
                StageNumber = 2,
                Name = "Stage 2",
                Description = "Orta kapasite",
                LeftOffsetMm = 67.34,
                RightOffsetMm = 67.34,
                LowerOffsetMm = 60.0,
                MaxProfileAMm = 120,  // GEÇİCİ: kullanıcı sonra ayarlayacak
                IsActive = true,
                DisplayOrder = 2,
                CreatedAt = SeedTimestamp,
                UpdatedAt = SeedTimestamp
            },
            new Stage
            {
                Id = 3,
                StageNumber = 3,
                Name = "Stage 3",
                Description = "Büyük kapasite",
                LeftOffsetMm = 134.68,
                RightOffsetMm = 134.68,
                LowerOffsetMm = 120.0,
                MaxProfileAMm = 250,  // GEÇİCİ: kullanıcı sonra ayarlayacak
                IsActive = true,
                DisplayOrder = 3,
                CreatedAt = SeedTimestamp,
                UpdatedAt = SeedTimestamp
            }
        );
    }
}
