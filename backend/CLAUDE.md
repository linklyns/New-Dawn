# Backend Instructions

## Structure
```
backend/New_Dawn/New_Dawn/
  Program.cs              # Entry point, service registration, middleware
  Models/                 # EF Core entity models
  Controllers/            # API controllers
  Data/                   # AppDbContext, seed data, migrations
  Middleware/             # CSP, sanitization
  DTOs/                   # Request/response DTOs
  Services/               # Business logic, external API wrappers
```

## Entity Model Pattern
```csharp
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace New_Dawn.Models;

[Table("table_name", Schema = "public")]
public class ModelName
{
    [Key]
    [Column("id_column")]
    public int Id { get; set; }

    [Column("snake_case_column")]
    public string PropertyName { get; set; } = string.Empty;

    // Nullable fields
    [Column("nullable_column")]
    public string? NullableProperty { get; set; }

    // FK navigation
    [ForeignKey("ParentId")]
    public Parent? Parent { get; set; }
}
```

## Controller Pattern
```csharp
[ApiController]
[Route("api/[controller]")]
public class FoosController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] int page = 1, [FromQuery] int pageSize = 20) { }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id) { }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Create([FromBody] Foo foo) { }

    [HttpPut("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Update(int id, [FromBody] Foo foo) { }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id, [FromQuery] bool confirm = false) { }
}
```

## Database
- PostgreSQL via Supabase
- Connection string from .env: SUPABASE_CONNECTION_STRING
- AppDbContext inherits IdentityDbContext<ApplicationUser>
- Use EF Core migrations (not raw SQL)

## Auth
- ASP.NET Identity with custom PasswordOptions
- JWT tokens (secret from JWT_SECRET env var)
- Roles: Admin, Donor
- Google OAuth (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET)

## NuGet Packages
- Microsoft.EntityFrameworkCore 9.0.10
- Npgsql.EntityFrameworkCore.PostgreSQL 9.0.4
- Microsoft.AspNetCore.Identity.EntityFrameworkCore
- Microsoft.AspNetCore.Authentication.JwtBearer
- CsvHelper
