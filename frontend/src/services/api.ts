import initialProjectsData from './initialProjects.json';
export type ProjectTier = 'S' | 'A' | 'B';

export interface ProjectRecord {
  id: string;
  name: string;
  description: string;
  longDescription?: string | null;
  category?: string;
  imageUrl?: string | null;
  galleryImages?: string[];
  tier?: ProjectTier;
  rank?: number | null;
  verdict?: string | null;
  highlights?: string[];
  authorHandle: string;
  techStack: string[];
  repositoryUrl: string;
  liveDemoUrl?: string | null;
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
  avatarUrl?: string | null;
  verifiedRoles: string[];
  createdAtUtc: string;
}

export interface AuthSessionResponse {
  token: string;
  developer: DeveloperProfile;
}

export interface RequestCodePayload {
  discordUsername: string;
  purpose?: 'register' | 'reset';
}

export interface RegisterPayload {
  verificationCode: string;
  email: string;
  password: string;
  displayName?: string;
}

export interface LoginPayload {
  identifier: string;
  password: string;
}

export interface ResetPasswordPayload {
  verificationCode: string;
  newPassword: string;
}

export interface UpdateProjectPayload {
  name: string;
  description: string;
  longDescription?: string | null;
  category?: string;
  imageUrl?: string | null;
  techStack: string[];
  repositoryUrl: string;
  liveDemoUrl?: string | null;
}

export interface SubmissionPayload {
  name: string;
  description: string;
  longDescription?: string | null;
  category?: string;
  imageUrl?: string | null;
  authorHandle: string;
  contactInfo: string;
  techStack: string[];
  repositoryUrl: string;
  liveDemoUrl?: string | null;
}

export interface TakedownPayload {
  requesterContact: string;
  reason: string;
}

export interface TakedownResponse {
  id: string;
  projectId: string;
  status: string;
  requestedAtUtc: string;
  message: string;
}

export interface ProjectQueryParams {
  search?: string;
  tag?: string;
}

export class ApiError extends Error {
  public readonly status: number;
  public readonly fieldErrors?: Record<string, string[]>;

