using System.Reflection;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using StrataHu.Api.Models;

namespace StrataHu.Api.Data;

public static class DatabaseSeeder
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    public static async Task SeedAsync(AppDbContext dbContext, CancellationToken cancellationToken = default)
    {
        if (await dbContext.Projects.AnyAsync(cancellationToken))
        {
            return;
        }

        var projects = await LoadEmbeddedProjectsAsync(cancellationToken);
        if (projects.Count == 0)
        {
            return;
        }

        foreach (var project in projects)
        {
            if (string.IsNullOrWhiteSpace(project.ContactInfo))
            {
                project.ContactInfo = project.AuthorHandle;
            }
            project.IsActive = true;
        }

        await dbContext.Projects.AddRangeAsync(projects, cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);
    }

    private static async Task<List<Project>> LoadEmbeddedProjectsAsync(CancellationToken cancellationToken)
    {
        var assembly = Assembly.GetExecutingAssembly();
        
        // Try embedded resource stream first
        const string resourceName = "StrataHu.Api.Data.projects.json";
        await using var stream = assembly.GetManifestResourceStream(resourceName);
        if (stream != null)
        {
            var parsed = await JsonSerializer.DeserializeAsync<List<Project>>(stream, JsonOptions, cancellationToken);
            if (parsed != null && parsed.Count > 0)
            {
                return parsed;
            }
        }

        // Fallback to disk file if running in local development
        var candidatePaths = new[]
        {
            Path.Combine(AppContext.BaseDirectory, "Data", "projects.json"),
            Path.Combine(AppContext.BaseDirectory, "projects.json"),
            Path.Combine(Directory.GetCurrentDirectory(), "Data", "projects.json")
        };

        foreach (var path in candidatePaths)
        {
            if (File.Exists(path))
            {
                await using var fileStream = File.OpenRead(path);
                var parsed = await JsonSerializer.DeserializeAsync<List<Project>>(fileStream, JsonOptions, cancellationToken);
                if (parsed != null && parsed.Count > 0)
                {
                    return parsed;
                }
            }
        }

        return [];
    }
}
