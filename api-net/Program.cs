using System.Text;
using System.Text.Json;
using LiftOtonom.Api.Data;
using LiftOtonom.Api.Middleware;
using LiftOtonom.Api.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

QuestPDF.Settings.License = QuestPDF.Infrastructure.LicenseType.Community;

var builder = WebApplication.CreateBuilder(args);

// JSON: tüm anahtarlar snake_case (Laravel/frontend ile uyumlu)
builder.Services.AddControllers().AddJsonOptions(o =>
{
    o.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower;
    o.JsonSerializerOptions.DictionaryKeyPolicy = JsonNamingPolicy.SnakeCaseLower;
});

// EF Core + PostgreSQL + snake_case (mevcut tablolara eşlenir)
builder.Services.AddDbContext<AppDbContext>(opt =>
    opt.UseNpgsql(builder.Configuration.GetConnectionString("Default"))
       .UseSnakeCaseNamingConvention());

// Servisler
builder.Services.AddScoped<ITenantContext, TenantContext>();
builder.Services.AddScoped<OtpService>();
builder.Services.AddScoped<TokenService>();
builder.Services.AddScoped<LedgerService>();
builder.Services.AddScoped<ScheduledJobs>();
builder.Services.AddScoped<PdfService>();
builder.Services.AddScoped<ISmsSender, LogSmsSender>();
builder.Services.AddScoped<FaultNotificationService>();
builder.Services.AddHttpClient();
// Ödeme: iyzico anahtarı varsa iyzico, yoksa mock
if (!string.IsNullOrEmpty(builder.Configuration["Iyzico:ApiKey"]))
    builder.Services.AddScoped<IPaymentGateway, IyzicoPaymentGateway>();
else
    builder.Services.AddScoped<IPaymentGateway, MockPaymentGateway>();
// WhatsApp: token varsa Meta Cloud API, yoksa log sürücüsü
if (!string.IsNullOrEmpty(builder.Configuration["WhatsApp:Token"]))
    builder.Services.AddScoped<IWhatsAppSender, MetaWhatsAppSender>();
else
    builder.Services.AddScoped<IWhatsAppSender, LogWhatsAppSender>();
builder.Services.AddHostedService<DailyJobsHostedService>();

// JWT
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(o =>
    {
        o.MapInboundClaims = false; // 'tid','uid' claim adlarını koru (URI'ye eşleme)
        o.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = "LiftOtonom",
            ValidAudience = "LiftOtonom",
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(TokenService.JwtKey(builder.Configuration))),
        };
    });
builder.Services.AddAuthorizationBuilder()
    .AddPolicy("Admin", p => p.RequireClaim("scope", "admin"));

// CORS — geliştirmede tüm origin'lere izin (Next.js farklı port)
builder.Services.AddCors(o => o.AddDefaultPolicy(p =>
    p.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod()));

var app = builder.Build();

// Varsayılan süper admin (idempotent)
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<LiftOtonom.Api.Data.AppDbContext>();
    if (!await db.PlatformAdmins.AnyAsync())
    {
        db.PlatformAdmins.Add(new LiftOtonom.Api.Models.PlatformAdmin
        {
            Name = "Süper Admin",
            Email = "admin@liftotonom.com",
            Password = BCrypt.Net.BCrypt.HashPassword("admin123"),
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        });
        await db.SaveChangesAsync();
    }
}

app.UseMiddleware<ExceptionMiddleware>();
app.UseCors();
app.UseAuthentication();
app.UseMiddleware<TenantMiddleware>(); // auth'tan SONRA: claim'ler hazır
app.UseAuthorization();
app.MapControllers();

app.Run();
