import {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  Colors,
  EmbedBuilder
} from 'discord.js';
import fs from 'fs';
import path from 'path';

export interface CatalogProject {
  id: string;
  name: string;
  description?: string;
  longDescription?: string;
  category?: string;
  imageUrl?: string | null;
  galleryImages?: string[];
  tier?: string;
  rank?: number;
  highlights?: string[];
  authorHandle?: string;
  techStack?: string[];
  repositoryUrl?: string;
  liveDemoUrl?: string | null;
}

export interface ProjectEmbedOptions {
  titlePrefix?: string;
  color?: number;
  authorLabel?: string;
  categoryLabel?: string;
  tierLabel?: string;
  techLabel?: string;
  repoButtonLabel?: string;
  demoButtonLabel?: string;
  footerText?: string;
  includeHighlights?: boolean;
}

const GITHUB_RAW_PUBLIC_BASE = 'https://raw.githubusercontent.com/CsPS0/StrataHu/main/frontend/public';

/** Resolve a workspace file whether executed from repo root or discord-bot/. */
function resolveWorkspaceFile(relativeSegments: string[]): string | null {
  const candidates = [
    path.resolve(process.cwd(), ...relativeSegments),
    path.resolve(process.cwd(), '..', ...relativeSegments),
    path.resolve(__dirname, '..', '..', ...relativeSegments)
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

/** Load the shared StrataHu project catalog JSON from disk. */
export function loadCatalogProjects(): CatalogProject[] {
  const catalogFile =
    resolveWorkspaceFile(['projects_catalog.json']) ||
    resolveWorkspaceFile(['frontend', 'src', 'services', 'initialProjects.json']);
  if (!catalogFile) return [];
  return JSON.parse(fs.readFileSync(catalogFile, 'utf-8')) as CatalogProject[];
}

export function isValidHttpUrl(raw?: string | null): raw is string {
  if (!raw || /\s/.test(raw)) return false;
  try {
    const parsed = new URL(raw);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/** Pick a random project, strongly preferring entries with verified visuals. */
export function pickRandomShowcaseProject(projects: CatalogProject[]): CatalogProject | undefined {
  const withVisuals = projects.filter((p) => Boolean(p.imageUrl && p.repositoryUrl));
  const pool = withVisuals.length > 0 ? withVisuals : projects;
  if (pool.length === 0) return undefined;
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Attach local `/screenshots/...` files or external HTTPS images to an EmbedBuilder,
 * falling back to the branded StrataHu server icon so zero embeds lack visuals.
 */
export function resolveProjectVisuals(embed: EmbedBuilder, project: CatalogProject): AttachmentBuilder[] {
  const candidates = [project.imageUrl, ...(project.galleryImages || [])].filter(
    (u): u is string => typeof u === 'string' && u.trim().length > 0
  );

  for (const rawUrl of candidates) {
    const trimmed = rawUrl.trim();
    if (trimmed.startsWith('/')) {
      const relPosix = trimmed.replace(/^\/+/, '');
      const localPath = resolveWorkspaceFile(['frontend', 'public', ...relPosix.split('/')]);
      if (localPath) {
        const attachmentName = path.basename(localPath).replace(/[^a-zA-Z0-9._-]/g, '-');
        const attachment = new AttachmentBuilder(localPath, { name: attachmentName });
        embed.setImage(`attachment://${attachmentName}`);
        return [attachment];
      }
      embed.setImage(`${GITHUB_RAW_PUBLIC_BASE}/${relPosix}`);
      return [];
    }

    if (isValidHttpUrl(trimmed)) {
      embed.setImage(trimmed);
      return [];
    }
  }

  const fallbackIcon = resolveWorkspaceFile(['discord-bot', 'assets', 'server-icon.jpg']) ||
    resolveWorkspaceFile(['assets', 'server-icon.jpg']);
  if (fallbackIcon) {
    const attachment = new AttachmentBuilder(fallbackIcon, { name: 'stratahu-icon.jpg' });
    embed.setThumbnail('attachment://stratahu-icon.jpg');
    return [attachment];
  }

  return [];
}

/** Build a complete Discord message payload (embed, link buttons, and local attachments) for a project. */
export function buildProjectEmbedPayload(
  project: CatalogProject,
  options: ProjectEmbedOptions = {}
): {
  embeds: EmbedBuilder[];
  components: ActionRowBuilder<ButtonBuilder>[];
  files: AttachmentBuilder[];
} {
  const tierColor =
    options.color ??
    (project.tier === 'S' ? Colors.Gold : project.tier === 'A' ? Colors.Purple : Colors.Green);

  const descriptionText = (project.longDescription || project.description || 'Magyar nyílt forráskódú projekt.').slice(0, 4000);
  const rankBadge = project.rank ? ` (#${project.rank})` : '';
  const techValue = ((project.techStack || []).join(' • ') || 'N/A').slice(0, 1000);

  const embed = new EmbedBuilder()
    .setTitle(`${options.titlePrefix ?? '🚀 '}${project.name}`)
    .setDescription(descriptionText)
    .setColor(tierColor)
    .addFields(
      { name: options.authorLabel ?? 'Készítő', value: project.authorHandle || 'Ismeretlen', inline: true },
      { name: options.categoryLabel ?? 'Kategória', value: project.category || 'Projekt', inline: true },
      { name: options.tierLabel ?? 'Besorolás', value: `${project.tier || 'B'} Tier${rankBadge}`, inline: true },
      { name: options.techLabel ?? 'Technológiák', value: techValue, inline: false }
    )
    .setFooter({ text: options.footerText ?? 'StrataHu Katalógus • 1 000 magyar projekt' })
    .setTimestamp();

  if (options.includeHighlights && project.highlights && project.highlights.length > 0) {
    const highlightsText = project.highlights.map((h) => `• ${h}`).join('\n').slice(0, 1000);
    embed.addFields({ name: '🌟 Kiemelkedő Jellemzők', value: highlightsText, inline: false });
  }

  const files = resolveProjectVisuals(embed, project);

  const row = new ActionRowBuilder<ButtonBuilder>();
  if (isValidHttpUrl(project.repositoryUrl)) {
    row.addComponents(
      new ButtonBuilder()
        .setLabel(options.repoButtonLabel ?? 'GitHub Repó')
        .setStyle(ButtonStyle.Link)
        .setURL(project.repositoryUrl)
    );
  }
  if (isValidHttpUrl(project.liveDemoUrl)) {
    row.addComponents(
      new ButtonBuilder()
        .setLabel(options.demoButtonLabel ?? 'Élő Oldal')
        .setStyle(ButtonStyle.Link)
        .setURL(project.liveDemoUrl)
    );
  }

  return {
    embeds: [embed],
    components: row.components.length > 0 ? [row] : [],
    files
  };
}
