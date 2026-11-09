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
    .setName('hitelesites')
    .setDescription('Fejlesztői hitelesítés és profil összekapcsolása GitHub fiókkal')
    .addStringOption((opt) =>
      opt.setName('github').setDescription('A GitHub felhasználóneved (pl. octocat, yourname)').setRequired(true)
    ),
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
  // AUTOMATIZÁCIÓ: Új tagok és botok automatikus kezelése (Auto-Role & Gate)
  // =========================================================================
  client.on('guildMemberAdd', async (member) => {
    try {
      console.log(`👋 Új tag vagy bot csatlakozott a szerverhez: ${member.user.tag} (${member.id})`);

      // A) Ha BOT csatlakozik: Automatikus bot szerepkörök kiosztása
      if (member.user.bot) {
        const botRole = member.guild.roles.cache.find((r) => r.name === 'Botok');
        if (botRole) {
          await member.roles.add(botRole, 'Automatikus Bot szerepkör kiosztása');
        }

        const botUsername = member.user.username.toLowerCase();
        let specificRoleName: string | null = null;
        if (botUsername.includes('jockie') || botUsername.includes('music')) specificRoleName = 'Zene Bot';
        else if (botUsername.includes('amari')) specificRoleName = 'AmariBot';
        else if (botUsername.includes('sapphire')) specificRoleName = 'Sapphire';
        else if (botUsername.includes('wick') || botUsername.includes('beemo')) specificRoleName = 'Wick Védelem';
        else if (botUsername.includes('esmbot')) specificRoleName = 'esmBot';

        if (specificRoleName) {
          const specificRole = member.guild.roles.cache.find((r) => r.name === specificRoleName);
          if (specificRole) {
            await member.roles.add(specificRole, `Automatikus specifikus bot szerepkör: ${specificRoleName}`);
          }
        }

        console.log(`  🤖 Bot konfigurálva: ${member.user.tag} (${specificRoleName || 'Általános Bot'})`);
        return;
      }

      // B) Ha FELHASZNÁLÓ csatlakozik: Közösségi Tag szerepkör kiosztása és üdvözlés
      const defaultRole = member.guild.roles.cache.find((r) => r.name === 'Közösségi Tag');
      if (defaultRole) {
        await member.roles.add(defaultRole, 'Automatikus kezdő szerepkör új tagoknak');
        console.log(`  ✓ "Közösségi Tag" szerepkör sikeresen hozzárendelve: ${member.user.tag}`);
      }

      const generalChannel = member.guild.channels.cache.find(
        (c) => c.isTextBased() && c.name.includes('általános-társalgó')
      ) as TextChannel | undefined;

      const authChannel = member.guild.channels.cache.find(
        (c) => c.isTextBased() && c.name.includes('hitelesítés')
      );

      const roleChannel = member.guild.channels.cache.find(
        (c) => c.isTextBased() && c.name.includes('szerepkör-választó')
      );

      if (generalChannel) {
        const welcomeEmbed = new EmbedBuilder()
          .setTitle(`🎉 Üdvözlünk a StrataHu közösségben, ${member.user.displayName || member.user.username}!`)
          .setColor(Colors.Green)
          .setDescription(
            `Nagyon örülünk, hogy csatlakoztál a hazai fejlesztői ökoszisztéma platformjához!\n\n` +
            (authChannel
              ? `🔐 **Hitelesítés:** Látogass el a <#${authChannel.id}> szobába a tagságod megerősítéséhez és a bot-védelem feloldásához!\n`
              : '') +
            (roleChannel
              ? `🎯 **Szakterületek:** Válaszd ki a technológiáidat a <#${roleChannel.id}> szobában!\n\n`
              : '\n') +
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
  // INTERAKCIÓK: Gombok, Menük és Slash Parancsok
  // =========================================================================
  client.on('interactionCreate', async (interaction) => {
    // 1. GOMB INTERAKCIÓK: Hitelesítés, GitHub Info, Szerepkör Törlés/Ellenőrzés
    if (interaction.isButton()) {
      if (!interaction.guild || !interaction.member) return;

      // A) Tag Hitelesítése (Member Verification Button)
      if (interaction.customId === 'verify_member_button') {
        try {
          const guildRoles = await interaction.guild.roles.fetch();
          const verifiedRole = guildRoles.find((r) => r.name === 'Hitelesített Tag');
          const defaultRole = guildRoles.find((r) => r.name === 'Közösségi Tag');
          const member = await interaction.guild.members.fetch(interaction.user.id);

          if (verifiedRole) {
            await member.roles.add(verifiedRole, 'Sikeres tagi hitelesítés');
          }
          if (defaultRole && !member.roles.cache.has(defaultRole.id)) {
            await member.roles.add(defaultRole, 'Közösségi Tag szerepkör');
          }

          // Audit napló értesítés
          const auditChannel = interaction.guild.channels.cache.find(
            (c) => c.isTextBased() && c.name.includes('audit-napló')
          ) as TextChannel | undefined;

          if (auditChannel) {
            const auditEmbed = new EmbedBuilder()
              .setTitle('🔐 Sikeres Tag Hitelesítés')
              .setDescription(`**Tag:** <@${member.id}> (${member.user.tag})\n**Időpont:** <t:${Math.floor(Date.now() / 1000)}:R>`)
              .setColor(Colors.Green)
              .setTimestamp();
            await auditChannel.send({ embeds: [auditEmbed] });
          }

          await interaction.reply({
            content:
              '✅ **Sikeresen hitelesítetted magad!**\n\n' +
              'Megkaptad a **Hitelesített Tag** szerepkört. Mostantól teljes hozzáférésed van az összes beszélgetési csatornához és fórumhoz.\n\n' +
              '💡 *Tipp: Ha GitHub profilodat is szeretnéd összekapcsolni, használd a `/hitelesites github:<felhasznaloneved>` parancsot!*',
            ephemeral: true
          });
        } catch (err: any) {
          console.error('Hiba a hitelesítés gomb megnyomásakor:', err.message);
          await interaction.reply({
            content: `⚠️ Hiba történt a hitelesítés során: ${err.message}`,
            ephemeral: true
          });
        }
        return;
      }

      // B) GitHub Hitelesítés Info Gomb
      if (interaction.customId === 'github_auth_info_button') {
        const infoEmbed = new EmbedBuilder()
          .setTitle('🐙 GitHub Fejlesztői Hitelesítés Útmutató')
          .setColor(Colors.Blue)
          .setDescription(
            'A StrataHu közösségben összekapcsolhatod a Discord fiókodat a GitHub profiloddal.\n\n' +
            '🚀 **Hogyan működik?**\n' +
            '1. Írd be a parancssorba: `/hitelesites github:<felhasznaloneved>`\n' +
            '2. A bot lekérdezi a nyilvános profilodat (repók száma, követők, biográfia).\n' +
            '3. Automatikusan megkapod a **Hitelesített Fejlesztő** rangot!\n' +
            '4. Ha valamelyik repód szerepel a StrataHu 1 000 hazai projektje között, automatikusan megkapod a **Kiemelt Fejlesztő** vagy **Nyílt Forráskódú Alkotó** rangot is!'
          );

        await interaction.reply({
          embeds: [infoEmbed],
          ephemeral: true
        });
        return;
      }

      // C) Szerepkörök törlése
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

      // D) Saját szerepkörök megtekintése
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

    // 2. SZEREPKÖR VÁLASZTÓ DROPDOWN MENÜ
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

    // 3. SLASH PARANCSOK
    if (!interaction.isChatInputCommand()) return;

    const { commandName } = interaction;
    const projects = getCatalogProjects();

    // /hitelesites github:<felhasznalo>
    if (commandName === 'hitelesites') {
      const githubUsername = interaction.options.getString('github', true).trim();
      await interaction.deferReply({ ephemeral: true });

      try {
        const res = await fetch(`https://api.github.com/users/${encodeURIComponent(githubUsername)}`, {
          headers: {
            'User-Agent': 'StrataHu-Discord-Bot',
            Accept: 'application/vnd.github.v3+json'
          }
        });

        if (res.status === 404) {
          await interaction.editReply({
            content: `❌ Nem található GitHub profil ezzel a felhasználónévvel: **${githubUsername}**.\nKérlek ellenőrizd az írásmódot!`
          });
          return;
        }

        if (!res.ok) {
          throw new Error(`GitHub API válasz státuszkód: ${res.status}`);
        }

        const ghUser = await res.json();
        const guildRoles = await interaction.guild!.roles.fetch();
        const member = await interaction.guild!.members.fetch(interaction.user.id);

        // Szerepkörök kiosztása
        const devRole = guildRoles.find((r) => r.name === 'Hitelesített Fejlesztő');
        if (devRole && !member.roles.cache.has(devRole.id)) {
          await member.roles.add(devRole, `GitHub fiók hitelesítve: ${ghUser.login}`);
        }

        // Ellenőrizzük, hogy a készítőnek van-e projektje a StrataHu katalógusban
        const userProjects = projects.filter(
          (p: any) =>
            (p.authorHandle && p.authorHandle.toLowerCase().includes(ghUser.login.toLowerCase())) ||
            (p.repositoryUrl && p.repositoryUrl.toLowerCase().includes(`github.com/${ghUser.login.toLowerCase()}`))
        );

        let specialRoleGiven: string | null = null;
        if (userProjects.length > 0) {
          const featuredRole = guildRoles.find((r) => r.name === 'Kiemelt Fejlesztő') ||
                               guildRoles.find((r) => r.name === 'Nyílt Forráskódú Alkotó');
          if (featuredRole && !member.roles.cache.has(featuredRole.id)) {
            await member.roles.add(featuredRole, `StrataHu katalógus projekt alkotó: ${userProjects[0].name}`);
            specialRoleGiven = featuredRole.name;
          }
        }

        const embed = new EmbedBuilder()
          .setTitle(`🐙 Sikeres GitHub Hitelesítés: @${ghUser.login}`)
          .setColor(Colors.Green)
          .setThumbnail(ghUser.avatar_url)
          .setDescription(
            `A Discord fiókodat sikeresen összekapcsoltuk a **[${ghUser.login}](${ghUser.html_url})** GitHub profillal!\n\n` +
            `✅ Megkaptad a **Hitelesített Fejlesztő** szerepkört.\n` +
            (specialRoleGiven
              ? `🏆 **Gratulálunk!** A projekted szerepel a StrataHu katalógusban, ezért megkaptad a **${specialRoleGiven}** rangot is!\n`
              : '')
          )
          .addFields(
            { name: 'Név', value: ghUser.name || 'Nem megadott', inline: true },
            { name: 'Nyilvános Repók', value: `${ghUser.public_repos || 0} db`, inline: true },
            { name: 'Követők', value: `${ghUser.followers || 0} fő`, inline: true },
            {
              name: 'Kapcsolódó StrataHu Projektek',
              value:
                userProjects.length > 0
                  ? userProjects.map((p: any) => `• **${p.name}** (${p.category || 'Projekt'})`).join('\n')
                  : '*Még nincs regisztrált projekted a katalógusban. Küldd be a `/uj-bekuldes` paranccsal!*',
              inline: false
            }
          )
          .setFooter({ text: 'StrataHu Fejlesztői Hitelesítés • stratahu.dev' })
          .setTimestamp();

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setLabel('GitHub Profil Megnyitása')
            .setStyle(ButtonStyle.Link)
            .setURL(ghUser.html_url)
        );

        await interaction.editReply({
          embeds: [embed],
          components: [row]
        });

        // Üdvözlés és elismerés az általános társalgóban, ha katalógus projekt alkotója
        if (userProjects.length > 0) {
          const generalChannel = interaction.guild!.channels.cache.find(
            (c) => c.isTextBased() && c.name.includes('általános-társalgó')
          ) as TextChannel | undefined;

          if (generalChannel) {
            await generalChannel.send(
              `🎉 Gratulálunk <@${member.id}> fejlesztőnek, aki most hitelesítette magát mint a(z) **${userProjects[0].name}** készítője! Megkapta a **${specialRoleGiven || 'Hitelesített Fejlesztő'}** rangot!`
            );
          }
        }
      } catch (err: any) {
        console.error('Hiba a GitHub hitelesítés során:', err.message);
        await interaction.editReply({
          content: `⚠️ Hiba történt a GitHub fiók ellenőrzése során: ${err.message}`
        });
      }
      return;
    }

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
          'Kereshetsz projekteket, megnézheted a ranglistát, hitelesítheted a profilodat, vagy testreszabhatod a szerepköreidet.'
        )
        .addFields(
          {
            name: '🤖 Elérhető parancsok',
            value:
              '• `/hitelesites github:<név>` — Profil összekapcsolása GitHub fiókkal\n' +
              '• `/szerepkorok` — Szakterületek és érdeklődési körök beállítása\n' +
              '• `/projekt nev:<keresés>` — Magyar fejlesztés részleteinek lekérése\n' +
              '• `/top10` — A 10 legkiemelkedőbb hazai projekt ranglistája\n' +
              '• `/uj-bekuldes` — Útmutató saját projekt beküldéséhez a katalógusba\n' +
              '• `/ping` — Kapcsolat és válaszidő ellenőrzése'
          },
          {
            name: '🔐 Hitelesítés & Védelem',
            value:
              'Látogass el a `#🔐・hitelesítés` szobába, ahol egyetlen kattintással megerősítheted a tagságodat!'
          },
          {
            name: '🤖 Külső Botok (Zene, Amari, Sapphire, Wick, esmBot)',
            value:
              'A `#🤖・bot-útmutató` szobában megtalálod a szerveren működő ajánlott közösségi botok leírását és 1-kattintásos meghívóit.'
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
          'A beküldött projektek azonnal bekerülnek a katalógusba és közzétételre kerülnek a `#🔥・új-projektek` csatornában és a fórumokban!'
        );

      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  });

  // Mentions listener
  client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    if (client.user && message.mentions.has(client.user)) {
      await message.reply(
        'Szia! 👋 A **StrataHu AI Közösségi Asszisztens** vagyok.\n' +
        '• Hitelesítsd a tagságodat a `#🔐・hitelesítés` szobában, vagy kösd össze a GitHub fiókodat a `/hitelesites` paranccsal!\n' +
        '• Állítsd be a szakterületeidet a `/szerepkorok` paranccsal!\n' +
        '• Fedezd fel a szerver botjait a `#🤖・bot-útmutató` szobában!'
      );
    }
  });

  await client.login(config.token);
}

startBot().catch((err) => {
  console.error('Hiba a bot indításakor:', err.message);
  process.exit(1);
});
