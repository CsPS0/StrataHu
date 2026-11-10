import { Colors, type Guild } from 'discord.js';
import {
  createCertifiedDeveloperAccount,
  createProjectRecord,
  db,
  ensureCatalogSeeded,
  findAccountByEmailOrDiscord,
  findAccountByLoginIdentifier,
  getDeveloperById,
  getProjectById,
  isProjectOwner,
  issueSessionToken,
  listActiveProjects,
  markVerificationCodeUsed,
  peekValidVerificationCode,
  recordTakedownNotice,
  updateDeveloperPasswordByDiscordId,
  updateProjectRecord,
  validateProjectPayload,
  verifySessionToken,
  type DeveloperProfile,
  type ProjectInputPayload
} from './database';
import {
  findGuildMemberByIdentifier,
  inspectMemberCertification,
  issueDiscordCodeForMember,
  notifyAuditLog,
  notifyShowcaseNewProject
} from './discord-certification';

function buildCorsHeaders(req: Request): HeadersInit {
  const envOrigins = (process.env.CORS_ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim().replace(/\/+$/, ''))
    .filter(Boolean);

  const allowed = new Set<string>([
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:4173',
    ...envOrigins
  ]);

  const reqOrigin = (req.headers.get('origin') || '').replace(/\/+$/, '');
  const originToEcho = reqOrigin && allowed.has(reqOrigin) ? reqOrigin : 'http://localhost:3000';

  return {
    'Access-Control-Allow-Origin': originToEcho,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin'
  };
}

function jsonResponse(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...buildCorsHeaders(req)
    }
  });
}

function errorResponse(
  req: Request,
  status: number,
  message: string,
  errors?: Record<string, string[]>
): Response {
  return jsonResponse(req, errors ? { message, errors } : { message }, status);
}

async function readJsonBody<T>(req: Request): Promise<T | null> {
  try {
    return (await req.json()) as T;
  } catch {
    return null;
  }
}

function getAuthenticatedDeveloper(req: Request): DeveloperProfile | null {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) return null;
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  return verifySessionToken(match[1].trim());
}

