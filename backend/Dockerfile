# ============================================================================
# Stage 1: Build & Publish (.NET 10 SDK)
# ============================================================================
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Copy project file and restore dependencies first for optimal layer caching
COPY ["StrataHu.Api.csproj", "./"]
RUN dotnet restore "StrataHu.Api.csproj"

# Copy remaining source files and publish release build
COPY . .
RUN dotnet publish "StrataHu.Api.csproj" \
    --configuration Release \
    --no-restore \
    --output /app/publish \
    /p:UseAppHost=false

# ============================================================================
# Stage 2: Production Runtime (.NET 10 ASP.NET Core Runtime)
# ============================================================================
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app

# Configure container port and non-root execution
ENV ASPNETCORE_URLS=http://+:8080 \
    DOTNET_RUNNING_IN_CONTAINER=true \
    DOTNET_EnableDiagnostics=0

EXPOSE 8080

USER $APP_UID
COPY --from=build /app/publish .

ENTRYPOINT ["dotnet", "StrataHu.Api.dll"]
