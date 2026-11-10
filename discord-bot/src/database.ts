import { Database } from 'bun:sqlite';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { loadCatalogProjects, type CatalogProject } from './project-embeds';

const DATA_DIR = path.resolve(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'stratahu.sqlite');
const SECRET_PATH = path.join(DATA_DIR, '.auth-secret');

fs.mkdirSync(DATA_DIR, { recursive: true });

export const db = new Database(DB_PATH, { create: true });
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

db.exec(`
  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    long_description TEXT,
    category TEXT NOT NULL DEFAULT 'Fejlesztői eszközök',
    image_url TEXT,
    gallery_images_json TEXT,
    tier TEXT NOT NULL DEFAULT 'A',
    rank INTEGER,
    verdict TEXT,
    highlights_json TEXT,
    author_handle TEXT NOT NULL,
    contact_info TEXT NOT NULL,
    tech_stack_json TEXT NOT NULL,
    repository_url TEXT NOT NULL,
    live_demo_url TEXT,
    owner_user_id TEXT,
    owner_discord_id TEXT,
    edited_by_owner INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at_utc TEXT NOT NULL,
    updated_at_utc TEXT,
    deleted_at_utc TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_projects_active_rank ON projects(is_active, rank);
  CREATE INDEX IF NOT EXISTS idx_projects_owner ON projects(owner_user_id, owner_discord_id);

  CREATE TABLE IF NOT EXISTS takedown_logs (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    requester_contact TEXT NOT NULL,
    requester_user_id TEXT,
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PendingAudit',
    requested_at_utc TEXT NOT NULL,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS discord_certifications (
    discord_user_id TEXT PRIMARY KEY,
    discord_username TEXT NOT NULL,
    display_name TEXT,
    github_handle TEXT NOT NULL,
    avatar_url TEXT,
    roles_json TEXT NOT NULL DEFAULT '[]',
    certified_at_utc TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS developer_accounts (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    discord_user_id TEXT NOT NULL UNIQUE,
    discord_username TEXT NOT NULL,
    github_handle TEXT NOT NULL DEFAULT '',
    display_name TEXT NOT NULL,
    avatar_url TEXT,
    verified_roles_json TEXT NOT NULL DEFAULT '[]',
    created_at_utc TEXT NOT NULL,
    updated_at_utc TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS verification_codes (
    code_hash TEXT PRIMARY KEY,
    discord_user_id TEXT NOT NULL,
    discord_username TEXT NOT NULL,
    display_name TEXT NOT NULL,
    github_handle TEXT NOT NULL DEFAULT '',
    avatar_url TEXT,
    roles_json TEXT NOT NULL DEFAULT '[]',
    purpose TEXT NOT NULL DEFAULT 'register',
    expires_at_utc TEXT NOT NULL,
    used_at_utc TEXT,
    created_at_utc TEXT NOT NULL
  );
`);

export interface PublicProjectRecord {
  id: string;
  name: string;
  description: string;
  longDescription: string | null;
  category: string;
  imageUrl: string | null;
  galleryImages?: string[];
  tier: string;
  rank: number | null;
  verdict: string | null;
  highlights?: string[];
  authorHandle: string;
  techStack: string[];
  repositoryUrl: string;
  liveDemoUrl: string | null;
  ownerUserId?: string | null;
  ownerDiscordId?: string | null;
  createdAtUtc: string;
  updatedAtUtc?: string | null;
}

export interface DeveloperProfile {
  id: string;
  email: string;
  discordUserId: string;
  discordUsername: string;
  githubHandle: string;
  displayName: string;
  avatarUrl: string | null;
  verifiedRoles: string[];
  createdAtUtc: string;
}

interface ProjectRow {
  id: string;
  name: string;
  description: string;
  long_description: string | null;
  category: string;
  image_url: string | null;
  gallery_images_json: string | null;
  tier: string;
  rank: number | null;
  verdict: string | null;
  highlights_json: string | null;
  author_handle: string;
  contact_info: string;
  tech_stack_json: string;
  repository_url: string;
  live_demo_url: string | null;
  owner_user_id: string | null;
  owner_discord_id: string | null;
  edited_by_owner: number;
  is_active: number;
  created_at_utc: string;
  updated_at_utc: string | null;
  deleted_at_utc: string | null;
}

