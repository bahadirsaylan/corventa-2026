using CncBendingMachine.Core.Interfaces;
using CncBendingMachine.DataApi.Hubs;
using CncBendingMachine.DataApi.Persistence;
using CncBendingMachine.DataApi.Services;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new() { Title = "CncBendingMachine.DataApi", Version = "v1" });
});

var dbPath = Path.Combine(AppContext.BaseDirectory, "machine.db");
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite($"Data Source={dbPath}"));

builder.Services.AddScoped<IMachineSettingsRepository, MachineSettingsRepository>();
builder.Services.AddScoped<IServiceRepository, ServiceRepository>();

// SignalR + Event broadcaster (Faz 6a — sensor-triggered events)
// EventsHub: /corventa (push-only, UI bağlanır — Corventa branding)
// EventBroadcaster: singleton, eventType'a göre last-value cache + IHubContext üzerinden broadcast
builder.Services.AddSignalR();
builder.Services.AddSingleton<IEventBroadcaster, EventBroadcaster>();

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.Migrate();
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.MapControllers();
app.MapHub<EventsHub>("/corventa");

app.Run();