  constructor(message: string, status: number, fieldErrors?: Record<string, string[]>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

const rawBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
export const API_BASE_URL = rawBaseUrl.replace(/\/+$/, '');
export const TAKEDOWN_CONTACT_EMAIL =
  import.meta.env.VITE_TAKEDOWN_EMAIL || 'moderation@stratahu.dev';

const FALLBACK_STORAGE_KEY = 'stratahu_fallback_projects_v6';
const AUTH_TOKEN_KEY = 'stratahu_auth_token_v1';
const AUTH_USER_KEY = 'stratahu_auth_user_v1';

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function getStoredDeveloper(): DeveloperProfile | null {
  try {
    const raw = localStorage.getItem(AUTH_USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as DeveloperProfile;
  } catch {
    return null;
  }
}

export function saveAuthSession(session: AuthSessionResponse): void {
  try {
    localStorage.setItem(AUTH_TOKEN_KEY, session.token);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(session.developer));
  } catch {
    // Ignore storage errors
  }
}

export function clearAuthSession(): void {
  try {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
  } catch {
    // Ignore storage errors
  }
}

function getAuthHeaders(): Record<string, string> {
  const token = getStoredToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function extractGithubRepoOwner(repoUrl?: string | null): string | null {
  if (!repoUrl) return null;
  try {
    const parsed = new URL(repoUrl);
    if (!parsed.hostname.toLowerCase().endsWith('github.com')) return null;
    const parts = parsed.pathname.split('/').filter(Boolean);
    return parts.length >= 2 ? parts[0].toLowerCase() : null;
  } catch {
    return null;
  }
}

export function canManageProject(
  user: DeveloperProfile | null | undefined,
  project: Pick<ProjectRecord, 'ownerUserId' | 'ownerDiscordId' | 'authorHandle' | 'repositoryUrl'> | null | undefined
): boolean {
  if (!user || !project) return false;
  if (project.ownerUserId && project.ownerUserId === user.id) return true;
  if (project.ownerDiscordId && project.ownerDiscordId === user.discordUserId) return true;

  const cleanAuthor = project.authorHandle.trim().replace(/^@+/, '').toLowerCase();
  const gh = user.githubHandle.trim().replace(/^@+/, '').toLowerCase();
  const disc = user.discordUsername.trim().replace(/^@+/, '').toLowerCase();

  if (cleanAuthor.length >= 2 && (cleanAuthor === gh || (disc.length >= 2 && cleanAuthor === disc))) {
    return true;
  }

  const repoOwner = extractGithubRepoOwner(project.repositoryUrl);
  return Boolean(gh.length >= 2 && repoOwner && repoOwner === gh);
}

/**
 * Resolves the real screenshot or Discord OpenGraph embed header image for a project.
 * If no explicit imageUrl is set and the repository is on GitHub, automatically uses
 * GitHub's OpenGraph / Discord embed image (`https://opengraph.githubassets.com/1/<owner>/<repo>`).
 */
export function getProjectShowcaseImage(
  project: Pick<
    ProjectRecord,
    'name' | 'category' | 'techStack' | 'imageUrl' | 'tier' | 'liveDemoUrl' | 'repositoryUrl'
  >
): string | null {
  if (project.imageUrl && project.imageUrl.trim().length > 0) {
    return project.imageUrl.trim();
  }
  return null;
}

export function getGeneratedFallbackSvg(
  project: Pick<ProjectRecord, 'name' | 'category' | 'techStack' | 'liveDemoUrl' | 'repositoryUrl'>
): string {
  const palettes: Record<string, { bg1: string; bg2: string; accent: string }> = {
    'Oktatás & e-Kréta': { bg1: '#0f172a', bg2: '#1e1b4b', accent: '#38bdf8' },
    'Web & Alkotói eszközök': { bg1: '#1a1228', bg2: '#2e1065', accent: '#e879f9' },
    'Infrastruktúra & DevOps': { bg1: '#0c191e', bg2: '#112a32', accent: '#2dd4bf' },
    'Mesterséges intelligencia & NLP': { bg1: '#171923', bg2: '#1e293b', accent: '#fbbf24' },
    'Parancssor & Fejlesztői eszközök': { bg1: '#111827', bg2: '#1f2937', accent: '#818cf8' },
    'Játék & Klasszikusok': { bg1: '#1b1320', bg2: '#31102f', accent: '#fb7185' }
  };

  const theme =
    palettes[project.category || 'Parancssor & Fejlesztői eszközök'] ||
    palettes['Parancssor & Fejlesztői eszközök'];
  const safeName = project.name.replace(/[<>&"']/g, '');
  const safeCategory = (project.category || 'Magyar projekt').replace(/[<>&"']/g, '');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" width="800" height="500">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${theme.bg1}"/>
        <stop offset="100%" stop-color="${theme.bg2}"/>
      </linearGradient>
    </defs>
    <rect width="800" height="500" fill="url(#bg)"/>
    <rect x="65" y="65" width="670" height="370" rx="22" fill="#0b0e17" fill-opacity="0.88" stroke="#ffffff" stroke-opacity="0.12"/>
    <text x="115" y="215" fill="${theme.accent}" font-family="Inter, system-ui, sans-serif" font-size="16" font-weight="600">${safeCategory}</text>
    <text x="115" y="275" fill="#f8fafc" font-family="Inter, system-ui, sans-serif" font-size="44" font-weight="700">${safeName}</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const INITIAL_SHOWCASE_PROJECTS: ProjectRecord[] = initialProjectsData as ProjectRecord[];

function getLocalFallbackProjects(): ProjectRecord[] {
  try {
    const raw = localStorage.getItem(FALLBACK_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw) as ProjectRecord[];
    }
  } catch {
    // Ignore storage errors
  }
  return [...INITIAL_SHOWCASE_PROJECTS];
}

function saveLocalFallbackProjects(records: ProjectRecord[]): void {
  try {
    localStorage.setItem(FALLBACK_STORAGE_KEY, JSON.stringify(records));
  } catch {
    // Ignore storage errors
  }
}

async function parseErrorResponse(response: Response): Promise<ApiError> {
  try {
    const body = await response.json();
    const message =
      body?.title ||
      body?.message ||
      body?.detail ||
      `A kérés sikertelen volt (HTTP ${response.status})`;
    const fieldErrors =
      body?.errors && typeof body.errors === 'object'
        ? (body.errors as Record<string, string[]>)
        : undefined;
    return new ApiError(message, response.status, fieldErrors);
  } catch {
    return new ApiError(`HTTP hiba (${response.status}): ${response.statusText}`, response.status);
  }
}

export async function fetchProjects(params?: ProjectQueryParams): Promise<ProjectRecord[]> {
  const url = new URL(`${API_BASE_URL}/api/projects`);

  if (params?.search?.trim()) {
    url.searchParams.set('search', params.search.trim());
  }
  if (params?.tag?.trim()) {
    url.searchParams.set('tag', params.tag.trim());
  }

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Accept: 'application/json'
      }
    });

    if (!response.ok) {
      throw await parseErrorResponse(response);
    }

    return (await response.json()) as ProjectRecord[];
  } catch (err) {
    if (err instanceof ApiError) {
      throw err;
    }
    return getLocalFallbackProjects();
  }
}

export async function submitProject(payload: SubmissionPayload): Promise<ProjectRecord> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw await parseErrorResponse(response);
    }

    return (await response.json()) as ProjectRecord;
  } catch (err) {
    if (err instanceof ApiError) {
      throw err;
    }

    const storedUser = getStoredDeveloper();
    const normalizedHandle = payload.authorHandle.trim().startsWith('@')
      ? payload.authorHandle.trim()
      : `@${payload.authorHandle.trim()}`;

    const created: ProjectRecord = {
      id: crypto.randomUUID(),
      name: payload.name.trim(),
      description: payload.description.trim(),
      longDescription: payload.longDescription?.trim() || payload.description.trim(),
      category: payload.category?.trim() || 'Parancssor & Fejlesztői eszközök',
      imageUrl: payload.imageUrl?.trim() || null,
      tier: 'A',
      verdict: 'Közösségi beküldés — szerkesztői értékelés alatt.',
      authorHandle: normalizedHandle,
      techStack: payload.techStack,
      repositoryUrl: payload.repositoryUrl.trim(),
      liveDemoUrl: payload.liveDemoUrl?.trim() || null,
      ownerUserId: storedUser?.id || null,
      ownerDiscordId: storedUser?.discordUserId || null,
      createdAtUtc: new Date().toISOString()
    };

    const existing = getLocalFallbackProjects();
    saveLocalFallbackProjects([created, ...existing]);
    return created;
  }
}