interface DeveloperAccountRow {
  id: string;
  email: string;
  password_hash: string;
  discord_user_id: string;
  discord_username: string;
  github_handle: string;
  display_name: string;
  avatar_url: string | null;
  verified_roles_json: string;
  created_at_utc: string;
  updated_at_utc: string;
}

interface VerificationCodeRow {
  code_hash: string;
  discord_user_id: string;
  discord_username: string;
  display_name: string;
  github_handle: string;
  avatar_url: string | null;
  roles_json: string;
  purpose: string;
  expires_at_utc: string;
  used_at_utc: string | null;
  created_at_utc: string;
}

function getAuthSecret(): string {
  const fromEnv = process.env.STRATAHU_AUTH_SECRET || process.env.AUTH_SECRET;
  if (fromEnv && fromEnv.trim().length >= 16) {
    return fromEnv.trim();
  }
  if (fs.existsSync(SECRET_PATH)) {
    const existing = fs.readFileSync(SECRET_PATH, 'utf-8').trim();
    if (existing.length >= 32) return existing;
  }
  const generated = crypto.randomBytes(32).toString('hex');
  fs.writeFileSync(SECRET_PATH, generated, { encoding: 'utf-8', mode: 0o600 });
  return generated;
}

const AUTH_SECRET = getAuthSecret();

function safeJsonParseArray(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function mapProjectRow(row: ProjectRow): PublicProjectRecord {
  const gallery = safeJsonParseArray(row.gallery_images_json);
  const highlights = safeJsonParseArray(row.highlights_json);
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    longDescription: row.long_description,
    category: row.category,
    imageUrl: row.image_url,
    ...(gallery.length > 0 ? { galleryImages: gallery } : {}),
    tier: row.tier,
    rank: row.rank,
    verdict: row.verdict,
    ...(highlights.length > 0 ? { highlights } : {}),
    authorHandle: row.author_handle,
    techStack: safeJsonParseArray(row.tech_stack_json),
    repositoryUrl: row.repository_url,
    liveDemoUrl: row.live_demo_url,
    ownerUserId: row.owner_user_id,
    ownerDiscordId: row.owner_discord_id,
    createdAtUtc: row.created_at_utc,
    updatedAtUtc: row.updated_at_utc
  };
}

export function mapDeveloperRow(row: DeveloperAccountRow): DeveloperProfile {
  return {
    id: row.id,
    email: row.email,
    discordUserId: row.discord_user_id,
    discordUsername: row.discord_username,
    githubHandle: row.github_handle,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    verifiedRoles: safeJsonParseArray(row.verified_roles_json),
    createdAtUtc: row.created_at_utc
  };
}

/** Seed SQLite projects table from catalog JSON and keep unedited seed entries updated. */
export function ensureCatalogSeeded(): number {
  const catalog = loadCatalogProjects() as Array<
    CatalogProject & { verdict?: string | null; createdAtUtc?: string }
  >;
  if (catalog.length === 0) return 0;

  const insertStmt = db.prepare(`
    INSERT OR IGNORE INTO projects (
      id, name, description, long_description, category, image_url, gallery_images_json,
      tier, rank, verdict, highlights_json, author_handle, contact_info, tech_stack_json,
      repository_url, live_demo_url, is_active, created_at_utc
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
  `);

  const syncSeedStmt = db.prepare(`
    UPDATE projects
    SET image_url = ?, gallery_images_json = ?, repository_url = ?, live_demo_url = ?
    WHERE id = ? AND edited_by_owner = 0 AND is_active = 1
  `);

  const runTx = db.transaction(() => {
    for (const item of catalog) {
      const id = item.id || crypto.randomUUID();
      const galleryJson =
        Array.isArray(item.galleryImages) && item.galleryImages.length > 0
          ? JSON.stringify(item.galleryImages)
          : null;
      const highlightsJson =
        Array.isArray(item.highlights) && item.highlights.length > 0
          ? JSON.stringify(item.highlights)
          : null;
      const techJson = JSON.stringify(Array.isArray(item.techStack) ? item.techStack : []);
      const repoUrl = item.repositoryUrl || 'https://github.com/CsPS0/StrataHu';
      const demoUrl = item.liveDemoUrl || null;
      const imageUrl = item.imageUrl || null;

      insertStmt.run(
        id,
        item.name,
        item.description || '',
        item.longDescription || null,
        item.category || 'Fejlesztői eszközök',
        imageUrl,
        galleryJson,
        item.tier || 'A',
        typeof item.rank === 'number' ? item.rank : null,
        item.verdict || null,
        highlightsJson,
        item.authorHandle || '@ismeretlen',
        item.authorHandle || '@ismeretlen',
        techJson,
        repoUrl,
        demoUrl,
        item.createdAtUtc || new Date().toISOString()
      );

      syncSeedStmt.run(imageUrl, galleryJson, repoUrl, demoUrl, id);
    }
  });

  runTx();
  const countRow = db.query('SELECT COUNT(*) as cnt FROM projects WHERE is_active = 1').get() as { cnt: number };
  return countRow?.cnt || 0;
}

