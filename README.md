# StrataHu

**StrataHu** is an open-source showcase directory and community platform for software projects, libraries, and tools built by Hungarian developers and engineering teams.

Featuring 1,000+ curated Hungarian projects, an interactive **Tier List (S–B)**, **Top 10 Rangsor**, an active **Discord community with agentic AI management**, and instant search & filtering.

- 🌐 **Web Platform**: [http://localhost:3000](http://localhost:3000) (stratahu.dev)
- 💬 **Discord Community (Permanent Invite)**: [https://discord.gg/kNt5sqzM6w](https://discord.gg/kNt5sqzM6w)
- 🐙 **GitHub Repository**: [https://github.com/CsPS0/StrataHu](https://github.com/CsPS0/StrataHu)

Designed with a high-contrast dark UI, a stateless **Vue 3 + TypeScript + Tailwind CSS** frontend ready for **Vercel**, and a containerized **ASP.NET Core (.NET 10) Minimal API** backend backed by **PostgreSQL** and **Entity Framework Core**.

---

## Architecture Overview

| Layer | Technology | Hosting Target |
| :--- | :--- | :--- |
| **Frontend** | Vue 3 (Composition API), Vite, TypeScript, Tailwind CSS | Vercel (Static SPA) |
| **Backend** | ASP.NET Core (.NET 10) Minimal APIs, C# | Any Linux VPS / Container Host (Docker) |
| **Database** | PostgreSQL 17 + Entity Framework Core Migrations | Managed PostgreSQL or Self-Hosted Container |
| **Notifications** | Discord Webhook Dispatcher (`DISCORD_WEBHOOK_URL`) | Outbound HTTPS from Backend |

---

## Repository Structure

```text
.
├── .gitignore
├── LICENSE
├── README.md
├── docker-compose.yml
├── justfile
├── frontend/
│   ├── .env.example
│   ├── vercel.json
│   └── src/
│       ├── App.vue
│       ├── components/
│       │   ├── Footer.vue
│       │   ├── Header.vue
│       │   ├── ProjectCard.vue
│       │   ├── SearchFilterBar.vue
│       │   └── SubmissionModal.vue
│       └── services/
│           ├── api.ts
│           └── initialProjects.json
├── backend/
│   ├── Dockerfile
│   ├── Program.cs
│   ├── appsettings.json
│   ├── appsettings.Development.json
│   ├── Data/
│   │   ├── DatabaseSeeder.cs
│   │   └── projects.json
│   ├── Models/
│   ├── DTOs/
│   └── Services/
└── discord-bot/
    ├── package.json
    ├── .env.example
    ├── README.md
    └── src/
        ├── bot.ts
        ├── cli.ts
        ├── config.ts
        └── setup-server.ts
```

---

## Local Development

### Prerequisites

- **Docker** & **Docker Compose** (v2+)
- **.NET 10 SDK** (`10.0.x`)
- **Node.js** (v20+ LTS recommended) & **npm**
- **just** (optional command runner for `justfile` recipes)

### 1. Start PostgreSQL & Backend with Docker Compose

From the repository root, launch the database and API containers:

```bash
docker compose up -d --build
```

The backend automatically applies pending Entity Framework Core migrations on startup when running in Development or when `AUTO_APPLY_MIGRATIONS=true`.
The API will be available at `http://localhost:5000`.

> **Tip:** To run only PostgreSQL in Docker and run the .NET 10 API directly on your host with hot reload:
> ```bash
> docker compose up -d postgres
> cd backend
> dotnet watch run
> ```

### 2. Configure & Start the Frontend

Copy the example environment file and start the Vite development server:

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## Environment Variables & Secret Isolation

This repository enforces **strict secret isolation**. Never commit `.env` files, database passwords, API keys, or Discord webhook URLs to source control.

### Backend Environment Variables

| Variable | Required | Description |
| :--- | :---: | :--- |
| `ConnectionStrings__DefaultConnection` | **Yes** | PostgreSQL connection string (`Host=...;Port=5432;Database=...;Username=...;Password=...`) |
| `CORS_ALLOWED_ORIGINS` | **Yes** | Comma-separated list of allowed frontend origins (e.g., `https://stratahu.vercel.app,http://localhost:5173`) |
| `DISCORD_WEBHOOK_URL` | **Yes** (Prod) | Discord channel webhook URL used to dispatch rich embed notifications on project submission |
| `ADMIN_API_KEY` | **Yes** (Prod) | High-entropy secret required in the `X-Admin-Api-Key` header for `DELETE /api/projects/{id}` |
| `AUTO_APPLY_MIGRATIONS` | No | Set to `true` (default `true`) to apply EF Core migrations automatically on container startup |

### Frontend Environment Variables

| Variable | Required | Description |
| :--- | :---: | :--- |
| `VITE_API_BASE_URL` | **Yes** | Base URL of the StrataHu backend API (e.g., `http://localhost:5000` locally or `https://api.stratahu.dev` in production) |
| `VITE_TAKEDOWN_EMAIL` | No | Moderation contact address used for takedown `mailto:` links (defaults to `moderation@stratahu.dev`) |

---

## API Reference

| Method | Endpoint | Auth | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/projects` | Public | Returns active projects. Supports `?search=<query>` and `?tag=<tag>` query parameters. |
| `POST` | `/api/projects` | Public | Validates and stores a new project submission, then dispatches a Discord embed notification. |
| `POST` | `/api/projects/{id}/takedown` | Public | Records a formal takedown request in `TakedownLogs` for manual audit. |
| `DELETE` | `/api/projects/{id}` | `X-Admin-Api-Key` | Soft-deletes a project record (`?hard=true` for permanent removal). Requires valid `X-Admin-Api-Key` header. |
| `GET` | `/api/health` | Public | Container health check endpoint verifying PostgreSQL connectivity. |

---

## Production Deployment

### 1. Frontend Deployment (Vercel)

1. Import the GitHub repository into **Vercel**.
2. Set the **Root Directory** to `frontend`.
3. Configure the **Build Command** as `npm run build` and **Output Directory** as `dist`.
4. Add the environment variable `VITE_API_BASE_URL` pointing to your production backend HTTPS URL (e.g., `https://api.stratahu.dev`).
5. Deploy. `frontend/vercel.json` is pre-configured to rewrite all SPA routes to `/index.html`.

### 2. Backend Deployment (Linux VPS / Container Host)

1. Build the multi-stage .NET 10 Docker image:
   ```bash
   docker build -t stratahu-api:latest ./backend
   ```
2. Run the container on your VPS (behind Caddy, Nginx, or Traefik with TLS termination):
   ```bash
   docker run -d \
     --name stratahu-api \
     --restart unless-stopped \
     -p 127.0.0.1:5000:8080 \
     -e ASPNETCORE_ENVIRONMENT=Production \
     -e ConnectionStrings__DefaultConnection="Host=your-db-host;Port=5432;Database=stratahu;Username=stratahu_app;Password=YOUR_STRONG_PASSWORD;SslMode=Require" \
     -e CORS_ALLOWED_ORIGINS="https://your-production-domain.vercel.app" \
     -e DISCORD_WEBHOOK_URL="https://discord.com/api/webhooks/YOUR_ID/YOUR_TOKEN" \
     -e ADMIN_API_KEY="YOUR_HIGH_ENTROPY_ADMIN_KEY" \
     stratahu-api:latest
   ```

---

## Discord Community & Local Agent Management

The platform includes an automated Discord community engine in `discord-bot/` powered by **discord.js v14** and **Bun**.

### Commands

```bash
# Provision server categories, channels, permissions, and roles
just discord-setup

# Check bot connectivity, server name, member count, and channel count
just discord-status

# Start the interactive 24/7 Discord bot daemon (slash commands: /projekt, /top10, /uj-bekuldes)
just discord-bot
```

The local agentic AI can directly trigger community announcements and showcase embeds using the CLI:
```bash
cd discord-bot
bun run src/cli.ts announce --title "..." --content "..."
bun run src/cli.ts post-project "Pala"
bun run src/cli.ts post-seed-projects 10
```

---

## Intellectual Property & Takedown Policy

All showcased projects remain the intellectual property of their respective creators. Every project card includes a direct takedown trigger and pre-filled `mailto:` link referencing the project ID and title. Valid takedown requests are executed within **24 hours**.

---

## Contributing

1. **Fork** the repository and create a feature branch (`git checkout -b feat/your-feature`).
2. **Never commit secrets**: Verify that no `.env` files, credentials, or webhook URLs are staged before committing.
3. **Verify builds**: Run `just build` (or build both `backend` and `frontend` manually) and ensure zero compiler or TypeScript errors.
4. **Database changes**: If modifying EF Core entities in `backend/Models`, generate a migration via `just migrate-add <MigrationName>`.
5. Open a **Pull Request** with a clear description of the architectural or UI changes.

---

## License

Released under the [MIT License](./LICENSE).
