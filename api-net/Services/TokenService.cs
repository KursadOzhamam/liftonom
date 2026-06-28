using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using LiftOtonom.Api.Models;
using Microsoft.IdentityModel.Tokens;

namespace LiftOtonom.Api.Services;

public class TokenService(IConfiguration config)
{
    public string Create(User user)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(JwtKey(config)));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim("uid", user.Id.ToString()),
            new Claim("tid", user.TenantId.ToString()),
            new Claim(ClaimTypes.Role, user.Role),
            new Claim(ClaimTypes.Name, user.Phone),
        };

        var token = new JwtSecurityToken(
            issuer: "LiftOtonom",
            audience: "LiftOtonom",
            claims: claims,
            expires: DateTime.UtcNow.AddDays(30),
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public string CreateAdmin(Models.PlatformAdmin admin)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(JwtKey(config)));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var claims = new[]
        {
            new Claim("aid", admin.Id.ToString()),
            new Claim("scope", "admin"),
            new Claim(ClaimTypes.Name, admin.Email),
        };
        var token = new JwtSecurityToken("LiftOtonom", "LiftOtonom", claims,
            expires: DateTime.UtcNow.AddDays(7), signingCredentials: creds);
        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public static string JwtKey(IConfiguration config) =>
        config["Jwt:Key"] ?? "liftotonom-dev-secret-key-change-in-production-please-1234567890";
}
