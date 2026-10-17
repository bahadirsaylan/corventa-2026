using CncBendingMachine.Web.Services;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddRazorPages();
builder.Services.AddServerSideBlazor();

// Configure HTTP client for API
// Timeout: Gönye işlemi ~90 saniye sürebilir (pistonlar geri çek + encoder reset + pozisyona git)
var apiBaseUrl = builder.Configuration["Api:BaseUrl"] ?? "http://localhost:5000";
builder.Services.AddHttpClient<MachineApiClient>(client =>
{
    client.BaseAddress = new Uri(apiBaseUrl);
    client.Timeout = TimeSpan.FromSeconds(120); // 2 dakika - uzun süren işlemler için
});

// Register SignalR state service as singleton
builder.Services.AddSingleton<MachineStateService>();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Error");
}

app.UseStaticFiles();
app.UseRouting();

app.MapBlazorHub();
app.MapFallbackToPage("/_Host");

// Start SignalR connection on startup
var stateService = app.Services.GetRequiredService<MachineStateService>();
_ = stateService.StartAsync();

app.Run();
