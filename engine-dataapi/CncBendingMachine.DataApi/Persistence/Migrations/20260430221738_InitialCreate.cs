using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace CncBendingMachine.DataApi.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "BendingJobs",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    Status = table.Column<int>(type: "INTEGER", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    StartedAt = table.Column<DateTime>(type: "TEXT", nullable: true),
                    CompletedAt = table.Column<DateTime>(type: "TEXT", nullable: true),
                    ProfileType = table.Column<int>(type: "INTEGER", nullable: false),
                    Direction = table.Column<int>(type: "INTEGER", nullable: false),
                    Method = table.Column<int>(type: "INTEGER", nullable: false),
                    ProfileA = table.Column<double>(type: "REAL", nullable: false),
                    ProfileB = table.Column<double>(type: "REAL", nullable: false),
                    ProfileS = table.Column<double>(type: "REAL", nullable: false),
                    TargetDiameterMm = table.Column<double>(type: "REAL", nullable: false),
                    ProfileH = table.Column<double>(type: "REAL", nullable: true),
                    ProfileG = table.Column<double>(type: "REAL", nullable: true),
                    PartLengthMm = table.Column<double>(type: "REAL", nullable: false),
                    ActiveSensorSide = table.Column<string>(type: "TEXT", maxLength: 10, nullable: false),
                    ValsCode = table.Column<string>(type: "TEXT", maxLength: 50, nullable: true),
                    StepDistanceMm = table.Column<double>(type: "REAL", nullable: false),
                    FirstStepDistanceMm = table.Column<double>(type: "REAL", nullable: true),
                    SafetyMarginMm = table.Column<double>(type: "REAL", nullable: false),
                    ZeroResetDistanceMm = table.Column<double>(type: "REAL", nullable: false),
                    PistonSpeedPercent = table.Column<int>(type: "INTEGER", nullable: false),
                    RotationSpeedPercent = table.Column<int>(type: "INTEGER", nullable: false),
                    SlackDistanceMm = table.Column<double>(type: "REAL", nullable: true),
                    SlackPressureBar = table.Column<int>(type: "INTEGER", nullable: false),
                    ClampPressureBar = table.Column<int>(type: "INTEGER", nullable: false),
                    ToleranceMm = table.Column<double>(type: "REAL", nullable: false),
                    BallDiameterMm = table.Column<double>(type: "REAL", nullable: false),
                    CenterDistanceMm = table.Column<double>(type: "REAL", nullable: false),
                    ThetaDeg = table.Column<double>(type: "REAL", nullable: false),
                    XA1 = table.Column<double>(type: "REAL", nullable: false),
                    YA1 = table.Column<double>(type: "REAL", nullable: false),
                    CalculatedPistonPositionMm = table.Column<double>(type: "REAL", nullable: true),
                    TotalPasos = table.Column<int>(type: "INTEGER", nullable: false),
                    CompletedPasos = table.Column<int>(type: "INTEGER", nullable: false),
                    CurrentPaso = table.Column<int>(type: "INTEGER", nullable: true),
                    MeasuredDiameterMm = table.Column<double>(type: "REAL", nullable: true),
                    FinalLeftPositionMm = table.Column<double>(type: "REAL", nullable: true),
                    FinalRightPositionMm = table.Column<double>(type: "REAL", nullable: true),
                    DurationSeconds = table.Column<double>(type: "REAL", nullable: true),
                    ErrorMessage = table.Column<string>(type: "TEXT", maxLength: 2000, nullable: true),
                    FailedAtPaso = table.Column<int>(type: "INTEGER", nullable: true),
                    OperatorName = table.Column<string>(type: "TEXT", maxLength: 200, nullable: true),
                    Notes = table.Column<string>(type: "TEXT", maxLength: 2000, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BendingJobs", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "BendingLogs",
                columns: table => new
                {
                    Id = table.Column<long>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    BendingJobId = table.Column<int>(type: "INTEGER", nullable: false),
                    Timestamp = table.Column<DateTime>(type: "TEXT", nullable: false),
                    Category = table.Column<string>(type: "TEXT", maxLength: 50, nullable: false),
                    Message = table.Column<string>(type: "TEXT", maxLength: 1000, nullable: false),
                    Value1 = table.Column<double>(type: "REAL", nullable: true),
                    Value2 = table.Column<double>(type: "REAL", nullable: true),
                    Value3 = table.Column<double>(type: "REAL", nullable: true),
                    ValueLabels = table.Column<string>(type: "TEXT", maxLength: 200, nullable: true),
                    IsError = table.Column<bool>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BendingLogs", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "GonyeSettings",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    LeftOffsetMm = table.Column<double>(type: "REAL", nullable: false),
                    RightOffsetMm = table.Column<double>(type: "REAL", nullable: false),
                    UpperOffsetMm = table.Column<double>(type: "REAL", nullable: false),
                    LowerOffsetMm = table.Column<double>(type: "REAL", nullable: false),
                    ReferencePressureBar = table.Column<int>(type: "INTEGER", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GonyeSettings", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "MachineSettings",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    LeftPistonStrokeMm = table.Column<double>(type: "REAL", nullable: false),
                    RightPistonStrokeMm = table.Column<double>(type: "REAL", nullable: false),
                    UpperPistonStrokeMm = table.Column<double>(type: "REAL", nullable: false),
                    LowerPistonStrokeMm = table.Column<double>(type: "REAL", nullable: false),
                    LeftPistonMaxReg = table.Column<int>(type: "INTEGER", nullable: false),
                    RightPistonMaxReg = table.Column<int>(type: "INTEGER", nullable: false),
                    UpperPistonMaxReg = table.Column<int>(type: "INTEGER", nullable: false),
                    LowerPistonMaxReg = table.Column<int>(type: "INTEGER", nullable: false),
                    PneumaticStrokeMm = table.Column<double>(type: "REAL", nullable: false),
                    PneumaticMaxReg = table.Column<int>(type: "INTEGER", nullable: false),
                    RollerDiameterMm = table.Column<double>(type: "REAL", nullable: false),
                    RotationEncoderPpr = table.Column<int>(type: "INTEGER", nullable: false),
                    SafetyMarginMm = table.Column<double>(type: "REAL", nullable: false),
                    ZeroResetDistanceMm = table.Column<double>(type: "REAL", nullable: false),
                    DefaultActiveSensorSide = table.Column<string>(type: "TEXT", nullable: false),
                    DefaultValsCode = table.Column<string>(type: "TEXT", nullable: true),
                    DefaultPistonSpeedPercent = table.Column<int>(type: "INTEGER", nullable: false),
                    DefaultRotationSpeedPercent = table.Column<int>(type: "INTEGER", nullable: false),
                    DefaultToleranceMm = table.Column<double>(type: "REAL", nullable: false),
                    DefaultSafetyMarginMm = table.Column<double>(type: "REAL", nullable: false),
                    DefaultSlackPressureBar = table.Column<int>(type: "INTEGER", nullable: false),
                    DefaultSlackDistanceMm = table.Column<double>(type: "REAL", nullable: false),
                    DefaultClampPressureBar = table.Column<int>(type: "INTEGER", nullable: false),
                    DefaultBallDiameterMm = table.Column<double>(type: "REAL", nullable: false),
                    DefaultCenterDistanceMm = table.Column<double>(type: "REAL", nullable: false),
                    DefaultThetaDeg = table.Column<double>(type: "REAL", nullable: false),
                    DefaultXA1 = table.Column<double>(type: "REAL", nullable: false),
                    DefaultYA1 = table.Column<double>(type: "REAL", nullable: false),
                    SlpisZeroOffsetMm = table.Column<double>(type: "REAL", nullable: false),
                    SlpisLMm = table.Column<double>(type: "REAL", nullable: false),
                    SlpisRulmanCapMm = table.Column<double>(type: "REAL", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MachineSettings", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ServiceRequests",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    Code = table.Column<string>(type: "TEXT", maxLength: 50, nullable: false),
                    CustomerName = table.Column<string>(type: "TEXT", maxLength: 200, nullable: false),
                    CustomerAddress = table.Column<string>(type: "TEXT", maxLength: 500, nullable: false),
                    MachineModel = table.Column<string>(type: "TEXT", maxLength: 100, nullable: false),
                    MachineProductionYear = table.Column<string>(type: "TEXT", maxLength: 20, nullable: false),
                    MachineCode = table.Column<string>(type: "TEXT", maxLength: 100, nullable: false),
                    MachineVeAiCode = table.Column<string>(type: "TEXT", maxLength: 100, nullable: false),
                    TechnicianName = table.Column<string>(type: "TEXT", maxLength: 200, nullable: false),
                    ContactInfo = table.Column<string>(type: "TEXT", maxLength: 500, nullable: true),
                    Purpose = table.Column<int>(type: "INTEGER", nullable: false),
                    Status = table.Column<int>(type: "INTEGER", nullable: false),
                    ProblemDescription = table.Column<string>(type: "TEXT", maxLength: 2000, nullable: true),
                    WorkDoneCodes = table.Column<string>(type: "TEXT", maxLength: 4000, nullable: false),
                    PartsUsedCodes = table.Column<string>(type: "TEXT", maxLength: 4000, nullable: false),
                    MissingPartsCodes = table.Column<string>(type: "TEXT", maxLength: 4000, nullable: false),
                    ReportCode = table.Column<string>(type: "TEXT", maxLength: 50, nullable: true),
                    ConfirmCode = table.Column<string>(type: "TEXT", maxLength: 20, nullable: true),
                    IsConfirmed = table.Column<bool>(type: "INTEGER", nullable: false),
                    Rating = table.Column<int>(type: "INTEGER", nullable: true),
                    RatingNote = table.Column<string>(type: "TEXT", maxLength: 1000, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    StartedAt = table.Column<DateTime>(type: "TEXT", nullable: true),
                    CompletedAt = table.Column<DateTime>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ServiceRequests", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ServiceTickets",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    Code = table.Column<string>(type: "TEXT", maxLength: 50, nullable: false),
                    Type = table.Column<int>(type: "INTEGER", nullable: false),
                    Status = table.Column<int>(type: "INTEGER", nullable: false),
                    Title = table.Column<string>(type: "TEXT", maxLength: 300, nullable: false),
                    Body = table.Column<string>(type: "TEXT", maxLength: 4000, nullable: false),
                    Response = table.Column<string>(type: "TEXT", maxLength: 4000, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    AnsweredAt = table.Column<DateTime>(type: "TEXT", nullable: true),
                    ClosedAt = table.Column<DateTime>(type: "TEXT", nullable: true),
                    CreatedBy = table.Column<string>(type: "TEXT", maxLength: 200, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ServiceTickets", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Stages",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    StageNumber = table.Column<int>(type: "INTEGER", nullable: false),
                    Name = table.Column<string>(type: "TEXT", maxLength: 100, nullable: false),
                    Description = table.Column<string>(type: "TEXT", maxLength: 500, nullable: true),
                    LeftOffsetMm = table.Column<double>(type: "REAL", nullable: false),
                    RightOffsetMm = table.Column<double>(type: "REAL", nullable: false),
                    LowerOffsetMm = table.Column<double>(type: "REAL", nullable: false),
                    IsActive = table.Column<bool>(type: "INTEGER", nullable: false),
                    DisplayOrder = table.Column<int>(type: "INTEGER", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Stages", x => x.Id);
                });

            migrationBuilder.InsertData(
                table: "GonyeSettings",
                columns: new[] { "Id", "CreatedAt", "LeftOffsetMm", "LowerOffsetMm", "ReferencePressureBar", "RightOffsetMm", "UpdatedAt", "UpperOffsetMm" },
                values: new object[] { 1, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), 3.75, 10.5, 70, 3.75, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), 0.0 });

            migrationBuilder.InsertData(
                table: "MachineSettings",
                columns: new[] { "Id", "CreatedAt", "DefaultActiveSensorSide", "DefaultBallDiameterMm", "DefaultCenterDistanceMm", "DefaultClampPressureBar", "DefaultPistonSpeedPercent", "DefaultRotationSpeedPercent", "DefaultSafetyMarginMm", "DefaultSlackDistanceMm", "DefaultSlackPressureBar", "DefaultThetaDeg", "DefaultToleranceMm", "DefaultValsCode", "DefaultXA1", "DefaultYA1", "LeftPistonMaxReg", "LeftPistonStrokeMm", "LowerPistonMaxReg", "LowerPistonStrokeMm", "PneumaticMaxReg", "PneumaticStrokeMm", "RightPistonMaxReg", "RightPistonStrokeMm", "RollerDiameterMm", "RotationEncoderPpr", "SafetyMarginMm", "SlpisLMm", "SlpisRulmanCapMm", "SlpisZeroOffsetMm", "UpdatedAt", "UpperPistonMaxReg", "UpperPistonStrokeMm", "ZeroResetDistanceMm" },
                values: new object[] { 1, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Left", 220.0, 300.81999999999999, 155, 100, 100, 50.0, 0.20000000000000001, 157, 63.0, 0.10000000000000001, null, -493.0, 0.0, 21093, 422.0, 9732, 195.0, 13250, 265.0, 21127, 422.0, 220.0, 1024, 1.0, 70.0, 35.0, 0.0, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), 7981, 161.0, 690.0 });

            migrationBuilder.InsertData(
                table: "Stages",
                columns: new[] { "Id", "CreatedAt", "Description", "DisplayOrder", "IsActive", "LeftOffsetMm", "LowerOffsetMm", "Name", "RightOffsetMm", "StageNumber", "UpdatedAt" },
                values: new object[,]
                {
                    { 1, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Gonye pozisyonu - Küçük kapasite", 1, true, 0.0, 0.0, "Stage 1", 0.0, 1, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { 2, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Orta kapasite", 2, true, 67.340000000000003, 60.0, "Stage 2", 67.340000000000003, 2, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { 3, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Büyük kapasite", 3, true, 134.68000000000001, 120.0, "Stage 3", 134.68000000000001, 3, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) }
                });

            migrationBuilder.CreateIndex(
                name: "IX_BendingJobs_CreatedAt",
                table: "BendingJobs",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_BendingJobs_Status",
                table: "BendingJobs",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_BendingLogs_BendingJobId",
                table: "BendingLogs",
                column: "BendingJobId");

            migrationBuilder.CreateIndex(
                name: "IX_BendingLogs_BendingJobId_Timestamp",
                table: "BendingLogs",
                columns: new[] { "BendingJobId", "Timestamp" });

            migrationBuilder.CreateIndex(
                name: "IX_ServiceRequests_CreatedAt",
                table: "ServiceRequests",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_ServiceRequests_Status",
                table: "ServiceRequests",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_ServiceTickets_CreatedAt",
                table: "ServiceTickets",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_ServiceTickets_Status",
                table: "ServiceTickets",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_ServiceTickets_Type",
                table: "ServiceTickets",
                column: "Type");

            migrationBuilder.CreateIndex(
                name: "IX_Stages_StageNumber",
                table: "Stages",
                column: "StageNumber",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "BendingJobs");

            migrationBuilder.DropTable(
                name: "BendingLogs");

            migrationBuilder.DropTable(
                name: "GonyeSettings");

            migrationBuilder.DropTable(
                name: "MachineSettings");

            migrationBuilder.DropTable(
                name: "ServiceRequests");

            migrationBuilder.DropTable(
                name: "ServiceTickets");

            migrationBuilder.DropTable(
                name: "Stages");
        }
    }
}
