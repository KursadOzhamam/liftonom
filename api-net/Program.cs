using System.Text;
using System.Text.Json;
using LiftOtonom.Api.Data;
using LiftOtonom.Api.Middleware;
using LiftOtonom.Api.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

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
builder.Services.AddScoped<ISmsSender, LogSmsSender>();

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
builder.Services.AddAuthorization();

// CORS — geliştirmede tüm origin'lere izin (Next.js farklı port)
builder.Services.AddCors(o => o.AddDefaultPolicy(p =>
    p.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod()));

var app = builder.Build();

app.UseMiddleware<ExceptionMiddleware>();
app.UseCors();
app.UseAuthentication();
app.UseMiddleware<TenantMiddleware>(); // auth'tan SONRA: claim'ler hazır
app.UseAuthorization();
app.MapControllers();

app.Run();
