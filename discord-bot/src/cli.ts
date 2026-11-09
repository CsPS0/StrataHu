import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Client,
  Colors,
  EmbedBuilder,
  GatewayIntentBits,
  TextChannel
} from 'discord.js';
import fs from 'fs';
import path from 'path';
import { getDiscordConfig } from './config';
import { setupServer } from './setup-server';
import { setupCommunity } from './setup-community';

function getCatalogProjects(): any[] {
  const possiblePaths = [
    path.resolve(process.cwd(), '..', 'projects_catalog.json'),
    path.resolve(process.cwd(), '..', 'frontend', 'src', 'services', 'initialProjects.json'),
    path.resolve(process.cwd(), 'projects_catalog.json')
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return JSON.parse(fs.readFileSync(p, 'utf-8'));
    }
  }
  return [];
}

async function getClient(): Promise<Client> {
  const config = getDiscordConfig();
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.GuildMembers
    ]
  });
  return new Promise((resolve, reject) => {
    client.once('clientReady', () => resolve(client));
    client.login(config.token).catch(reject);
  });
}

async function handleStatus() {
  const config = getDiscordConfig();
  const client = await getClient();
  try {
    const guild = config.guildId
      ? await client.guilds.fetch({ guild: config.guildId, withCounts: true })
      : client.guilds.cache.first();

    if (!guild) {
      console.log('⚠️ A bot bejelentkezett, de nem lát még egyetlen szervert sem.');
      console.log('Hívd meg a botot a szerveredre az alábbi jogosultsági linkkel:');
      if (config.clientId) {
        console.log(
          `https://discord.com/api/oauth2/authorize?client_id=${config.clientId}&permissions=8&scope=bot%20applications.commands`
        );
      }
      return;
    }

    console.log(`\n=== DISCORD BOT STÁTUSZ ===`);
    console.log(`Bot azonosító: ${client.user?.tag} (${client.user?.id})`);
    console.log(`Szerver neve:  ${guild.name} (${guild.id})`);
    console.log(`Tagok száma:   ${guild.memberCount}`);

    const channels = await guild.channels.fetch();
    console.log(`Csatornák:     ${channels.size} db`);

    const roles = await guild.roles.fetch();
    console.log(`Szerepkörök:   ${roles.size} db`);
    console.log(`===========================\n`);
  } finally {
    client.destroy();
  }
}

async function handleAnnounce(title: string, content: string) {
  const config = getDiscordConfig();
  const client = await getClient();
  try {
    const guild = config.guildId
      ? await client.guilds.fetch({ guild: config.guildId, withCounts: true })
      : client.guilds.cache.first();

    if (!guild) throw new Error('Szerver nem található.');

    const channels = await guild.channels.fetch();
    const announceChannel = channels.find(
      (c) => c?.isTextBased() && c.name.includes('bejelentések')
    ) as TextChannel | undefined;

    if (!announceChannel) {
      throw new Error('Nem található a bejelentések csatorna! Futtasd a setup parancsot.');
    }

    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(content)
      .setColor(Colors.Gold)
      .setFooter({ text: 'StrataHu Közösségi Értesítő' })
      .setTimestamp();

    await announceChannel.send({ embeds: [embed] });
    console.log(`✅ Bejelentés sikeresen elküldve a #${announceChannel.name} csatornába!`);
  } finally {
    client.destroy();
  }
}

