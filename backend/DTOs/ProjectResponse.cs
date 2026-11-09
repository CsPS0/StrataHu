using StrataHu.Api.Models;

namespace StrataHu.Api.DTOs;

public sealed record ProjectResponse(
    Guid Id,
    string Name,
    string Description,
    string? LongDescription,
    string Category,
    string? ImageUrl,
    string Tier,
    int? Rank,
    string? Verdict,
    string AuthorHandle,
    IReadOnlyList<string> TechStack,
    string RepositoryUrl,
    string? LiveDemoUrl,
    DateTimeOffset CreatedAtUtc
)
{
    public static ProjectResponse FromEntity(Project project) => new(
        project.Id,
        project.Name,
        project.Description,
        project.LongDescription,
        project.Category,
        project.ImageUrl,
        project.Tier,
        project.Rank,
        project.Verdict,
        project.AuthorHandle,
        project.TechStack,
        project.RepositoryUrl,
        project.LiveDemoUrl,
        project.CreatedAtUtc
    );
}