export function listActiveProjects(search?: string, tag?: string): PublicProjectRecord[] {
  const rows = db
    .query(
      `SELECT * FROM projects
       WHERE is_active = 1
       ORDER BY COALESCE(rank, 999999) ASC, created_at_utc DESC`
    )
    .all() as ProjectRow[];

  let records = rows.map(mapProjectRow);

  if (tag && tag.trim().length > 0) {
    const tLower = tag.trim().toLowerCase();
    records = records.filter((p) => p.techStack.some((t) => t.toLowerCase() === tLower));
  }

  if (search && search.trim().length > 0) {
    const q = search.trim().toLowerCase();
    records = records.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.authorHandle.toLowerCase().includes(q) ||
        p.techStack.some((t) => t.toLowerCase().includes(q))
    );
  }

  return records;
}

export function getProjectById(id: string): (PublicProjectRecord & { isActive: boolean; contactInfo: string }) | null {
  const row = db.query('SELECT * FROM projects WHERE id = ?').get(id) as ProjectRow | null;
  if (!row) return null;
  return {
    ...mapProjectRow(row),
    isActive: row.is_active === 1,
    contactInfo: row.contact_info
  };
}

export function extractGithubOwner(repoUrl?: string | null): string | null {
  if (!repoUrl) return null;
  try {
    const parsed = new URL(repoUrl);
    if (!parsed.hostname.toLowerCase().endsWith('github.com')) return null;
    const segments = parsed.pathname.split('/').filter(Boolean);
    return segments.length >= 2 ? segments[0].toLowerCase() : null;
  } catch {
    return null;
  }
}

export function isProjectOwner(user: DeveloperProfile, project: Pick<PublicProjectRecord, 'ownerUserId' | 'ownerDiscordId' | 'authorHandle' | 'repositoryUrl'>): boolean {
  if (project.ownerUserId && project.ownerUserId === user.id) return true;
  if (project.ownerDiscordId && project.ownerDiscordId === user.discordUserId) return true;

  const cleanAuthor = project.authorHandle.trim().replace(/^@+/, '').toLowerCase();
  const gh = user.githubHandle.trim().replace(/^@+/, '').toLowerCase();
  const disc = user.discordUsername.trim().replace(/^@+/, '').toLowerCase();

  if (cleanAuthor.length >= 2 && (cleanAuthor === gh || (disc.length >= 2 && cleanAuthor === disc))) {
    return true;
  }

  const repoOwner = extractGithubOwner(project.repositoryUrl);
  if (gh.length >= 2 && repoOwner && repoOwner === gh) {
    return true;
  }

  return false;
}

export function isValidProjectUrl(raw?: string | null, allowLocalScreenshot = false): boolean {
  if (!raw) return false;
  const trimmed = raw.trim();
  if (trimmed.length === 0 || trimmed.length > 500 || /\s/.test(trimmed)) return false;
  if (allowLocalScreenshot && trimmed.startsWith('/screenshots/')) return true;
  try {
    const parsed = new URL(trimmed);
    return (parsed.protocol === 'http:' || parsed.protocol === 'https:') && Boolean(parsed.hostname);
  } catch {
    return false;
  }
}

