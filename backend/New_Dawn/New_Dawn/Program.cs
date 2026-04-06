using Microsoft.EntityFrameworkCore;
using New_Dawn.Data;

LoadDotEnv();

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();

var configuredCorsOrigins = builder.Configuration["CORS_ALLOWED_ORIGINS"]?
    .Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries);

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        if (configuredCorsOrigins is { Length: > 0 })
        {
            policy.WithOrigins(configuredCorsOrigins)
                .AllowAnyMethod()
                .AllowAnyHeader();
            return;
        }

        policy.WithOrigins(
                "http://localhost:5173",
                "https://new-dawn-9yrxil3v5-linklyns-projects.vercel.app")
            .AllowAnyMethod()
            .AllowAnyHeader();
    });
});

var connectionString = builder.Configuration.GetConnectionString("Supabase")
    ?? Environment.GetEnvironmentVariable("SUPABASE_CONNECTION_STRING")
    ?? Environment.GetEnvironmentVariable("ConnectionStrings__Supabase")
    ?? Environment.GetEnvironmentVariable("CUSTOMCONNSTR_Supabase")
    ?? Environment.GetEnvironmentVariable("POSTGRESQLCONNSTR_Supabase");

if (string.IsNullOrWhiteSpace(connectionString))
{
    throw new InvalidOperationException(
        "Supabase connection string is missing. Set SUPABASE_CONNECTION_STRING, ConnectionStrings__Supabase, or an App Service connection string named Supabase.");
}

builder.Services.AddDbContext<AppDbContext>(options => options.UseNpgsql(connectionString));

var app = builder.Build();

app.UseHttpsRedirection();
app.UseCors("AllowFrontend");
app.UseAuthorization();
app.MapGet("/", () => Results.Ok(new
{
    success = true,
    message = "New_Dawn API is running.",
    health = "/health/db"
}));
app.MapControllers();

app.Run();

static void LoadDotEnv()
{
    var envPath = Path.Combine(Directory.GetCurrentDirectory(), ".env");

    if (!File.Exists(envPath))
    {
        return;
    }

    foreach (var rawLine in File.ReadLines(envPath))
    {
        var line = rawLine.Trim();

        if (line.Length == 0 || line.StartsWith('#'))
        {
            continue;
        }

        var separatorIndex = line.IndexOf('=');
        if (separatorIndex <= 0)
        {
            continue;
        }

        var key = line[..separatorIndex].Trim();
        var value = line[(separatorIndex + 1)..].Trim();

        if (value.Length >= 2 && value.StartsWith('"') && value.EndsWith('"'))
        {
            value = value[1..^1];
        }

        if (!string.IsNullOrWhiteSpace(key) && string.IsNullOrEmpty(Environment.GetEnvironmentVariable(key)))
        {
            Environment.SetEnvironmentVariable(key, value);
        }
    }
}
