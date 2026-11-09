using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StrataHu.Api.Data;
using StrataHu.Api.DTOs;
using StrataHu.Api.Models;
using StrataHu.Api.Services;

var builder = WebApplication.CreateBuilder(args);

// ============================================================================
// 1. Database Configuration (PostgreSQL + EF Core)
// ============================================================================
var connectionString = Environment.GetEnvironmentVariable("DATABASE_URL")
    ?? builder.Configuration.GetConnectionString("DefaultConnection");

if (string.IsNullOrWhiteSpace(connectionString))
{
    connectionString = "Host=localhost;Port=5432;Database=stratahu;Username=stratahu;Password=stratahu_local_dev";
}

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(connectionString, npgsql =>
    {
        npgsql.MigrationsAssembly(typeof(AppDbContext).Assembly.FullName);
        npgsql.EnableRetryOnFailure(maxRetryCount: 3);
    }));

// ============================================================================
// 2. CORS Configuration (Environment Variable + Local Vite & Vercel Domains)
// ============================================================================
const string CorsPolicyName = "StrataHuFrontendPolicy";

var configuredOrigins = builder.Configuration
    .GetSection("Cors:AllowedOrigins")
    .Get<string[]>() ?? [];

var envOriginsRaw = Environment.GetEnvironmentVariable("CORS_ALLOWED_ORIGINS") ?? string.Empty;
var vercelDomainRaw = Environment.GetEnvironmentVariable("VERCEL_FRONTEND_URL") ?? string.Empty;

var allowedOrigins = configuredOrigins
    .Concat(envOriginsRaw.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
    .Concat(vercelDomainRaw.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
    .Concat(
    [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:4173"
    ])
    .Select(origin => origin.TrimEnd('/'))
    .Where(origin => !string.IsNullOrWhiteSpace(origin))
    .Distinct(StringComparer.OrdinalIgnoreCase)
    .ToArray();

builder.Services.AddCors(options =>
{
    options.AddPolicy(CorsPolicyName, policy =>
    {
        policy
            .WithOrigins(allowedOrigins)
            .AllowAnyHeader()
            .WithMethods("GET", "POST", "DELETE", "OPTIONS");
    });
});

// ============================================================================
// 3. Services & Serialization
// ============================================================================
builder.Services.AddHttpClient<IDiscordWebhookService, DiscordWebhookService>(client =>
{
    client.Timeout = TimeSpan.FromSeconds(10);
});

builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
});

var app = builder.Build();

// Automatically apply EF Core migrations & seed initial showcase data when enabled
var autoMigrate = Environment.GetEnvironmentVariable("AUTO_APPLY_MIGRATIONS");
if (app.Environment.IsDevelopment() ||
    string.Equals(autoMigrate, "true", StringComparison.OrdinalIgnoreCase))
{
    using var scope = app.Services.CreateScope();
    var logger = scope.ServiceProvider.GetRequiredService<ILoggerFactory>().CreateLogger("StartupMigration");
    try
    {
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await db.Database.MigrateAsync();
        await DatabaseSeeder.SeedAsync(db);
    }
    catch (Exception ex)
    {
        logger.LogWarning(
            ex,
            "Database migration or seeding skipped at startup (PostgreSQL may not be reachable yet).");
    }
}

app.UseCors(CorsPolicyName);

// ============================================================================
// 4. Minimal API Endpoints
// ============================================================================
var api = app.MapGroup("/api");

api.MapGet("/health", async (AppDbContext db, CancellationToken ct) =>
{
    var dbHealthy = await db.Database.CanConnectAsync(ct);
    return Results.Ok(new
    {
        status = dbHealthy ? "Healthy" : "Degraded",
        database = dbHealthy ? "Connected" : "Unreachable",
        timestampUtc = DateTimeOffset.UtcNow
    });
});

// GET /api/projects: Return active projects with optional search and tag filters
api.MapGet("/projects", async (
    [AsParameters] ProjectQueryFilter filter,
    AppDbContext db,
    CancellationToken ct) =>
{
    var query = db.Projects
        .AsNoTracking()
        .Where(p => p.IsActive);

    var activeProjects = await query
        .OrderByDescending(p => p.CreatedAtUtc)
        .ToListAsync(ct);

    IEnumerable<Project> filtered = activeProjects;

    if (!string.IsNullOrWhiteSpace(filter.Tag))
    {
        var requestedTag = filter.Tag.Trim();
        filtered = filtered.Where(p =>
            p.TechStack.Any(t => string.Equals(t, requestedTag, StringComparison.OrdinalIgnoreCase)));
    }

    if (!string.IsNullOrWhiteSpace(filter.Search))
    {
        var term = filter.Search.Trim();
        filtered = filtered.Where(p =>
            p.Name.Contains(term, StringComparison.OrdinalIgnoreCase) ||
            p.Description.Contains(term, StringComparison.OrdinalIgnoreCase) ||
            p.AuthorHandle.Contains(term, StringComparison.OrdinalIgnoreCase) ||
            p.TechStack.Any(t => t.Contains(term, StringComparison.OrdinalIgnoreCase)));
    }

    var response = filtered
        .Select(ProjectResponse.FromEntity)
        .ToList();

    return Results.Ok(response);
});