async function handlePostProject(projectNameOrId: string) {
  const config = getDiscordConfig();
  const projects = getCatalogProjects();
  const query = projectNameOrId.toLowerCase().trim();

  const project = projects.find(
    (p: any) => p.id === query || p.name.toLowerCase().includes(query)
  );

  if (!project) {
    console.error(`Nem található projekt ezzel a keresőkifejezéssel: "${projectNameOrId}"`);
    return;
  }

  const client = await getClient();
  try {
    const guild = config.guildId
      ? await client.guilds.fetch({ guild: config.guildId, withCounts: true })
      : client.guilds.cache.first();

    if (!guild) throw new Error('Szerver nem található.');

    const channels = await guild.channels.fetch();
    const showcaseChannel = channels.find(
      (c) => c?.isTextBased() && (c.name.includes('új-projektek') || c.name.includes('projektek'))
    ) as TextChannel | undefined;

    if (!showcaseChannel) {
      throw new Error('Nem található a projektek csatorna! Futtasd a setup parancsot.');
    }

    const embed = new EmbedBuilder()
      .setTitle(`🚀 ${project.name}`)
      .setDescription(project.longDescription || project.description)
      .setColor(project.tier === 'S' ? Colors.Gold : project.tier === 'A' ? Colors.Purple : Colors.Green)
      .addFields(
        { name: '👤 Készítő', value: project.authorHandle, inline: true },
        { name: '📂 Kategória', value: project.category || 'Projekt', inline: true },
        { name: '🏆 Besorolás', value: `${project.tier || 'B'} Tier ${project.rank ? `(#${project.rank})` : ''}`, inline: true },
        { name: '🛠️ Technológia', value: (project.techStack || []).join(' • '), inline: false }
      )
      .setFooter({ text: 'StrataHu • Magyar Fejlesztői Bemutató' })
      .setTimestamp();

    if (project.imageUrl && (project.imageUrl.startsWith('http://') || project.imageUrl.startsWith('https://'))) {
      embed.setImage(project.imageUrl);
    }

    const row = new ActionRowBuilder<ButtonBuilder>();
    if (project.repositoryUrl) {
      row.addComponents(
        new ButtonBuilder()
          .setLabel('GitHub Forráskód')
          .setStyle(ButtonStyle.Link)
          .setURL(project.repositoryUrl)
      );
    }
    if (project.liveDemoUrl) {
      row.addComponents(
        new ButtonBuilder()
          .setLabel('Élő Weboldal')
          .setStyle(ButtonStyle.Link)
          .setURL(project.liveDemoUrl)
      );
    }

    await showcaseChannel.send({
      embeds: [embed],
      components: row.components.length > 0 ? [row] : []
    });

    console.log(`✅ A(z) "${project.name}" projekt sikeresen be lett mutatva a #${showcaseChannel.name} csatornában!`);
  } finally {
    client.destroy();
  }
}

async function handlePostSeedProjects(limit: number = 5) {
  const projects = getCatalogProjects();
  const topProjects = projects.slice(0, limit);
  console.log(`Kiemelt projektek közzététele (${topProjects.length} db)...`);

  for (const p of topProjects) {
    await handlePostProject(p.name);
    await new Promise((r) => setTimeout(r, 1200));
  }
  console.log('✅ Kiemelt projektek közzététele befejeződött!');
}

async function handlePostWeeklySpotlight(projectName?: string) {
  const config = getDiscordConfig();
  const projects = getCatalogProjects();
  let project: any;

  if (projectName) {
    const q = projectName.toLowerCase().trim();
    project = projects.find((p: any) => p.name.toLowerCase().includes(q) || p.id === q);
  } else {
    const candidates = projects.filter((p: any) => p.tier === 'S' || (p.rank && p.rank <= 15));
    project = candidates[Math.floor(Math.random() * candidates.length)] || projects[0];
  }

  if (!project) {
    console.error('Nem található projekt a Hét Projektjéhez.');
    return;
  }

  const client = await getClient();
  try {
    const guild = config.guildId
      ? await client.guilds.fetch({ guild: config.guildId, withCounts: true })
      : client.guilds.cache.first();

    if (!guild) throw new Error('Szerver nem található.');

    const channels = await guild.channels.fetch();
    const starChannel = channels.find(
      (c) => c && c.isTextBased() && c.name.includes('hét-projektje')
    ) as TextChannel | undefined;

    if (!starChannel) throw new Error('Nem található a hét-projektje csatorna!');

    const embed = new EmbedBuilder()
      .setTitle(`⭐ A HÉT PROJEKTJE: ${project.name}`)
      .setColor(Colors.Gold)
      .setDescription(project.longDescription || project.description)
      .addFields(
        { name: '👤 Készítő / Szervezet', value: project.authorHandle, inline: true },
        { name: '📂 Kategória', value: project.category || 'Projekt', inline: true },
        { name: '🏆 Besorolás', value: `${project.tier || 'S'} Tier ${project.rank ? `(#${project.rank})` : ''}`, inline: true },
        { name: '🛠️ Technológiai Stack', value: (project.techStack || []).join(' • ') || 'N/A', inline: false }
      )
      .setFooter({ text: 'StrataHu • A Hét Kiemelt Magyar Projektje' })
      .setTimestamp();

    if (project.highlights && project.highlights.length > 0) {
      embed.addFields({
        name: '🌟 Kiemelkedő Jellemzők',
        value: project.highlights.map((h: string) => `• ${h}`).join('\n'),
        inline: false
      });
    }

    if (project.imageUrl && (project.imageUrl.startsWith('http://') || project.imageUrl.startsWith('https://'))) {
      embed.setImage(project.imageUrl);
    }

    const row = new ActionRowBuilder<ButtonBuilder>();
    if (project.repositoryUrl) {
      row.addComponents(
        new ButtonBuilder().setLabel('GitHub Repó').setStyle(ButtonStyle.Link).setURL(project.repositoryUrl)
      );
    }
    if (project.liveDemoUrl) {
      row.addComponents(
        new ButtonBuilder().setLabel('Élő Bemutató').setStyle(ButtonStyle.Link).setURL(project.liveDemoUrl)
      );
    }

    await starChannel.send({
      embeds: [embed],
      components: row.components.length > 0 ? [row] : []
    });

    console.log(`✅ A Hét Projektje (${project.name}) sikeresen közzétéve a #${starChannel.name} csatornában!`);
  } finally {
    client.destroy();
  }
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'status';

  try {
    switch (command) {
      case 'setup':
        await setupServer(args[1]);
        break;

      case 'setup-community': {
        const config = getDiscordConfig();
        const client = await getClient();
        const guild = config.guildId
          ? await client.guilds.fetch(config.guildId)
          : client.guilds.cache.first();
        if (!guild) throw new Error('Szerver nem található');
        await setupCommunity(guild);
        process.exit(0);
        break;
      }

      case 'status':
        await handleStatus();
        break;

      case 'announce': {
        const titleIndex = args.indexOf('--title');
        const contentIndex = args.indexOf('--content');
        const title = titleIndex !== -1 ? args[titleIndex + 1] : '📢 StrataHu Közösségi Hír';
        const content =
          contentIndex !== -1
            ? args[contentIndex + 1]
            : 'Üdvözlünk minden új tagot! Csatlakozz a beszélgetésekhez és mutasd be a legújabb fejlesztésedet!';
        await handleAnnounce(title, content);
        break;
      }

      case 'post-project': {
        const name = args[1] || 'Pala';
        await handlePostProject(name);
        break;
      }

      case 'post-seed-projects': {
        const count = parseInt(args[1] || '5', 10);
        await handlePostSeedProjects(count);
        break;
      }

      case 'post-weekly-spotlight': {
        const name = args[1];
        await handlePostWeeklySpotlight(name);
        break;
      }

      default:
        console.log(`Ismeretlen parancs: ${command}`);
        console.log('Elérhető parancsok: setup, status, announce, post-project, post-seed-projects, post-weekly-spotlight');
        break;
    }
  } catch (err: any) {
    console.error('Hiba történt a parancs futtatásakor:', err.message);
    process.exit(1);
  }
}

main();