export async function requestDiscordVerificationCode(
  payload: RequestCodePayload
): Promise<{ sent: boolean; discordUsername: string; githubHandle: string; message: string }> {
  const response = await fetch(`${API_BASE_URL}/api/auth/request-code`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw await parseErrorResponse(response);
  }

  return (await response.json()) as {
    sent: boolean;
    discordUsername: string;
    githubHandle: string;
    message: string;
  };
}

export async function registerCertifiedDeveloper(payload: RegisterPayload): Promise<AuthSessionResponse> {
  const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw await parseErrorResponse(response);
  }

  const session = (await response.json()) as AuthSessionResponse;
  saveAuthSession(session);
  return session;
}

export async function loginDeveloper(payload: LoginPayload): Promise<AuthSessionResponse> {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw await parseErrorResponse(response);
  }

  const session = (await response.json()) as AuthSessionResponse;
  saveAuthSession(session);
  return session;
}

export async function resetDeveloperPassword(payload: ResetPasswordPayload): Promise<AuthSessionResponse> {
  const response = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw await parseErrorResponse(response);
  }

  const session = (await response.json()) as AuthSessionResponse;
  saveAuthSession(session);
  return session;
}

export async function fetchCurrentDeveloper(): Promise<DeveloperProfile | null> {
  const token = getStoredToken();
  if (!token) return null;

  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`
      }
    });

    if (response.status === 401 || response.status === 403) {
      clearAuthSession();
      return null;
    }

    if (!response.ok) {
      return getStoredDeveloper();
    }

    const body = (await response.json()) as { developer: DeveloperProfile };
    saveAuthSession({ token, developer: body.developer });
    return body.developer;
  } catch {
    return getStoredDeveloper();
  }
}

export async function updateProject(
  projectId: string,
  payload: UpdateProjectPayload
): Promise<ProjectRecord> {
  const response = await fetch(`${API_BASE_URL}/api/projects/${encodeURIComponent(projectId)}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...getAuthHeaders()
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw await parseErrorResponse(response);
  }

  return (await response.json()) as ProjectRecord;
}

export async function autoTakedownProject(
  projectId: string,
  reason?: string
): Promise<TakedownResponse> {
  const response = await fetch(
    `${API_BASE_URL}/api/projects/${encodeURIComponent(projectId)}/auto-takedown`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify({ reason: reason || '' })
    }
  );

  if (!response.ok) {
    throw await parseErrorResponse(response);
  }

  return (await response.json()) as TakedownResponse;
}

export async function submitTakedownNotice(
  projectId: string,
  payload: TakedownPayload
): Promise<TakedownResponse> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/projects/${encodeURIComponent(projectId)}/takedown`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify(payload)
      }
    );

    if (!response.ok) {
      throw await parseErrorResponse(response);
    }

    return (await response.json()) as TakedownResponse;
  } catch (err) {
    if (err instanceof ApiError) {
      throw err;
    }

    return {
      id: crypto.randomUUID(),
      projectId,
      status: 'PendingAudit',
      requestedAtUtc: new Date().toISOString(),
      message:
        'Az eltávolítási kérelmet rögzítettük. Az eredeti alkotóktól érkező kérelmeket 24 órán belül végrehajtjuk.'
    };
  }
}

export function buildTakedownMailtoUrl(
  project: Pick<ProjectRecord, 'id' | 'name' | 'repositoryUrl'>
): string {
  const subject = `[ELTÁVOLÍTÁSI KÉRELEM] ${project.name} (ID: ${project.id})`;
  const bodyLines = [
    'Tisztelt StrataHu Moderációs Csapat!',
    '',
    'Az alábbi projekt eredeti alkotójaként / jogosultjaként kérem a projekt eltávolítását a StrataHu gyűjteményből:',
    '',
    `- Projekt neve: ${project.name}`,
    `- Projekt azonosító (ID): ${project.id}`,
    `- Forráskód URL: ${project.repositoryUrl}`,
    '- Jogosultság igazolása (GitHub profil / domain / e-mail): ',
    '',
    'Kérem az eltávolítás 24 órán belüli végrehajtását.',
    '',
    'Üdvözlettel,'
  ];

  const params = new URLSearchParams({
    subject,
    body: bodyLines.join('\n')
  });

  return `mailto:${TAKEDOWN_CONTACT_EMAIL}?${params.toString().replace(/\+/g, '%20')}`;
}