// POST /api/projects: Validate submission inputs, store in PostgreSQL, send Discord embed, return record
api.MapPost("/projects", async (
    [FromBody] SubmissionRequest request,
    AppDbContext db,
    IDiscordWebhookService discordWebhook,
    CancellationToken ct) =>
{
    if (!request.TryValidate(out var validationErrors))
    {
        return Results.ValidationProblem(validationErrors);
    }

    var normalizedHandle = request.AuthorHandle.Trim();
    if (!normalizedHandle.StartsWith('@'))
    {
        normalizedHandle = $"@{normalizedHandle}";
    }

    var project = new Project
    {
        Id = Guid.NewGuid(),
        Name = request.Name.Trim(),
        Description = request.Description.Trim(),
        LongDescription = string.IsNullOrWhiteSpace(request.LongDescription) ? null : request.LongDescription.Trim(),
        Category = string.IsNullOrWhiteSpace(request.Category) ? "Fejlesztői eszközök" : request.Category.Trim(),
        ImageUrl = string.IsNullOrWhiteSpace(request.ImageUrl) ? null : request.ImageUrl.Trim(),
        Tier = "A",
        AuthorHandle = normalizedHandle,
        ContactInfo = request.ContactInfo.Trim(),
        TechStack = request.NormalizeTechStack(),
        RepositoryUrl = request.RepositoryUrl.Trim(),
        LiveDemoUrl = string.IsNullOrWhiteSpace(request.LiveDemoUrl) ? null : request.LiveDemoUrl.Trim(),
        IsActive = true,
        CreatedAtUtc = DateTimeOffset.UtcNow
    };

    db.Projects.Add(project);
    await db.SaveChangesAsync(ct);

    await discordWebhook.SendProjectSubmissionAsync(project, ct);

    var responseDto = ProjectResponse.FromEntity(project);
    return Results.Created($"/api/projects/{project.Id}", responseDto);
});

// POST /api/projects/{id}/takedown: Persist a takedown notice for manual audit
api.MapPost("/projects/{id:guid}/takedown", async (
    Guid id,
    [FromBody] TakedownRequest request,
    AppDbContext db,
    IDiscordWebhookService discordWebhook,
    CancellationToken ct) =>
{
    if (!request.TryValidate(out var validationErrors))
    {
        return Results.ValidationProblem(validationErrors);
    }

    var project = await db.Projects.FirstOrDefaultAsync(p => p.Id == id, ct);
    if (project is null)
    {
        return Results.NotFound(new { message = $"Project with ID '{id}' was not found." });
    }

    var takedownLog = new TakedownLog
    {
        Id = Guid.NewGuid(),
        ProjectId = project.Id,
        RequesterContact = request.RequesterContact.Trim(),
        Reason = request.Reason.Trim(),
        Status = "PendingAudit",
        RequestedAtUtc = DateTimeOffset.UtcNow
    };

    db.TakedownLogs.Add(takedownLog);
    await db.SaveChangesAsync(ct);

    await discordWebhook.SendTakedownAlertAsync(project, takedownLog, ct);

    var response = new TakedownResponse(
        takedownLog.Id,
        project.Id,
        takedownLog.Status,
        takedownLog.RequestedAtUtc,
        "Takedown request registered for audit. Removal requests from verified creators are executed within 24 hours."
    );

    return Results.Accepted($"/api/projects/{project.Id}/takedown/{takedownLog.Id}", response);
});

// DELETE /api/projects/{id}: Soft delete or remove project record with API key protection
api.MapDelete("/projects/{id:guid}", async (
    Guid id,
    [FromQuery] bool? hard,
    HttpContext httpContext,
    AppDbContext db,
    CancellationToken ct) =>
{
    var configuredApiKey = Environment.GetEnvironmentVariable("ADMIN_API_KEY");
    if (string.IsNullOrWhiteSpace(configuredApiKey))
    {
        return Results.Problem(
            title: "Admin API key is not configured on the server.",
            statusCode: StatusCodes.Status503ServiceUnavailable);
    }

    if (!httpContext.Request.Headers.TryGetValue("X-Admin-Api-Key", out var providedHeader) ||
        string.IsNullOrWhiteSpace(providedHeader))
    {
        return Results.Unauthorized();
    }

    var expectedBytes = Encoding.UTF8.GetBytes(configuredApiKey);
    var providedBytes = Encoding.UTF8.GetBytes(providedHeader.ToString());

    if (!CryptographicOperations.FixedTimeEquals(expectedBytes, providedBytes))
    {
        return Results.Unauthorized();
    }

    var project = await db.Projects.FirstOrDefaultAsync(p => p.Id == id, ct);
    if (project is null)
    {
        return Results.NotFound(new { message = $"Project with ID '{id}' was not found." });
    }

    if (hard == true)
    {
        db.Projects.Remove(project);
    }
    else
    {
        project.IsActive = false;
        project.DeletedAtUtc = DateTimeOffset.UtcNow;
    }

    await db.SaveChangesAsync(ct);
    return Results.NoContent();
});

app.Run();
