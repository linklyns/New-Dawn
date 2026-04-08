using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using New_Dawn.Data;
using New_Dawn.Data.SeedData;
using New_Dawn.Middleware;
using New_Dawn.Models;
using New_Dawn.Services;

LoadDotEnv();

// Allow DateTime with Kind=Unspecified to be sent to PostgreSQL timestamptz columns
AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddSingleton<CsvPredictionService>();

var allowedOrigins = new List<string>
{
    "http://localhost:5173",
    "https://new-dawn-virid.vercel.app",
    "https://new-dawn.azurewebsites.net",
    "https://newdawn-api.azurewebsites.net",
    "https://*.azurestaticapps.net"
};

var configuredOrigins = Environment.GetEnvironmentVariable("ALLOWED_ORIGINS");
if (!string.IsNullOrWhiteSpace(configuredOrigins))
{
    var parsedOrigins = configuredOrigins
        .Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries);
    allowedOrigins.AddRange(parsedOrigins);
}

var extraOrigin = Environment.GetEnvironmentVariable("ALLOWED_ORIGIN");
if (!string.IsNullOrWhiteSpace(extraOrigin))
{
    allowedOrigins.Add(extraOrigin.Trim());
}

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins(allowedOrigins.ToArray())
            .SetIsOriginAllowedToAllowWildcardSubdomains()
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

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(connectionString, npgsqlOptions =>
        npgsqlOptions
            .CommandTimeout(120)
            .EnableRetryOnFailure(
                maxRetryCount: 5,
                maxRetryDelay: TimeSpan.FromSeconds(10),
                errorCodesToAdd: null))
        .ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.RelationalEventId.PendingModelChangesWarning)));

// ASP.NET Identity
builder.Services.AddIdentity<ApplicationUser, IdentityRole>(options =>
{
    options.Password.RequiredLength = 16;
    options.Password.RequireDigit = false;
    options.Password.RequireLowercase = false;
    options.Password.RequireUppercase = false;
    options.Password.RequireNonAlphanumeric = false;
    options.Password.RequiredUniqueChars = 1;
})
.AddEntityFrameworkStores<AppDbContext>()
.AddDefaultTokenProviders();

// JWT Authentication
var jwtSecret = Environment.GetEnvironmentVariable("JWT_SECRET")
    ?? "YourSuperSecretKeyThatIsAtLeast32CharactersLong";

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = false,
        ValidateAudience = false,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret))
    };
});

var app = builder.Build();

var runDbInitOnStartup = builder.Configuration.GetValue("RUN_DB_INIT_ON_STARTUP", false);
if (runDbInitOnStartup)
{
    _ = Task.Run(async () =>
    {
        try
        {
            using var scope = app.Services.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
            var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole>>();

            await context.Database.MigrateAsync();

            // Enable RLS on all public tables so Supabase PostgREST can't bypass app-level auth.
            // The postgres connection role bypasses RLS, so the .NET backend is unaffected.
            await context.Database.ExecuteSqlRawAsync("""
                DO $$
                DECLARE t text;
                BEGIN
                  FOR t IN
                    SELECT quote_ident(tablename)
                    FROM pg_tables
                    WHERE schemaname = 'public'
                      AND NOT rowsecurity
                  LOOP
                    EXECUTE format('ALTER TABLE public.%s ENABLE ROW LEVEL SECURITY', t);
                  END LOOP;
                END $$;
                """);

            await CsvSeeder.SeedAsync(context, userManager, roleManager,
                Path.Combine(app.Environment.ContentRootPath, "..", "..", "..", "lighthouse_csv_v7"));
        }
        catch (Exception ex)
        {
            app.Logger.LogError(ex, "Database initialization failed during background startup task.");
        }
    });
}

if (app.Environment.IsProduction())
{
    app.UseHsts();
}

app.UseMiddleware<CspMiddleware>();
app.UseHttpsRedirection();
app.UseCors("AllowFrontend");

app.UseSwagger();
app.UseSwaggerUI();

app.UseAuthentication();
app.UseAuthorization();
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
