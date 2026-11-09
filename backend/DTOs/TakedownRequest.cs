namespace StrataHu.Api.DTOs;

public sealed record TakedownRequest(
    string RequesterContact,
    string Reason
)
{
    public bool TryValidate(out Dictionary<string, string[]> errors)
    {
        errors = new Dictionary<string, string[]>(StringComparer.OrdinalIgnoreCase);

        if (string.IsNullOrWhiteSpace(RequesterContact) || RequesterContact.Trim().Length is < 3 or > 160)
        {
            errors["requesterContact"] = ["Requester contact is required and must be between 3 and 160 characters."];
        }

        if (string.IsNullOrWhiteSpace(Reason) || Reason.Trim().Length is < 10 or > 1500)
        {
            errors["reason"] = ["Takedown reason or ownership statement must be between 10 and 1500 characters."];
        }

        return errors.Count == 0;
    }
}

public sealed record TakedownResponse(
    Guid Id,
    Guid ProjectId,
    string Status,
    DateTimeOffset RequestedAtUtc,
    string Message
);