export interface ProjectInputPayload {
  name: string;
  description: string;
  longDescription?: string | null;
  category?: string | null;
  imageUrl?: string | null;
  techStack: string[] | string;
  repositoryUrl: string;
  liveDemoUrl?: string | null;
  authorHandle?: string;
  contactInfo?: string;
}

export function normalizeTechStack(input: string[] | string | undefined): string[] {
  const rawList = Array.isArray(input)
    ? input
    : typeof input === 'string'
      ? [input]
      : [];

  const deduped: string[] = [];
  const seen = new Set<string>();
  for (const entry of rawList) {
    for (const part of String(entry).split(',')) {
      const trimmed = part.trim();
      if (trimmed.length >= 1 && trimmed.length <= 40 && !seen.has(trimmed.toLowerCase())) {
        seen.add(trimmed.toLowerCase());
        deduped.push(trimmed);
        if (deduped.length >= 12) return deduped;
      }
    }
  }
  return deduped;
}

export function validateProjectPayload(
  payload: ProjectInputPayload,
  requireContactFields: boolean
): { valid: true; normalizedTechStack: string[] } | { valid: false; errors: Record<string, string[]> } {
  const errors: Record<string, string[]> = {};

  const name = (payload.name || '').trim();
  if (name.length < 2 || name.length > 120) {
    errors.name = ['A projekt neve kötelező (2–120 karakter).'];
  }

  const desc = (payload.description || '').trim();
  if (desc.length < 10 || desc.length > 600) {
    errors.description = ['A rövid leírás kötelező (10–600 karakter).'];
  }

  if (payload.longDescription && payload.longDescription.trim().length > 2400) {
    errors.longDescription = ['A részletes bemutatás legfeljebb 2400 karakter lehet.'];
  }

  if (requireContactFields) {
    const author = (payload.authorHandle || '').trim();
    if (author.length < 2 || author.length > 80) {
      errors.authorHandle = ['A készítő azonosítója kötelező (2–80 karakter).'];
    }
    const contact = (payload.contactInfo || '').trim();
    if (contact.length < 3 || contact.length > 160) {
      errors.contactInfo = ['A kapcsolattartási elérhetőség kötelező (3–160 karakter).'];
    }
  }

  const normalizedTechStack = normalizeTechStack(payload.techStack);
  if (normalizedTechStack.length === 0 || normalizedTechStack.length > 12) {
    errors.techStack = ['Legalább 1 és legfeljebb 12 technológiai címkét adj meg.'];
  }

  if (!isValidProjectUrl(payload.repositoryUrl)) {
    errors.repositoryUrl = ['A forráskód URL-nek érvényes HTTP vagy HTTPS címnek kell lennie.'];
  }

  if (payload.liveDemoUrl && payload.liveDemoUrl.trim().length > 0 && !isValidProjectUrl(payload.liveDemoUrl)) {
    errors.liveDemoUrl = ['Az élő demó linknek érvényes HTTP vagy HTTPS címnek kell lennie.'];
  }

  if (payload.imageUrl && payload.imageUrl.trim().length > 0 && !isValidProjectUrl(payload.imageUrl, true)) {
    errors.imageUrl = ['Az előnézeti kép URL-nek érvényes HTTP(S) vagy helyi képútvonalnak kell lennie.'];
  }

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors };
  }
  return { valid: true, normalizedTechStack };
}

