using System.Net.Http.Json;
using System.Text.Json.Serialization;
using StrataHu.Api.Models;

namespace StrataHu.Api.Services;

public interface IDiscordWebhookService
{
    Task SendProjectSubmissionAsync(Project project, CancellationToken cancellationToken = default);
    Task SendTakedownAlertAsync(Project project, TakedownLog takedownLog, CancellationToken cancellationToken = default);
}

public sealed class DiscordWebhookService(
    HttpClient httpClient,
    ILogger<DiscordWebhookService> logger
) : IDiscordWebhookService
{
    private const string WebhookEnvVarName = "DISCORD_WEBHOOK_URL";

    public async Task SendProjectSubmissionAsync(Project project, CancellationToken cancellationToken = default)
    {
        var webhookUrl = Environment.GetEnvironmentVariable(WebhookEnvVarName);
        if (string.IsNullOrWhiteSpace(webhookUrl))
        {
            logger.LogWarning(
                "Environment variable {EnvVar} is not set. Skipping Discord notification for project {ProjectId} ({ProjectName}).",
                WebhookEnvVarName,
                project.Id,
                project.Name);
            return;
        }

        if (!Uri.TryCreate(webhookUrl.Trim(), UriKind.Absolute, out var parsedUri) ||
            (parsedUri.Scheme != Uri.UriSchemeHttps && parsedUri.Scheme != Uri.UriSchemeHttp))
        {
            logger.LogError(
                "Environment variable {EnvVar} contains an invalid URI scheme. Skipping Discord notification.",
                WebhookEnvVarName);
            return;
        }

        var tagsFormatted = project.TechStack.Length > 0
            ? string.Join(" · ", project.TechStack.Select(t => $"`{t}`"))
            : "`N/A`";

        var fields = new List<DiscordEmbedField>
        {
            new("Author", project.AuthorHandle, Inline: true),
            new("Repository", $"[Source Code]({project.RepositoryUrl})", Inline: true),
            new(
                "Live Demo",
                string.IsNullOrWhiteSpace(project.LiveDemoUrl)
                    ? "Not provided"
                    : $"[Open Live Demo]({project.LiveDemoUrl})",
                Inline: true),
            new("Tech Stack", tagsFormatted, Inline: false),
            new("Project ID", $"`{project.Id}`", Inline: false)
        };

        var payload = new DiscordWebhookPayload(
            Username: "StrataHu Directory Bot",
            Content: "🚀 **New Hungarian Developer Project Submitted to StrataHu**",
            Embeds:
            [
                new DiscordEmbed(
                    Title: project.Name,
                    Description: project.Description,
                    Url: project.RepositoryUrl,
                    Color: 0x10B981, // Emerald-500 (#10B981)
                    Timestamp: project.CreatedAtUtc.ToString("O"),
                    Footer: new DiscordEmbedFooter("StrataHu Showcase Platform • Moderation Audit Enabled"),
                    Fields: fields
                )
            ]
        );

        await PostPayloadAsync(parsedUri, payload, project.Id, cancellationToken);
    }

    public async Task SendTakedownAlertAsync(
        Project project,
        TakedownLog takedownLog,
        CancellationToken cancellationToken = default)
    {
        var webhookUrl = Environment.GetEnvironmentVariable(WebhookEnvVarName);
        if (string.IsNullOrWhiteSpace(webhookUrl) ||
            !Uri.TryCreate(webhookUrl.Trim(), UriKind.Absolute, out var parsedUri))
        {
            return;
        }

        var payload = new DiscordWebhookPayload(
            Username: "StrataHu Moderation Bot",
            Content: "⚠️ **Takedown Request Logged (24h SLA)**",
            Embeds:
            [
                new DiscordEmbed(
                    Title: $"Takedown Notice: {project.Name}",
                    Description: takedownLog.Reason,
                    Url: project.RepositoryUrl,
                    Color: 0xEF4444, // Red-500 (#EF4444)
                    Timestamp: takedownLog.RequestedAtUtc.ToString("O"),
                    Footer: new DiscordEmbedFooter($"Audit ID: {takedownLog.Id}"),
                    Fields:
                    [
                        new DiscordEmbedField("Project ID", $"`{project.Id}`", Inline: true),
                        new DiscordEmbedField("Requester Contact", takedownLog.RequesterContact, Inline: true),
                        new DiscordEmbedField("Status", takedownLog.Status, Inline: true)
                    ]
                )
            ]
        );

        await PostPayloadAsync(parsedUri, payload, project.Id, cancellationToken);
    }

    private async Task PostPayloadAsync(
        Uri webhookUri,
        DiscordWebhookPayload payload,
        Guid projectId,
        CancellationToken cancellationToken)
    {
        try
        {
            using var response = await httpClient.PostAsJsonAsync(webhookUri, payload, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                var errorBody = await response.Content.ReadAsStringAsync(cancellationToken);
                logger.LogWarning(
                    "Discord webhook returned non-success status {StatusCode} for project {ProjectId}: {ResponseBody}",
                    (int)response.StatusCode,
                    projectId,
                    errorBody);
            }
        }
        catch (Exception ex)
        {
            logger.LogError(
                ex,
                "Failed to dispatch Discord webhook notification for project {ProjectId}.",
                projectId);
        }
    }

    private sealed record DiscordWebhookPayload(
        [property: JsonPropertyName("username")] string Username,
        [property: JsonPropertyName("content")] string Content,
        [property: JsonPropertyName("embeds")] IReadOnlyList<DiscordEmbed> Embeds
    );

    private sealed record DiscordEmbed(
        [property: JsonPropertyName("title")] string Title,
        [property: JsonPropertyName("description")] string Description,
        [property: JsonPropertyName("url")] string Url,
        [property: JsonPropertyName("color")] int Color,
        [property: JsonPropertyName("timestamp")] string Timestamp,
        [property: JsonPropertyName("footer")] DiscordEmbedFooter Footer,
        [property: JsonPropertyName("fields")] IReadOnlyList<DiscordEmbedField> Fields
    );

    private sealed record DiscordEmbedFooter(
        [property: JsonPropertyName("text")] string Text
    );

    private sealed record DiscordEmbedField(
        [property: JsonPropertyName("name")] string Name,
        [property: JsonPropertyName("value")] string Value,
        [property: JsonPropertyName("inline")] bool Inline
    );
}
