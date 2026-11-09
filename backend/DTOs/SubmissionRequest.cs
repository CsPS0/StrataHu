namespace StrataHu.Api.DTOs;

public sealed record SubmissionRequest(
    string Name,
    string Description,
    string AuthorHandle,
    string ContactInfo,
    IReadOnlyList<string> TechStack,
    string RepositoryUrl,
    string? LiveDemoUrl = null,
    string? LongDescription = null,
    string? Category = null,
    string? ImageUrl = null
)
{
    public bool TryValidate(out Dictionary<string, string[]> errors)
    {
        errors = new Dictionary<string, string[]>(StringComparer.OrdinalIgnoreCase);

        if (string.IsNullOrWhiteSpace(Name) || Name.Trim().Length is < 2 or > 120)
        {
            errors["name"] = ["A projekt neve kötelező (2–120 karakter)."];
        }

        if (string.IsNullOrWhiteSpace(Description) || Description.Trim().Length is < 10 or > 600)
        {
            errors["description"] = ["A rövid leírás kötelező (10–600 karakter)."];
        }

        if (!string.IsNullOrWhiteSpace(LongDescription) && LongDescription.Trim().Length > 2400)
        {
            errors["longDescription"] = ["A részletes bemutatás legfeljebb 2400 karakter lehet."];
        }

        if (string.IsNullOrWhiteSpace(AuthorHandle) || AuthorHandle.Trim().Length is < 2 or > 80)
        {
            errors["authorHandle"] = ["A készítő azonosítója kötelező (2–80 karakter)."];
        }

        if (string.IsNullOrWhiteSpace(ContactInfo) || ContactInfo.Trim().Length is < 3 or > 160)
        {
            errors["contactInfo"] = ["A kapcsolattartási elérhetőség kötelező (3–160 karakter)."];
        }

        var normalizedTags = NormalizeTechStack();
        if (normalizedTags.Length == 0 || normalizedTags.Length > 12)
        {
            errors["techStack"] = ["Legalább 1 és legfeljebb 12 technológiai címkét adj meg."];
        }

        if (!IsValidHttpUrl(RepositoryUrl))
        {
            errors["repositoryUrl"] = ["A forráskód URL-nek érvényes HTTP vagy HTTPS címnek kell lennie."];
        }

        if (!string.IsNullOrWhiteSpace(LiveDemoUrl) && !IsValidHttpUrl(LiveDemoUrl))
        {
            errors["liveDemoUrl"] = ["Az élő demó linknek érvényes HTTP vagy HTTPS címnek kell lennie."];
        }

        if (!string.IsNullOrWhiteSpace(ImageUrl) && !IsValidHttpUrl(ImageUrl))
        {
            errors["imageUrl"] = ["Az előnézeti kép URL-nek érvényes HTTP vagy HTTPS címnek kell lennie."];
        }

        return errors.Count == 0;
    }

    public string[] NormalizeTechStack()
    {
        if (TechStack is null || TechStack.Count == 0)
        {
            return [];
        }

        return TechStack
            .SelectMany(tag => tag.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
            .Select(tag => tag.Trim())
            .Where(tag => tag.Length is >= 1 and <= 40)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .Take(12)
            .ToArray();
    }

    private static bool IsValidHttpUrl(string? rawUrl)
    {
        if (string.IsNullOrWhiteSpace(rawUrl) || rawUrl.Trim().Length > 500)
        {
            return false;
        }

        return Uri.TryCreate(rawUrl.Trim(), UriKind.Absolute, out var uri)
            && (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps)
            && !string.IsNullOrWhiteSpace(uri.Host);
    }
}