export function createProjectRecord(
  payload: ProjectInputPayload,
  normalizedTechStack: string[],
  owner?: DeveloperProfile | null
): PublicProjectRecord {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const rawHandle = (payload.authorHandle || owner?.githubHandle || owner?.discordUsername || 'fejleszto').trim();
  const authorHandle = rawHandle.startsWith('@') ? rawHandle : `@${rawHandle}`;
  const contactInfo = (payload.contactInfo || owner?.email || authorHandle).trim();
  const category = (payload.category || '').trim() || 'Parancssor & Fejlesztői eszközök';

  db.prepare(`
    INSERT INTO projects (
      id, name, description, long_description, category, image_url,
      tier, verdict, author_handle, contact_info, tech_stack_json,
      repository_url, live_demo_url, owner_user_id, owner_discord_id,
      edited_by_owner, is_active, created_at_utc
    ) VALUES (?, ?, ?, ?, ?, ?, 'A', ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, ?)
  `).run(
    id,
    payload.name.trim(),
    payload.description.trim(),
    payload.longDescription?.trim() || null,
    category,
    payload.imageUrl?.trim() || null,
    owner ? `Hitelesített közösségi beküldés (@${owner.discordUsername})` : 'Közösségi beküldés — szerkesztői értékelés alatt.',
    authorHandle,
    contactInfo,
    JSON.stringify(normalizedTechStack),
    payload.repositoryUrl.trim(),
    payload.liveDemoUrl?.trim() || null,
    owner?.id || null,
    owner?.discordUserId || null,
    now
  );

  return getProjectById(id)!;
}

export function updateProjectRecord(
  id: string,
  payload: ProjectInputPayload,
  normalizedTechStack: string[]
): PublicProjectRecord | null {
  const existing = getProjectById(id);
  if (!existing || !existing.isActive) return null;

  const now = new Date().toISOString();
  const category = (payload.category || '').trim() || existing.category;
  const imageUrl = payload.imageUrl !== undefined
    ? (payload.imageUrl?.trim() || null)
    : existing.imageUrl;

  db.prepare(`
    UPDATE projects
    SET name = ?, description = ?, long_description = ?, category = ?,
        image_url = ?, tech_stack_json = ?, repository_url = ?, live_demo_url = ?,
        edited_by_owner = 1, updated_at_utc = ?
    WHERE id = ? AND is_active = 1
  `).run(
    payload.name.trim(),
    payload.description.trim(),
    payload.longDescription?.trim() || null,
    category,
    imageUrl,
    JSON.stringify(normalizedTechStack),
    payload.repositoryUrl.trim(),
    payload.liveDemoUrl?.trim() || null,
    now,
    id
  );

  return getProjectById(id);
}

