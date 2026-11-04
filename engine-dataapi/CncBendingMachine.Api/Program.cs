using CncBendingMachine.Api.Hubs;
using CncBendingMachine.Api.Services;
using CncBendingMachine.Application;
using CncBendingMachine.Application.Services;
using CncBendingMachine.Core.Interfaces;
using CncBendingMachine.Infrastructure.DataApiClient;
using CncBendingMachine.Infrastructure.Driver;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new Microsoft.OpenApi.Models.OpenApiInfo
    {
        Title = "CNC Bending Machine API",
        Version = "v1",
        Description = "API for controlling CNC profile bending machine"
    });
});

// Add SignalR
builder.Services.AddSignalR();

// Add CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowWebUI", policy =>
    {
        policy.WithOrigins("http://localhost:5001", "https://localhost:5001", "http://localhost:3000", "http://localhost:5173")
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials();
    });
});

// ============================================================
// REPOSITORY REGISTRATION (DataApi-backed, HTTP)
// ============================================================
// Bending API artik DB'ye direkt erismiyor — tum DB islemleri DataApi (5002) uzerinden
builder.Services.AddScoped<IMachineSettingsRepository, DataApiMachineSettingsRepository>();
builder.Services.AddScoped<IServiceRepository, DataApiServiceRepository>();

// ============================================================
// DATAAPI CLIENT (HTTP) — Faz 3'te kayitli, Faz 4'te tuketim baslayacak
// ============================================================

var dataApiBaseUrl = builder.Configuration.GetValue<string>("DataApi:BaseUrl")
    ?? "http://localhost:5002";

builder.Services.AddHttpClient<IDataApiClient, DataApiClient>(client =>
{
    client.BaseAddress = new Uri(dataApiBaseUrl.TrimEnd('/') + "/");
    client.Timeout = TimeSpan.FromSeconds(30);
});

// ============================================================
// DRIVER LAYER REGISTRATION
// ============================================================

// Register PLC Driver (Singleton - single connection to PLC)
builder.Services.AddSingleton<IPlcDriver>(sp =>
{
    var config = sp.GetRequiredService<IConfiguration>();
    var logger = sp.GetRequiredService<ILogger<IPlcDriver>>();

    var simulationMode = config.GetValue<bool>("Plc:SimulationMode");

    if (simulationMode)
    {
        return new SimulatorPlcDriver(logger);
    }
    else
    {
        var ipAddress = config.GetValue<string>("Plc:IpAddress") ?? "127.0.0.1";
        var port = config.GetValue<int>("Plc:Port", 502);
        var unitId = (byte)config.GetValue<int>("Plc:UnitId", 0);
        return new ModbusPlcDriver(logger, ipAddress, port, unitId);
    }
});

// Register Machine Orchestrator (Singleton - coordinates all machine operations)
// This is the "Driver Layer" that validates commands and manages valve sequences
// Note: Using factory pattern to inject scoped repository into singleton
builder.Services.AddSingleton<IMachineOrchestrator>(sp =>
{
    var logger = sp.GetRequiredService<ILogger<MachineOrchestrator>>();
    var plcDriver = sp.GetRequiredService<IPlcDriver>();

    // Create a scope to get the repository (scoped service from singleton)
    using var scope = sp.CreateScope();
    var repository = scope.ServiceProvider.GetRequiredService<IMachineSettingsRepository>();

    var orchestrator = new MachineOrchestrator(logger, plcDriver, repository);
    // Initialize synchronously (blocking) during startup
    orchestrator.InitializeAsync().GetAwaiter().GetResult();
    return orchestrator;
});

// ============================================================
// APPLICATION LAYER REGISTRATION
// ============================================================

// Add MediatR for CQRS pattern (Commands/Handlers)
builder.Services.AddMediatR(cfg => cfg.RegisterServicesFromAssembly(typeof(ApplicationAssemblyMarker).Assembly));

// Add Bending Calculator service
builder.Services.AddSingleton<IBendingCalculator, BendingCalculator>();

// Add Bending Progress tracking (in-memory, handler yazıyor, SignalR okuyor)
builder.Services.AddSingleton<BendingProgressService>();
builder.Services.AddSingleton<BendingLogService>();

// Add Springback Calculator service (depends on IBendingCalculator)
builder.Services.AddSingleton<ISpringbackCalculator, SpringbackCalculator>();

// ============================================================
// BACKGROUND SERVICES
// ============================================================

// Add background service for state polling
builder.Services.AddHostedService<StatePollingService>();
builder.Services.AddHostedService<BendingLogFlushService>();
builder.Services.AddHostedService<SensorEventPublisher>();

var app = builder.Build();

// Configure the HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "CNC Bending Machine API v1");
        c.RoutePrefix = "swagger";
    });
}

app.UseHttpsRedirection();
app.UseCors("AllowWebUI");
app.UseAuthorization();

app.MapControllers();
app.MapHub<MachineStateHub>("/machineHub");


app.Run();