export function startApiServer(getGuild: () => Guild | null) {
  const seededCount = ensureCatalogSeeded();
  console.log(`🗄️  StrataHu SQLite katalógus betöltve (${seededCount} aktív projekt).`);

  const port = Number(process.env.STRATAHU_API_PORT || process.env.API_PORT || '5000');

  const server = Bun.serve({
    port,
    async fetch(req: Request): Promise<Response> {
      if (req.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: buildCorsHeaders(req) });
      }

      const url = new URL(req.url);
      const pathname = url.pathname.replace(/\/+$/, '') || '/';
      const guild = getGuild();

      try {
        // GET /api/health
        if (req.method === 'GET' && pathname === '/api/health') {
          return jsonResponse(req, {
            status: 'Healthy',
            database: 'Connected (SQLite)',
            discordReady: Boolean(guild),
            guildName: guild?.name || null,
            timestampUtc: new Date().toISOString()
          });
        }

        // =====================================================================
        // AUTH ROUTES
        // =====================================================================

        // POST /api/auth/request-code
        if (req.method === 'POST' && pathname === '/api/auth/request-code') {
          const body = await readJsonBody<{ discordUsername?: string; purpose?: 'register' | 'reset' }>(req);
          const identifier = body?.discordUsername?.trim() || '';
          const purpose: 'register' | 'reset' = body?.purpose === 'reset' ? 'reset' : 'register';

          if (identifier.length < 2) {
            return errorResponse(req, 400, 'Add meg a Discord felhasználóneved vagy Discord ID-dat!');
          }

          if (!guild) {
            return errorResponse(
              req,
              503,
              'A Discord bot kapcsolat még inicializálódik. Próbáld újra pár másodperc múlva, vagy használd a `/fiok` parancsot Discordon.'
            );
          }

          const member = await findGuildMemberByIdentifier(guild, identifier);
          if (!member) {
            return errorResponse(
              req,
              404,
              `Nem található „${identifier}” nevű tag a StrataHu Discord szerveren. Csatlakozz a szerverhez, majd ellenőrizd a pontos Discord felhasználóneved!`
            );
          }

          const existing = findAccountByEmailOrDiscord('', member.id);
          if (purpose === 'register' && existing) {
            return errorResponse(
              req,
              409,
              'Ehhez a Discord profilhoz már létezik webes fiók! Használd a Bejelentkezést vagy az Elfelejtett jelszó funkciót.'
            );
          }
          if (purpose === 'reset' && !existing) {
            return errorResponse(
              req,
              404,
              'Ehhez a Discord profilhoz még nincs regisztrált webes fiók. Válaszd a Regisztráció fület!'
            );
          }

          try {
            const issued = await issueDiscordCodeForMember(guild, member, purpose, true);
            if (!issued.dmDelivered) {
              return errorResponse(
                req,
                422,
                'A Discord adatvédelmi beállításaid tiltják a privát üzeneteket a szerver botjától. Lépj be a Discord szerverre és futtasd bármely szobában a `/fiok` parancsot az azonnali kódhoz!'
              );
            }
            return jsonResponse(req, {
              sent: true,
              discordUsername: issued.cert.discordUsername,
              githubHandle: issued.cert.githubHandle,
              message: `Egyszer használatos kód elküldve a Discord privát üzeneteid (DM) közé (@${issued.cert.discordUsername}).`
            });
          } catch (err: any) {
            return errorResponse(req, 403, err?.message || 'Hiányzó Hitelesített Fejlesztő rang a Discordon.');
          }
        }

        // POST /api/auth/register
        if (req.method === 'POST' && pathname === '/api/auth/register') {
          const body = await readJsonBody<{
            verificationCode?: string;
            email?: string;
            password?: string;
            displayName?: string;
          }>(req);

          const code = body?.verificationCode?.trim() || '';
          const email = body?.email?.trim() || '';
          const password = body?.password || '';
          const errors: Record<string, string[]> = {};

          if (code.length < 6) {
            errors.verificationCode = ['Add meg a Discordon kapott aktiváló kódot (pl. SH-XXXX-XXXX).'];
          }
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            errors.email = ['Adj meg egy érvényes e-mail címet.'];
          }
          if (password.length < 8 || password.length > 128) {
            errors.password = ['A jelszónak legalább 8 karakter hosszúnak kell lennie.'];
          }
          if (Object.keys(errors).length > 0) {
            return errorResponse(req, 400, 'Kérjük, ellenőrizd a megadott adatokat.', errors);
          }

          const codeRow = peekValidVerificationCode(code);
          if (!codeRow) {
            return errorResponse(
              req,
              400,
              'Érvénytelen vagy lejárt Discord aktiváló kód. Kérj újat a Discordon a `/fiok` paranccsal vagy a DM gombbal!'
            );
          }

          const existing = findAccountByEmailOrDiscord(email, codeRow.discord_user_id);
          if (existing) {
            const msg =
              existing.discord_user_id === codeRow.discord_user_id
                ? 'Ehhez a Discord profilhoz már tartozik fiók. Kérlek jelentkezz be!'
                : 'Ezzel az e-mail címmel már regisztráltak fiókot.';
            return errorResponse(req, 409, msg);
          }

          let roles: string[] = [];
          try {
            roles = JSON.parse(codeRow.roles_json);
          } catch {
            roles = [];
          }
          let discordUsername = codeRow.discord_username;
          let githubHandle = codeRow.github_handle;
          let avatarUrl = codeRow.avatar_url;
          let displayName = body?.displayName?.trim() || codeRow.display_name;

          if (guild) {
            const liveCert = await inspectMemberCertification(guild, codeRow.discord_user_id);
            if (!liveCert.certified) {
              return errorResponse(
                req,
                403,
                liveCert.reason || 'A Discord szerveren jelenleg nem aktív a Hitelesített Fejlesztő rangod.'
              );
            }
            roles = liveCert.roles;
            discordUsername = liveCert.discordUsername;
            githubHandle = liveCert.githubHandle || githubHandle;
            avatarUrl = liveCert.avatarUrl || avatarUrl;
            if (!body?.displayName?.trim()) displayName = liveCert.displayName;
          }

          if (!markVerificationCodeUsed(codeRow.code_hash)) {
            return errorResponse(req, 400, 'Ezt az aktiváló kódot már felhasználták.');
          }

          const developer = await createCertifiedDeveloperAccount({
            email,
            password,
            displayName,
            discordUserId: codeRow.discord_user_id,
            discordUsername,
            githubHandle,
            avatarUrl,
            roles
          });

          const token = issueSessionToken(developer);

          void notifyAuditLog(
            guild,
            '👤 Új Hitelesített Fejlesztői Webes Fiók',
            `A(z) **@${developer.discordUsername}** Discord tag létrehozta a webes fejlesztői fiókját.`,
            Colors.Green,
            [
              { name: 'Discord ID', value: `\`${developer.discordUserId}\``, inline: true },
              { name: 'GitHub', value: developer.githubHandle ? `\`@${developer.githubHandle}\`` : 'Nincs megadva', inline: true },
              { name: 'Szerepkörök', value: developer.verifiedRoles.join(', ') || 'Hitelesített Fejlesztő', inline: false }
            ]
          );

          return jsonResponse(req, { token, developer }, 201);
        }

        // POST /api/auth/login
        if (req.method === 'POST' && pathname === '/api/auth/login') {
          const body = await readJsonBody<{ identifier?: string; password?: string }>(req);
          const identifier = body?.identifier?.trim() || '';
          const password = body?.password || '';

          if (!identifier || !password) {
            return errorResponse(req, 400, 'Add meg az e-mail címed / felhasználóneved és a jelszavad.');
          }

          const accountRow = findAccountByLoginIdentifier(identifier);
          if (!accountRow) {
            return errorResponse(req, 401, 'Hibás azonosító vagy jelszó.');
          }

          const passwordOk = await Bun.password.verify(password, accountRow.password_hash);
          if (!passwordOk) {
            return errorResponse(req, 401, 'Hibás azonosító vagy jelszó.');
          }

          if (guild) {
            const liveCert = await inspectMemberCertification(guild, accountRow.discord_user_id);
            if (!liveCert.certified) {
              return errorResponse(
                req,
                403,
                liveCert.reason || 'A fiókodhoz tartozó Hitelesített Fejlesztő szerepkör jelenleg inaktív a Discord szerveren.'
              );
            }
          }

          const freshProfile = getDeveloperById(accountRow.id)!;
          const token = issueSessionToken(freshProfile);
          return jsonResponse(req, { token, developer: freshProfile });
        }

        // POST /api/auth/reset-password
        if (req.method === 'POST' && pathname === '/api/auth/reset-password') {
          const body = await readJsonBody<{ verificationCode?: string; newPassword?: string }>(req);
          const code = body?.verificationCode?.trim() || '';
          const newPassword = body?.newPassword || '';

          if (code.length < 6) {
            return errorResponse(req, 400, 'Add meg a Discordon kapott egyszer használatos kódot.');
          }
          if (newPassword.length < 8 || newPassword.length > 128) {
            return errorResponse(req, 400, 'Az új jelszónak legalább 8 karakter hosszúnak kell lennie.');
          }

          const codeRow = peekValidVerificationCode(code);
          if (!codeRow) {
            return errorResponse(req, 400, 'Érvénytelen vagy lejárt Discord kód.');
          }

          let roles: string[] | undefined;
          if (guild) {
            const liveCert = await inspectMemberCertification(guild, codeRow.discord_user_id);
            if (!liveCert.certified) {
              return errorResponse(req, 403, liveCert.reason || 'Hiányzó Hitelesített Fejlesztő rang.');
            }
            roles = liveCert.roles;
          }

          const updated = await updateDeveloperPasswordByDiscordId(codeRow.discord_user_id, newPassword, roles);
          if (!updated) {
            return errorResponse(req, 404, 'Ehhez a Discord profilhoz még nem tartozik regisztrált fiók.');
          }

          markVerificationCodeUsed(codeRow.code_hash);
          const token = issueSessionToken(updated);
          return jsonResponse(req, { token, developer: updated });
        }

        // GET /api/auth/me
        if (req.method === 'GET' && pathname === '/api/auth/me') {
          const user = getAuthenticatedDeveloper(req);
          if (!user) {
            return errorResponse(req, 401, 'Nincs érvényes bejelentkezési munkamenet.');
          }
          if (guild) {
            const liveCert = await inspectMemberCertification(guild, user.discordUserId);
            if (!liveCert.certified) {
              return errorResponse(req, 403, liveCert.reason || 'A Hitelesített Fejlesztő rangod nem aktív.');
            }
          }
          const latest = getDeveloperById(user.id) || user;
          return jsonResponse(req, { developer: latest });
        }

        // =====================================================================
        // PROJECT ROUTES
        // =====================================================================

        // GET /api/projects
        if (req.method === 'GET' && pathname === '/api/projects') {
          const search = url.searchParams.get('search') || undefined;
          const tag = url.searchParams.get('tag') || undefined;
          return jsonResponse(req, listActiveProjects(search, tag));
        }

        // GET /api/projects/mine
        if (req.method === 'GET' && pathname === '/api/projects/mine') {
          const user = getAuthenticatedDeveloper(req);
          if (!user) return errorResponse(req, 401, 'Jelentkezz be a saját projektjeid megtekintéséhez.');
          const mine = listActiveProjects().filter((p) => isProjectOwner(user, p));
          return jsonResponse(req, mine);
        }

        // POST /api/projects
        if (req.method === 'POST' && pathname === '/api/projects') {
          const user = getAuthenticatedDeveloper(req);
          const body = await readJsonBody<ProjectInputPayload>(req);
          if (!body) {
            return errorResponse(req, 400, 'Érvénytelen JSON kérés.');
          }

          const payload: ProjectInputPayload = {
            ...body,
            authorHandle: body.authorHandle?.trim() || (user?.githubHandle ? `@${user.githubHandle}` : user?.discordUsername ? `@${user.discordUsername}` : ''),
            contactInfo: body.contactInfo?.trim() || user?.email || (user?.discordUsername ? `Discord: @${user.discordUsername}` : '')
          };

          const validation = validateProjectPayload(payload, true);
          if (!validation.valid) {
            return errorResponse(req, 400, 'A beküldött adatok hibásak.', validation.errors);
          }

          const created = createProjectRecord(payload, validation.normalizedTechStack, user);
          void notifyShowcaseNewProject(guild, created);
          return jsonResponse(req, created, 201);
        }

        // PUT / PATCH /api/projects/:id (Authenticated Certified Developer Edit)
        const projectMatch = pathname.match(/^\/api\/projects\/([^/]+)$/);
        if (projectMatch && (req.method === 'PUT' || req.method === 'PATCH')) {
          const user = getAuthenticatedDeveloper(req);
          if (!user) {
            return errorResponse(req, 401, 'A projekt szerkesztéséhez jelentkezz be Hitelesített Fejlesztőként.');
          }

          const projectId = decodeURIComponent(projectMatch[1]);
          const existing = getProjectById(projectId);
          if (!existing || !existing.isActive) {
            return errorResponse(req, 404, 'A keresett projekt nem található vagy már el lett távolítva.');
          }

          if (!isProjectOwner(user, existing)) {
            return errorResponse(
              req,
              403,
              'Csak a saját, Discorddal/GitHubbal igazolt projektedet szerkesztheted.'
            );
          }

          const body = await readJsonBody<ProjectInputPayload>(req);
          if (!body) {
            return errorResponse(req, 400, 'Érvénytelen JSON kérés.');
          }

          const mergedPayload: ProjectInputPayload = {
            name: body.name ?? existing.name,
            description: body.description ?? existing.description,
            longDescription: body.longDescription !== undefined ? body.longDescription : existing.longDescription,
            category: body.category ?? existing.category,
            imageUrl: body.imageUrl !== undefined ? body.imageUrl : existing.imageUrl,
            techStack: body.techStack ?? existing.techStack,
            repositoryUrl: body.repositoryUrl ?? existing.repositoryUrl,
            liveDemoUrl: body.liveDemoUrl !== undefined ? body.liveDemoUrl : existing.liveDemoUrl
          };

          const validation = validateProjectPayload(mergedPayload, false);
          if (!validation.valid) {
            return errorResponse(req, 400, 'A szerkesztett adatok érvénytelenek.', validation.errors);
          }

          const updated = updateProjectRecord(projectId, mergedPayload, validation.normalizedTechStack);
          if (!updated) {
            return errorResponse(req, 404, 'A projekt frissítése sikertelen volt.');
          }

          void notifyAuditLog(
            guild,
            `✏️ Projekt Szerkesztve: ${updated.name}`,
            `A(z) **${updated.name}** projektet frissítette a hitelesített tulajdonosa (**@${user.discordUsername}**).`,
            Colors.Blue,
            [
              { name: 'Projekt ID', value: `\`${updated.id}\``, inline: true },
              { name: 'Alkotó', value: updated.authorHandle, inline: true }
            ]
          );

          return jsonResponse(req, updated);
        }

        // POST /api/projects/:id/auto-takedown (or DELETE /api/projects/:id/self)
        const autoTakedownMatch = pathname.match(/^\/api\/projects\/([^/]+)\/(?:auto-takedown|self)$/);
        if (autoTakedownMatch && (req.method === 'POST' || req.method === 'DELETE')) {
          const user = getAuthenticatedDeveloper(req);
          if (!user) {
            return errorResponse(req, 401, 'Az azonnali eltávolításhoz jelentkezz be Hitelesített Fejlesztőként.');
          }

          const projectId = decodeURIComponent(autoTakedownMatch[1]);
          const existing = getProjectById(projectId);
          if (!existing || !existing.isActive) {
            return errorResponse(req, 404, 'A projekt nem található vagy már el lett távolítva.');
          }

          if (!isProjectOwner(user, existing)) {
            return errorResponse(
              req,
              403,
              'Nincs jogosultságod más fejlesztő projektjének automatikus eltávolításához.'
            );
          }

          if (guild) {
            const liveCert = await inspectMemberCertification(guild, user.discordUserId);
            if (!liveCert.certified) {
              return errorResponse(
                req,
                403,
                liveCert.reason || 'A Discord Hitelesített Fejlesztő szerepköröd nem aktív.'
              );
            }
          }

          const body = req.method === 'POST' ? await readJsonBody<{ reason?: string }>(req) : null;
          const reasonText =
            body?.reason?.trim() || 'Tulajdonosi azonnali eltávolítás (Discord Hitelesített Fejlesztő).';

          const log = recordTakedownNotice(
            projectId,
            `@${user.discordUsername}${user.githubHandle ? ` (@${user.githubHandle})` : ''}`,
            reasonText,
            user
          );

          if (!log) {
            return errorResponse(req, 404, 'A projekt eltávolítása sikertelen volt.');
          }

          void notifyAuditLog(
            guild,
            `⚡ Azonnali Alkotói Eltávolítás: ${existing.name}`,
            `A(z) **${existing.name}** projektet tulajdonosa (**@${user.discordUsername}**) azonnal eltávolította a piactérről.`,
            Colors.Orange,
            [
              { name: 'Projekt ID', value: `\`${existing.id}\``, inline: true },
              { name: 'Audit ID', value: `\`${log.id}\``, inline: true },
              { name: 'Indoklás', value: reasonText.slice(0, 500), inline: false }
            ]
          );

          return jsonResponse(req, {
            id: log.id,
            projectId: log.projectId,
            status: log.status,
            requestedAtUtc: log.requestedAtUtc,
            message: `A(z) „${existing.name}” projektet azonnal eltávolítottuk a nyilvános piactérről.`
          });
        }

        // POST /api/projects/:id/takedown (Unauthenticated manual 24h audit fallback)
        const manualTakedownMatch = pathname.match(/^\/api\/projects\/([^/]+)\/takedown$/);
        if (manualTakedownMatch && req.method === 'POST') {
          const projectId = decodeURIComponent(manualTakedownMatch[1]);
          const body = await readJsonBody<{ requesterContact?: string; reason?: string }>(req);
          const contact = body?.requesterContact?.trim() || '';
          const reason = body?.reason?.trim() || '';
          const errors: Record<string, string[]> = {};

          if (contact.length < 3 || contact.length > 160) {
            errors.requesterContact = ['A kapcsolattartási elérhetőség kötelező (3–160 karakter).'];
          }
          if (reason.length < 10 || reason.length > 1500) {
            errors.reason = ['Az indoklás kötelező (10–1500 karakter).'];
          }
          if (Object.keys(errors).length > 0) {
            return errorResponse(req, 400, 'Hibás eltávolítási kérelem.', errors);
          }

          const existing = getProjectById(projectId);
          if (!existing || !existing.isActive) {
            return errorResponse(req, 404, 'A keresett projekt nem található.');
          }

          const log = recordTakedownNotice(projectId, contact, reason);
          if (!log) {
            return errorResponse(req, 404, 'A kérelem mentése sikertelen volt.');
          }

          void notifyAuditLog(
            guild,
            `⚠️ Eltávolítási Kérelem (24h Audit): ${existing.name}`,
            reason.slice(0, 1200),
            Colors.Red,
            [
              { name: 'Projekt ID', value: `\`${existing.id}\``, inline: true },
              { name: 'Kérelmező', value: contact, inline: true },
              { name: 'Audit ID', value: `\`${log.id}\``, inline: true }
            ]
          );

          return jsonResponse(
            req,
            {
              id: log.id,
              projectId: log.projectId,
              status: log.status,
              requestedAtUtc: log.requestedAtUtc,
              message:
                'Az eltávolítási kérelmet rögzítettük. Az eredeti alkotóktól érkező kérelmeket 24 órán belül végrehajtjuk (vagy lépj be a Discordon hitelesített fiókkal az azonnali törléshez).'
            },
            202
          );
        }

        // Quick check for unused db warning cleanliness
        void db;
        return errorResponse(req, 404, 'Az API végpont nem található.');
      } catch (err: any) {
        console.error('StrataHu API hiba:', err);
        return errorResponse(req, 500, 'Szerver oldali hiba történt a kérés feldolgozása során.');
      }
    }
  });

  console.log(`🌐 StrataHu Auth & Piactér API fut: http://localhost:${server.port}/api`);
  return server;
}