export function recordTakedownNotice(
  projectId: string,
  requesterContact: string,
  reason: string,
  autoExecuteUser?: DeveloperProfile | null
): { id: string; projectId: string; status: string; requestedAtUtc: string } | null {
  const existing = getProjectById(projectId);
  if (!existing || !existing.isActive) return null;

  const logId = crypto.randomUUID();
  const now = new Date().toISOString();
  const status = autoExecuteUser ? 'AutoExecuted' : 'PendingAudit';

  const runTx = db.transaction(() => {
    db.prepare(`
      INSERT INTO takedown_logs (id, project_id, requester_contact, requester_user_id, reason, status, requested_at_utc)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(logId, projectId, requesterContact, autoExecuteUser?.id || null, reason, status, now);

    if (autoExecuteUser) {
      db.prepare(`
        UPDATE projects SET is_active = 0, deleted_at_utc = ?, updated_at_utc = ? WHERE id = ?
      `).run(now, now, projectId);
    }
  });

  runTx();
  return { id: logId, projectId, status, requestedAtUtc: now };
}

export function upsertDiscordCertification(params: {
  discordUserId: string;
  discordUsername: string;
  displayName?: string | null;
  githubHandle: string;
  avatarUrl?: string | null;
  roles: string[];
}): void {
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO discord_certifications (
      discord_user_id, discord_username, display_name, github_handle, avatar_url, roles_json, certified_at_utc
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(discord_user_id) DO UPDATE SET
      discord_username = excluded.discord_username,
      display_name = excluded.display_name,
      github_handle = CASE WHEN excluded.github_handle != '' THEN excluded.github_handle ELSE discord_certifications.github_handle END,
      avatar_url = excluded.avatar_url,
      roles_json = excluded.roles_json,
      certified_at_utc = excluded.certified_at_utc
  `).run(
    params.discordUserId,
    params.discordUsername,
    params.displayName || params.discordUsername,
    params.githubHandle,
    params.avatarUrl || null,
    JSON.stringify(params.roles),
    now
  );

  // Sync roles & avatar onto any existing registered developer account too
  db.prepare(`
    UPDATE developer_accounts
    SET discord_username = ?,
        github_handle = CASE WHEN ? != '' THEN ? ELSE github_handle END,
        avatar_url = COALESCE(?, avatar_url),
        verified_roles_json = ?,
        updated_at_utc = ?
    WHERE discord_user_id = ?
  `).run(
    params.discordUsername,
    params.githubHandle,
    params.githubHandle,
    params.avatarUrl || null,
    JSON.stringify(params.roles),
    now,
    params.discordUserId
  );
}

export function getDiscordCertification(discordUserId: string): {
  discordUserId: string;
  discordUsername: string;
  displayName: string;
  githubHandle: string;
  avatarUrl: string | null;
  roles: string[];
} | null {
  const row = db
    .query('SELECT * FROM discord_certifications WHERE discord_user_id = ?')
    .get(discordUserId) as {
    discord_user_id: string;
    discord_username: string;
    display_name: string | null;
    github_handle: string;
    avatar_url: string | null;
    roles_json: string;
  } | null;
  if (!row) return null;
  return {
    discordUserId: row.discord_user_id,
    discordUsername: row.discord_username,
    displayName: row.display_name || row.discord_username,
    githubHandle: row.github_handle,
    avatarUrl: row.avatar_url,
    roles: safeJsonParseArray(row.roles_json)
  };
}

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function hashVerificationCode(code: string): string {
  return crypto.createHash('sha256').update(code.trim().toUpperCase()).digest('hex');
}

export function createOneTimeVerificationCode(params: {
  discordUserId: string;
  discordUsername: string;
  displayName: string;
  githubHandle: string;
  avatarUrl?: string | null;
  roles: string[];
  purpose?: 'register' | 'reset';
}): { code: string; expiresAtUtc: string } {
  const bytes = crypto.randomBytes(8);
  let raw = '';
  for (let i = 0; i < 8; i++) {
    raw += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  const code = `SH-${raw.slice(0, 4)}-${raw.slice(4, 8)}`;
  const codeHash = hashVerificationCode(code);
  const now = new Date();
  const expires = new Date(now.getTime() + 15 * 60 * 1000).toISOString();

  // Invalidate prior unused codes for the same user & purpose
  db.prepare(`
    DELETE FROM verification_codes
    WHERE discord_user_id = ? AND used_at_utc IS NULL
  `).run(params.discordUserId);

  db.prepare(`
    INSERT INTO verification_codes (
      code_hash, discord_user_id, discord_username, display_name, github_handle,
      avatar_url, roles_json, purpose, expires_at_utc, created_at_utc
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    codeHash,
    params.discordUserId,
    params.discordUsername,
    params.displayName,
    params.githubHandle,
    params.avatarUrl || null,
    JSON.stringify(params.roles),
    params.purpose || 'register',
    expires,
    now.toISOString()
  );

  return { code, expiresAtUtc: expires };
}

export function peekValidVerificationCode(code: string): VerificationCodeRow | null {
  const codeHash = hashVerificationCode(code);
  const row = db
    .query('SELECT * FROM verification_codes WHERE code_hash = ? AND used_at_utc IS NULL')
    .get(codeHash) as VerificationCodeRow | null;
  if (!row) return null;
  if (new Date(row.expires_at_utc).getTime() < Date.now()) return null;
  return row;
}

export function markVerificationCodeUsed(codeHash: string): boolean {
  const now = new Date().toISOString();
  const res = db
    .prepare('UPDATE verification_codes SET used_at_utc = ? WHERE code_hash = ? AND used_at_utc IS NULL')
    .run(now, codeHash);
  return res.changes > 0;
}

export function findAccountByEmailOrDiscord(email: string, discordUserId: string): DeveloperAccountRow | null {
  return db
    .query('SELECT * FROM developer_accounts WHERE LOWER(email) = LOWER(?) OR discord_user_id = ?')
    .get(email.trim(), discordUserId) as DeveloperAccountRow | null;
}

export function findAccountByLoginIdentifier(identifier: string): DeveloperAccountRow | null {
  const clean = identifier.trim().replace(/^@+/, '').toLowerCase();
  return db
    .query(
      `SELECT * FROM developer_accounts
       WHERE LOWER(email) = ? OR LOWER(discord_username) = ? OR (github_handle != '' AND LOWER(github_handle) = ?)`
    )
    .get(identifier.trim().toLowerCase(), clean, clean) as DeveloperAccountRow | null;
}

export function getDeveloperById(id: string): DeveloperProfile | null {
  const row = db.query('SELECT * FROM developer_accounts WHERE id = ?').get(id) as DeveloperAccountRow | null;
  return row ? mapDeveloperRow(row) : null;
}

export async function createCertifiedDeveloperAccount(params: {
  email: string;
  password: string;
  displayName?: string;
  discordUserId: string;
  discordUsername: string;
  githubHandle: string;
  avatarUrl?: string | null;
  roles: string[];
}): Promise<DeveloperProfile> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const passwordHash = await Bun.password.hash(params.password);
  const cleanEmail = params.email.trim().toLowerCase();
  const displayName = (params.displayName || '').trim() || params.discordUsername;

  db.prepare(`
    INSERT INTO developer_accounts (
      id, email, password_hash, discord_user_id, discord_username,
      github_handle, display_name, avatar_url, verified_roles_json, created_at_utc, updated_at_utc
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    cleanEmail,
    passwordHash,
    params.discordUserId,
    params.discordUsername,
    params.githubHandle,
    displayName,
    params.avatarUrl || null,
    JSON.stringify(params.roles),
    now,
    now
  );

  return getDeveloperById(id)!;
}

export async function updateDeveloperPasswordByDiscordId(
  discordUserId: string,
  newPassword: string,
  roles?: string[]
): Promise<DeveloperProfile | null> {
  const row = db
    .query('SELECT * FROM developer_accounts WHERE discord_user_id = ?')
    .get(discordUserId) as DeveloperAccountRow | null;
  if (!row) return null;

  const passwordHash = await Bun.password.hash(newPassword);
  const now = new Date().toISOString();
  db.prepare(`
    UPDATE developer_accounts
    SET password_hash = ?, verified_roles_json = COALESCE(?, verified_roles_json), updated_at_utc = ?
    WHERE id = ?
  `).run(passwordHash, roles ? JSON.stringify(roles) : null, now, row.id);

  return getDeveloperById(row.id);
}

export function updateAccountRoles(discordUserId: string, roles: string[], avatarUrl?: string | null): void {
  db.prepare(`
    UPDATE developer_accounts
    SET verified_roles_json = ?, avatar_url = COALESCE(?, avatar_url), updated_at_utc = ?
    WHERE discord_user_id = ?
  `).run(JSON.stringify(roles), avatarUrl || null, new Date().toISOString(), discordUserId);
}

export function issueSessionToken(user: DeveloperProfile): string {
  const nowSec = Math.floor(Date.now() / 1000);
  const payloadObj = {
    sub: user.id,
    did: user.discordUserId,
    iat: nowSec,
    exp: nowSec + 7 * 24 * 60 * 60
  };
  const payloadB64 = Buffer.from(JSON.stringify(payloadObj)).toString('base64url');
  const sig = crypto.createHmac('sha256', AUTH_SECRET).update(payloadB64).digest('base64url');
  return `${payloadB64}.${sig}`;
}

export function verifySessionToken(token: string): DeveloperProfile | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payloadB64, providedSig] = parts;
  const expectedSig = crypto.createHmac('sha256', AUTH_SECRET).update(payloadB64).digest('base64url');
  const bufA = Buffer.from(providedSig);
  const bufB = Buffer.from(expectedSig);
  if (bufA.length !== bufB.length || !crypto.timingSafeEqual(bufA, bufB)) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf-8')) as {
      sub?: string;
      exp?: number;
    };
    if (!parsed.sub || !parsed.exp || parsed.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return getDeveloperById(parsed.sub);
  } catch {
    return null;
  }
}
