import { Colors, EmbedBuilder, type Guild, type GuildMember, type TextChannel } from 'discord.js';
import {
  createOneTimeVerificationCode,
  getDiscordCertification,
  updateAccountRoles,
  upsertDiscordCertification,
  type PublicProjectRecord
} from './database';
import { buildProjectEmbedPayload } from './project-embeds';

export const CERTIFIED_DEVELOPER_ROLE_NAMES = [
  'Hitelesített Fejlesztő',
  'Kiemelt Fejlesztő',
  'Nyílt Forráskódú Alkotó',
  'Alapító / Admin',
  'Alapító Tag',
  'Moderátor'
] as const;

export function getMemberCertifiedRoles(member: GuildMember): string[] {
  const certifiedSet = new Set<string>(CERTIFIED_DEVELOPER_ROLE_NAMES);
  return member.roles.cache
    .filter((role) => certifiedSet.has(role.name))
    .map((role) => role.name);
}

export async function verifyGithubUser(githubUsername: string): Promise<{
  login: string;
  name: string | null;
  avatar_url: string;
  html_url: string;
  public_repos: number;
  followers: number;
}> {
  const res = await fetch(`https://api.github.com/users/${encodeURIComponent(githubUsername.trim())}`, {
    headers: {
      'User-Agent': 'StrataHu-Discord-Bot',
      Accept: 'application/vnd.github.v3+json'
    }
  });

  if (res.status === 404) {
    throw new Error(`NOT_FOUND:${githubUsername}`);
  }
  if (!res.ok) {
    throw new Error(`GitHub API válasz státuszkód: ${res.status}`);
  }

  return (await res.json()) as {
    login: string;
    name: string | null;
    avatar_url: string;
    html_url: string;
    public_repos: number;
    followers: number;
  };
}

export async function findGuildMemberByIdentifier(guild: Guild, identifier: string): Promise<GuildMember | null> {
  const clean = identifier.trim().replace(/^@+/, '');
  if (!clean) return null;

  if (/^\d{15,22}$/.test(clean)) {
    return await guild.members.fetch(clean).catch(() => null);
  }

  const lower = clean.toLowerCase();
  const cachedExact = guild.members.cache.find((m) => m.user.username.toLowerCase() === lower);
  if (cachedExact) return cachedExact;

  const searched = await guild.members.fetch({ query: clean, limit: 15 }).catch(() => null);
  if (!searched) return null;

  return (
    searched.find((m) => m.user.username.toLowerCase() === lower) ||
    searched.find((m) => (m.user.globalName || '').toLowerCase() === lower) ||
    null
  );
}

export interface LiveCertificationResult {
  certified: boolean;
  roles: string[];
  githubHandle: string;
  discordUsername: string;
  displayName: string;
  avatarUrl: string;
  reason?: string;
}

export async function inspectMemberCertification(
  guild: Guild,
  memberOrId: GuildMember | string
): Promise<LiveCertificationResult> {
  const member =
    typeof memberOrId === 'string'
      ? await guild.members.fetch(memberOrId).catch(() => null)
      : memberOrId;

  if (!member) {
    return {
      certified: false,
      roles: [],
      githubHandle: '',
      discordUsername: '',
      displayName: '',
      avatarUrl: '',
      reason: 'Nem található ilyen tag a StrataHu Discord szerveren.'
    };
  }

  const certifiedRoles = getMemberCertifiedRoles(member);
  const avatarUrl = member.user.displayAvatarURL({ size: 256 });
  const existingCert = getDiscordCertification(member.id);

  if (certifiedRoles.length === 0) {
    return {
      certified: false,
      roles: [],
      githubHandle: existingCert?.githubHandle || '',
      discordUsername: member.user.username,
      displayName: member.displayName || member.user.globalName || member.user.username,
      avatarUrl,
      reason:
        'A Discord profilodon még nincs aktív „Hitelesített Fejlesztő” szerepkör. Futtasd előbb a `/hitelesites github:<felhasznaloneved>` parancsot a Discord szerveren!'
    };
  }

  const githubHandle = existingCert?.githubHandle || '';
  if (existingCert) {
    upsertDiscordCertification({
      discordUserId: member.id,
      discordUsername: member.user.username,
      displayName: member.displayName || member.user.globalName || member.user.username,
      githubHandle,
      avatarUrl,
      roles: certifiedRoles
    });
  } else {
    updateAccountRoles(member.id, certifiedRoles, avatarUrl);
  }

  return {
    certified: true,
    roles: certifiedRoles,
    githubHandle,
    discordUsername: member.user.username,
    displayName: member.displayName || member.user.globalName || member.user.username,
    avatarUrl
  };
}

