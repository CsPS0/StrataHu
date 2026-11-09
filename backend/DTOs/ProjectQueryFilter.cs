namespace StrataHu.Api.DTOs;

public sealed record ProjectQueryFilter(
    string? Search = null,
    string? Tag = null
);
