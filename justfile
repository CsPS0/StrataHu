set shell := ["sh", "-c"]
set windows-shell := ["pwsh.exe", "-NoLogo", "-Command"]
set dotenv-load := true

# Default recipe: list available commands
default:
    @just --list

# ============================================================================
# Local Development
# ============================================================================

# Start PostgreSQL and Backend API via Docker Compose
up:
    docker compose up -d --build

# Stop all running Docker Compose containers
down:
    docker compose down

# Tail logs from Docker Compose services
logs:
    docker compose logs -f

# Run the .NET 10 backend locally with hot reload
dev-backend:
    cd backend && dotnet watch run

# Install frontend dependencies and start Vite dev server
dev-frontend:
    cd frontend && npm install && npm run dev

# ============================================================================
# Database & Entity Framework Core Migrations
# ============================================================================

# Add a new EF Core migration (usage: just migrate-add MigrationName)
migrate-add name:
    cd backend && dotnet ef migrations add {{name}} --output-dir Data/Migrations

# Apply pending EF Core migrations to the configured PostgreSQL database
migrate-up:
    cd backend && dotnet ef database update

# Remove the last unapplied EF Core migration
migrate-remove:
    cd backend && dotnet ef migrations remove

# ============================================================================
# Build & Verification
# ============================================================================

# Build both backend (.NET 10) and frontend (Vue 3 + TypeScript)
build: build-backend build-frontend

# Build the .NET 10 backend in Release mode
build-backend:
    cd backend && dotnet build --configuration Release

# Type-check and build the Vue 3 SPA for production
build-frontend:
    cd frontend && npm ci && npm run build

# Build the production backend Docker image
docker-build:
    docker build -t stratahu-api:latest ./backend

# ============================================================================
# Discord Community Bot & Agent Management
# ============================================================================

# Setup Discord community server structure (channels, roles, rules)
discord-setup:
    cd discord-bot && bun run setup

# Check Discord bot connection and guild status
discord-status:
    cd discord-bot && bun run status

# Start the interactive Discord bot daemon
discord-bot:
    cd discord-bot && bun run start