export async function issueDiscordCodeForMember(
  guild: Guild,
  member: GuildMember,
  purpose: 'register' | 'reset',
  sendDm: boolean
): Promise<{
  code: string;
  expiresAtUtc: string;
  cert: LiveCertificationResult;
  dmDelivered: boolean;
}> {
  const cert = await inspectMemberCertification(guild, member);
  if (!cert.certified) {
    throw new Error(cert.reason || 'Hiányzó Hitelesített Fejlesztő rang a Discord szerveren.');
  }

  const { code, expiresAtUtc } = createOneTimeVerificationCode({
    discordUserId: member.id,
    discordUsername: cert.discordUsername,
    displayName: cert.displayName,
    githubHandle: cert.githubHandle,
    avatarUrl: cert.avatarUrl,
    roles: cert.roles,
    purpose
  });

  let dmDelivered = false;
  if (sendDm) {
    const title =
      purpose === 'reset'
        ? '🔐 StrataHu Jelszó-visszaállítási Kód'
        : '🚀 StrataHu Webes Fejlesztői Fiók Aktiváló Kód';
    const dmEmbed = new EmbedBuilder()
      .setTitle(title)
      .setColor(Colors.Teal ?? 0x00565b)
      .setDescription(
        `Használd az alábbi egyszer használatos kódot a StrataHu weboldalán (**http://localhost:3000**):\n\n` +
        `# \`${code}\`\n\n` +
        `• **Hitelesített szerepkörök:** ${cert.roles.join(', ')}\n` +
        (cert.githubHandle ? `• **Összekapcsolt GitHub:** \`@${cert.githubHandle}\`\n` : '') +
        `• **Érvényesség:** 15 perc (egyszer használható)`
      )
      .setFooter({ text: 'Soha ne add meg ezt a kódot másnak! • StrataHu Auth' })
      .setTimestamp();

    try {
      await member.send({ embeds: [dmEmbed] });
      dmDelivered = true;
    } catch {
      dmDelivered = false;
    }
  }

  return { code, expiresAtUtc, cert, dmDelivered };
}

export async function notifyAuditLog(
  guild: Guild | null,
  title: string,
  description: string,
  color: number,
  fields: Array<{ name: string; value: string; inline?: boolean }> = []
): Promise<void> {
  if (!guild) return;
  try {
    const auditChannel = guild.channels.cache.find(
      (c) => c.isTextBased() && c.name.includes('audit-napló')
    ) as TextChannel | undefined;
    if (!auditChannel) return;

    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(description)
      .setColor(color)
      .addFields(fields)
      .setFooter({ text: 'StrataHu Alkotói Fiók & Moderációs Napló' })
      .setTimestamp();

    await auditChannel.send({ embeds: [embed] });
  } catch (err: any) {
    console.warn('Discord audit napló értesítési figyelmeztetés:', err?.message);
  }
}

export async function notifyShowcaseNewProject(guild: Guild | null, project: PublicProjectRecord): Promise<void> {
  if (!guild) return;
  try {
    const showcaseChannel = guild.channels.cache.find(
      (c) => c.isTextBased() && c.name.includes('új-projektek')
    ) as TextChannel | undefined;
    if (!showcaseChannel) return;

    const payload = buildProjectEmbedPayload(project, {
      titlePrefix: '🚀 Új beküldés: ',
      authorLabel: '👤 Készítő',
      categoryLabel: '📂 Kategória',
      tierLabel: '🏆 Besorolás',
      techLabel: '🛠️ Technológia',
      repoButtonLabel: 'GitHub Forráskód',
      demoButtonLabel: 'Élő Weboldal',
      footerText: 'StrataHu Web Piactér • Automatikus szinkron'
    });

    await showcaseChannel.send(payload);
  } catch (err: any) {
    console.warn('Discord projekt bemutató figyelmeztetés:', err?.message);
  }
}
