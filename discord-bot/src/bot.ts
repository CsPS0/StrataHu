import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Client,
  Colors,
  EmbedBuilder,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  TextChannel
} from 'discord.js';
import fs from 'fs';
import path from 'path';
import { getDiscordConfig } from './config';
import { createRoleSelectorPayload, INTEREST_ROLES } from './roles';

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

const commands = [
  new SlashCommandBuilder()
    .setName('projekt')
    .setDescription('Magyar fejlesztésű projekt keresése a StrataHu katalógusban')
    .addStringOption((opt) =>
      opt.setName('nev').setDescription('A projekt neve vagy keresőszó').setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName('top10')
    .setDescription('A 10 legkiemelkedőbb magyar nyílt forráskódú projekt rangsora'),
  new SlashCommandBuilder()
    .setName('uj-bekuldes')
    .setDescription('Hogyan küldhetsz be új magyar fejlesztésű projektet a StrataHu-ra'),
  new SlashCommandBuilder()
    .setName('szerepkorok')
    .setDescription('Érdeklődési körök és fejlesztői szerepkörök beállítása a profilodhoz'),
  new SlashCommandBuilder()
    .setName('segitseg')
    .setDescription('A StrataHu Bot funkcióinak, szerepköreinek és csatornáinak bemutatása'),
  new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Bot késleltetés és kapcsolat ellenőrzése')
].map((cmd) => cmd.toJSON());

async function registerCommands(config: ReturnType<typeof getDiscordConfig>) {
  if (!config.clientId) return;
  const rest = new REST({ version: '10' }).setToken(config.token);

  try {
    console.log('Slash parancsok regisztrálása a Discordon...');
    if (config.guildId) {
      await rest.put(
        Routes.applicationGuildCommands(config.clientId, config.guildId),
        { body: commands }
      );
    } else {
      await rest.put(
        Routes.applicationCommands(config.clientId),
        { body: commands }
      );
    }
    console.log('✅ Slash parancsok sikeresen regisztrálva!');
  } catch (err: any) {
    console.warn('Slash parancs regisztráció figyelmeztetés:', err.message);
  }
}

async function startBot() {
  const config = getDiscordConfig();
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildMembers
    ]
  });

  client.once('ready', async () => {
    console.log(`🤖 StrataHu Discord Bot aktív: ${client.user?.tag}`);
    await registerCommands(config);
  });

  // =========================================================================
  // AUTOMATIZÁCIÓ: Új tagok automatikus kezelése (Auto-Role & Üdvözlés)
  // =========================================================================
  client.on('guildMemberAdd', async (member) => {
    try {
      console.log(`👋 Új tag csatlakozott a szerverhez: ${member.user.tag} (${member.id})`);

      // 1. Auto-Role: Közösségi Tag szerepkör automatikus kiosztása (emoji nélkül)
      const defaultRole = member.guild.roles.cache.find((r) => r.name === 'Közösségi Tag');
      if (defaultRole) {
        await member.roles.add(defaultRole, 'Automatikus kezdő szerepkör új tagoknak');
        console.log(`  ✓ "Közösségi Tag" szerepkör sikeresen hozzárendelve: ${member.user.tag}`);
      }

      // 2. Automatikus üdvözlés a közösségi társalgóban
      const generalChannel = member.guild.channels.cache.find(
        (c) => c.isTextBased() && c.name.includes('általános-társalgó')
      ) as TextChannel | undefined;

      const roleChannel = member.guild.channels.cache.find(
        (c) => c.isTextBased() && c.name.includes('szerepkör-választó')
      );

      if (generalChannel) {
        const welcomeEmbed = new EmbedBuilder()
          .setTitle(`🎉 Üdvözlünk a StrataHu közösségben, ${member.user.displayName || member.user.username}!`)
          .setColor(Colors.Green)
          .setDescription(
            `Nagyon örülünk, hogy csatlakoztál a hazai fejlesztői ökoszisztéma platformjához!\n\n` +
            `✅ Automatikusan megkaptad a **Közösségi Tag** szerepkört.\n\n` +
            (roleChannel
              ? `🎯 **Első lépés:** Ugorj be a <#${roleChannel.id}> szobába és válaszd ki, milyen technológiák és területek érdekelnek a legjobban!\n\n`
              : '') +
            `💬 Köszönj be bátran, mutasd be magad vagy oszd meg a legújabb fejlesztésedet!`
          )
          .setThumbnail(member.user.displayAvatarURL())
          .setFooter({ text: 'StrataHu • Magyar Fejlesztői Közösség' })
          .setTimestamp();

        await generalChannel.send({
          content: `Mindenki köszöntse szeretettel új tagunkat: <@${member.id}>! 🚀`,
          embeds: [welcomeEmbed]
        });
      }
    } catch (err: any) {
      console.error('Hiba az új tag automatikus inicializálásakor (guildMemberAdd):', err.message);
    }
  });

  // =========================================================================
  // INTERAKCIÓK: Slash parancsok, Dropdown menük és Gombok kezelése
  // =========================================================================
  client.on('interactionCreate', async (interaction) => {
    // 1. Szerepkör választó dropdown menü interakció
    if (interaction.isStringSelectMenu() && interaction.customId === 'select_developer_roles') {
      if (!interaction.guild || !interaction.member) return;

      try {
        const selectedRoleNames = interaction.values;
        const guildRoles = await interaction.guild.roles.fetch();
        const member = await interaction.guild.members.fetch(interaction.user.id);

        const added: string[] = [];
        const removed: string[] = [];

        for (const spec of INTEREST_ROLES) {
          const role = guildRoles.find((r) => r.name === spec.name);
          if (!role) continue;

          const isSelected = selectedRoleNames.includes(spec.name);
          const hasRole = member.roles.cache.has(role.id);

          if (isSelected && !hasRole) {
            await member.roles.add(role, 'Felhasználói szerepkör-választás');
            added.push(spec.name);
          } else if (!isSelected && hasRole) {
            await member.roles.remove(role, 'Felhasználói szerepkör-visszavonás');
            removed.push(spec.name);
          }
        }

        let desc = '✨ **A profilod szerepkörei sikeresen frissítve lettek!**\n\n';
        if (selectedRoleNames.length > 0) {
          desc += `**Aktív kiválasztott területeid:**\n` + selectedRoleNames.map((s) => `• **${s}**`).join('\n');
        } else {
          desc += '*Egyetlen szakterületi szerepkört sem jelöltél be.*';
        }

        if (added.length > 0) {
          desc += `\n\n🟢 **Hozzáadva:** ${added.join(', ')}`;
        }
        if (removed.length > 0) {
          desc += `\n🔴 **Eltávolítva:** ${removed.join(', ')}`;
        }

        await interaction.reply({
          content: desc,
          ephemeral: true
        });
      } catch (err: any) {
        console.error('Hiba a szerepkör dropdown kezelésekor:', err.message);
        await interaction.reply({
          content: `⚠️ Hiba történt a szerepkörök módosítása során: ${err.message}`,
          ephemeral: true
        });
      }
      return;
    }

    // 2. Gomb interakciók (Visszaállítás és Saját szerepkörök ellenőrzése)
    if (interaction.isButton()) {
      if (!interaction.guild || !interaction.member) return;

      if (interaction.customId === 'clear_developer_roles') {
        try {
          const guildRoles = await interaction.guild.roles.fetch();
          const member = await interaction.guild.members.fetch(interaction.user.id);

          const removed: string[] = [];
          for (const spec of INTEREST_ROLES) {
            const role = guildRoles.find((r) => r.name === spec.name);
            if (role && member.roles.cache.has(role.id)) {
              await member.roles.remove(role, 'Szerepkörök törlése gomb');
              removed.push(spec.name);
            }
          }

          await interaction.reply({
            content:
              removed.length > 0
                ? `🧹 Sikeresen eltávolítottad az összes választott szakterületi szerepkört:\n${removed.map((r) => `• ~~${r}~~`).join('\n')}`
                : 'ℹ️ Jelenleg nem rendelkezel egyetlen törölhető szakterületi szerepkörrel sem.',
            ephemeral: true
          });
        } catch (err: any) {
          await interaction.reply({
            content: `⚠️ Hiba történt: ${err.message}`,
            ephemeral: true
          });
        }
        return;
      }

      if (interaction.customId === 'check_my_roles') {
        try {
          const member = await interaction.guild.members.fetch(interaction.user.id);
          const currentRoles = member.roles.cache
            .filter((r) => r.name !== '@everyone')
            .map((r) => `• **${r.name}**`)
            .join('\n');

          await interaction.reply({
            content: `👤 **Jelenlegi szerepköreid a StrataHu szerveren:**\n\n${currentRoles || '*Nincs kiosztott szerepköröd.*'}`,
            ephemeral: true
          });
        } catch (err: any) {
          await interaction.reply({
            content: `⚠️ Hiba történt: ${err.message}`,
            ephemeral: true
          });
        }
        return;
      }
    }

    // 3. Slash Parancsok
    if (!interaction.isChatInputCommand()) return;

    const { commandName } = interaction;
    const projects = getCatalogProjects();

    if (commandName === 'ping') {
      const ping = Math.round(client.ws.ping);
      await interaction.reply({
        content: `🏓 Pong! Késleltetés: **${ping} ms**. A StrataHu AI Bot üzemkész.`,
        ephemeral: true
      });
      return;
    }

    if (commandName === 'szerepkorok') {
      const payload = createRoleSelectorPayload();
      await interaction.reply({
        ...payload,
        ephemeral: true
      });
      return;
    }

    if (commandName === 'segitseg') {
      const helpEmbed = new EmbedBuilder()
        .setTitle('📚 StrataHu Bot — Útmutató & Parancsok')
        .setColor(Colors.Indigo)
        .setDescription(
          'A StrataHu AI Bot a magyar fejlesztői közösség hivatalos asszisztense. ' +
          'Kereshetsz projekteket, megnézheted a ranglistát, vagy testreszabhatod a szerepköreidet.'
        )
        .addFields(
          {
            name: '🤖 Elérhető parancsok',
            value:
              '• `/projekt nev:<keresés>` — Magyar fejlesztés részleteinek lekérése\n' +
              '• `/top10` — A 10 legkiemelkedőbb hazai projekt ranglistája\n' +
              '• `/szerepkorok` — Szakterületek és érdeklődési körök beállítása\n' +
              '• `/uj-bekuldes` — Útmutató saját projekt beküldéséhez a katalógusba\n' +
              '• `/ping` — Kapcsolat és válaszidő ellenőrzése'
          },
          {
            name: '🎭 Szerepkör-választó szoba',
            value:
              'Látogass el a `#🎭・szerepkör-választó` csatornába, ahol az állandó interaktív menüben bármikor bejelölheted a technológiáidat!'
          },
          {
            name: '🌐 Weboldal & Katalógus',
            value: '[http://localhost:3000](http://localhost:3000) (stratahu.dev)'
          }
        )
        .setFooter({ text: 'StrataHu Közösségi Automatizáció' });

      await interaction.reply({ embeds: [helpEmbed], ephemeral: true });
      return;
    }

    if (commandName === 'projekt') {
      const query = interaction.options.getString('nev', true).toLowerCase().trim();
      const match = projects.find(
        (p: any) =>
          p.name.toLowerCase().includes(query) ||
          p.description.toLowerCase().includes(query) ||
          (p.techStack || []).some((t: string) => t.toLowerCase() === query)
      );

      if (!match) {
        await interaction.reply({
          content: `Nem találtam projektet a következőre: **"${query}"**.\nNézd meg a teljes listát: http://localhost:3000/`,
          ephemeral: true
        });
        return;
      }

      const embed = new EmbedBuilder()
        .setTitle(`🚀 ${match.name}`)
        .setDescription(match.longDescription || match.description)
        .setColor(match.tier === 'S' ? Colors.Gold : match.tier === 'A' ? Colors.Purple : Colors.Green)
        .addFields(
          { name: 'Készítő', value: match.authorHandle, inline: true },
          { name: 'Kategória', value: match.category || 'Projekt', inline: true },
          { name: 'Besorolás', value: `${match.tier || 'B'} Tier`, inline: true },
          { name: 'Technológiák', value: (match.techStack || []).join(' • '), inline: false }
        )
        .setFooter({ text: 'StrataHu Katalógus • 1 000 magyar projekt' })
        .setTimestamp();

      if (match.imageUrl && (match.imageUrl.startsWith('http://') || match.imageUrl.startsWith('https://'))) {
        embed.setImage(match.imageUrl);
      }

      const row = new ActionRowBuilder<ButtonBuilder>();
      if (match.repositoryUrl) {
        row.addComponents(
          new ButtonBuilder().setLabel('GitHub').setStyle(ButtonStyle.Link).setURL(match.repositoryUrl)
        );
      }
      if (match.liveDemoUrl) {
        row.addComponents(
          new ButtonBuilder().setLabel('Élő oldal').setStyle(ButtonStyle.Link).setURL(match.liveDemoUrl)
        );
      }

      await interaction.reply({
        embeds: [embed],
        components: row.components.length > 0 ? [row] : []
      });
      return;
    }

    if (commandName === 'top10') {
      const top10 = projects
        .filter((p: any) => typeof p.rank === 'number' && p.rank > 0)
        .sort((a: any, b: any) => a.rank - b.rank)
        .slice(0, 10);

      const embed = new EmbedBuilder()
        .setTitle('🏆 Top 10 Magyar Fejlesztés (StrataHu Ranglista)')
        .setColor(Colors.Gold)
        .setDescription(
          top10
            .map(
              (p: any) =>
                `**#${p.rank} [${p.name}](${p.repositoryUrl || p.liveDemoUrl})** — ${p.verdict || p.description}\n*Készítő: ${p.authorHandle} • ${p.category}*`
            )
            .join('\n\n')
        )
        .setFooter({ text: 'StrataHu • stratahu.dev' });

      await interaction.reply({ embeds: [embed] });
      return;
    }

    if (commandName === 'uj-bekuldes') {
      const embed = new EmbedBuilder()
        .setTitle('🚀 Saját projekt beküldése a StrataHu-ra')
        .setColor(Colors.Indigo)
        .setDescription(
          'Szeretnéd bemutatni a saját fejlesztésedet a magyar közösségnek?\n\n' +
          '1. Látogass el a **http://localhost:3000** (stratahu.dev) felületére.\n' +
          '2. Kattints az **„Új projekt beküldése”** gombra.\n' +
          '3. Add meg a projekt nevét, GitHub repóját, leírását és a technológiákat.\n\n' +
          'A beküldött projektek azonnal bekerülnek a katalógusba és közzétételre kerülnek a `#🔥・új-projektek` csatornában!'
        );

      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  });

  // Mentions listener
  client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    if (client.user && message.mentions.has(client.user)) {
      await message.reply(
        'Szia! 👋 A **StrataHu AI Közösségi Asszisztens** vagyok. Segítek eligazodni a hazai projektek között!\n' +
        'Használd a `/szerepkorok` parancsot a szakterületeid beállításához, a `/projekt` parancsot kereséshez, vagy a `/segitseg` parancsot a további részletekért.'
      );
    }
  });

  await client.login(config.token);
}

startBot().catch((err) => {
  console.error('Hiba a bot indításakor:', err.message);
  process.exit(1);
});
