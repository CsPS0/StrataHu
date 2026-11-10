import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Client,
  Colors,
  EmbedBuilder,
  ForumChannel,
  GatewayIntentBits,
  type Guild,
  type GuildMember,
  ModalBuilder,
  PermissionFlagsBits,
  REST,
  Routes,
  SlashCommandBuilder,
  TextChannel,
  TextInputBuilder,
  TextInputStyle
} from 'discord.js';
import { getDiscordConfig } from './config';
import { createFoundingCenterPayload, createRoleSelectorPayload, INTEREST_ROLES } from './roles';
import { checkGitHubUpdates } from './github-tracker';
import {
  buildProjectEmbedPayload,
  loadCatalogProjects as getCatalogProjects,
  pickRandomShowcaseProject
} from './project-embeds';
import { startApiServer } from './api-server';
import { listActiveProjects, upsertDiscordCertification } from './database';
import {
  getMemberCertifiedRoles,
  issueDiscordCodeForMember,
  verifyGithubUser
} from './discord-certification';

const commands = [
  new SlashCommandBuilder()
    .setName('hitelesites')
    .setDescription('Fejlesztői hitelesítés és profil összekapcsolása GitHub fiókkal')
    .addStringOption((opt) =>
      opt.setName('github').setDescription('A GitHub felhasználóneved (pl. octocat, yourname)').setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName('fiok')
    .setDescription('Webes fejlesztői fiók aktiváló vagy jelszó-visszaállító kód kérése (Hitelesített Fejlesztőknek)')
    .addStringOption((opt) =>
      opt
        .setName('muvelet')
        .setDescription('Milyen művelethez kérsz kódot?')
        .addChoices(
          { name: 'Új webes fiók létrehozása (Regisztráció)', value: 'register' },
          { name: 'Elfelejtett jelszó visszaállítása', value: 'reset' }
        )
    )
    .addStringOption((opt) =>
      opt
        .setName('github')
        .setDescription('Opcionális: GitHub felhasználónév frissítése (ha már Hitelesített Fejlesztő vagy)')
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
    .setName('het-projektje')
    .setDescription('A StrataHu szerkesztősége által kiválasztott kiemelt magyar projekt'),
  new SlashCommandBuilder()
    .setName('veletlen-projekt')
    .setDescription('Inspirálódj: egy véletlenszerűen kiválasztott magyar projekt az 1 000-ből'),
  new SlashCommandBuilder()
    .setName('uj-bekuldes')
    .setDescription('Hogyan küldhetsz be új magyar fejlesztésű projektet a StrataHu-ra'),
  new SlashCommandBuilder()
    .setName('szerepkorok')
    .setDescription('Érdeklődési körök és fejlesztői szerepkörök beállítása a profilodhoz'),
  new SlashCommandBuilder()
    .setName('alapitas')
    .setDescription('Szövetkezet & Egyesület alapítási terv (0 Ft), HSUP és alapítótárs jelentkezés'),
  new SlashCommandBuilder()
    .setName('inkubacio')
    .setDescription('Projekt beküldése az Inkubátorba piacra vitelhez (pl. Firka, Pala, B2B/B2G)'),
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

function buildFounderModal(): ModalBuilder {
  const modal = new ModalBuilder()
    .setCustomId('founder_application_modal')
    .setTitle('Alapító Társ / Mentor Jelentkezés');

  const roleInput = new TextInputBuilder()
    .setCustomId('founder_role')
    .setLabel('Milyen szerepkörben segítenél?')
    .setPlaceholder('pl. Lead Fejlesztő / Mentor, Üzlet & B2G, Jog / GDPR, HSUP Pályázat')
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const experienceInput = new TextInputBuilder()
    .setCustomId('founder_experience')
    .setLabel('Tapasztalat & Miért szeretnél csatlakozni?')
    .setPlaceholder('Írd le pár mondatban a hátteredet és hogy mivel tudod támogatni az alapítást...')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true);

  const linksInput = new TextInputBuilder()
    .setCustomId('founder_links')
    .setLabel('GitHub / LinkedIn / Portfólió')
    .setPlaceholder('https://github.com/...')
    .setStyle(TextInputStyle.Short)
    .setRequired(false);

  modal.addComponents(
    new ActionRowBuilder<TextInputBuilder>().addComponents(roleInput),
    new ActionRowBuilder<TextInputBuilder>().addComponents(experienceInput),
    new ActionRowBuilder<TextInputBuilder>().addComponents(linksInput)
  );
  return modal;
}

function buildIncubatorModal(): ModalBuilder {
  const modal = new ModalBuilder()
    .setCustomId('incubator_application_modal')
    .setTitle('Projekt Inkubációs Pályázat (0 Ft előleg)');

  const nameInput = new TextInputBuilder()
    .setCustomId('inc_project_name')
    .setLabel('Projekt neve')
    .setPlaceholder('pl. Firka, Pala, SajátEsztköz')
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const repoInput = new TextInputBuilder()
    .setCustomId('inc_repo_url')
    .setLabel('GitHub Repó / Élő Demó URL')
    .setPlaceholder('https://github.com/...')
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const marketInput = new TextInputBuilder()
    .setCustomId('inc_target_market')
    .setLabel('Célpiac és mire nyújt jobb megoldást?')
    .setPlaceholder('pl. Középiskolák / B2G, e-napló kiváltása modern felülettel, X ezer felhasználóval...')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true);

  const needsInput = new TextInputBuilder()
    .setCustomId('inc_support_needed')
    .setLabel('Milyen támogatást kérsz az Inkubátortól?')
    .setPlaceholder('pl. Jogi ernyő, GDPR audit, 90 napos iskolai pilot tárgyalás, csapattársak')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true);

  modal.addComponents(
    new ActionRowBuilder<TextInputBuilder>().addComponents(nameInput),
    new ActionRowBuilder<TextInputBuilder>().addComponents(repoInput),
    new ActionRowBuilder<TextInputBuilder>().addComponents(marketInput),
    new ActionRowBuilder<TextInputBuilder>().addComponents(needsInput)
  );
  return modal;
}

async function replyWithWebActivationCode(
  interaction: {
    guild: Guild;
    replied: boolean;
    deferred: boolean;
    reply: (opts: any) => Promise<any>;
    editReply: (opts: any) => Promise<any>;
  },
  member: GuildMember,
  purpose: 'register' | 'reset',
  optionalGithub?: string
) {
  const sendSafeReply = (opts: any) =>
    interaction.deferred || interaction.replied
      ? interaction.editReply(opts)
      : interaction.reply({ ...opts, ephemeral: true });

  const certifiedRoles = getMemberCertifiedRoles(member);
  if (certifiedRoles.length === 0) {
    await sendSafeReply({
      content:
        '🔒 **A webes fejlesztői fiók kizárólag a „Hitelesített Fejlesztő” ranggal rendelkező tagoknak érhető el!**\n\n' +
        'Futtasd előbb a `/hitelesites github:<felhasznaloneved>` parancsot itt a Discordon, majd kérj újra kódot a `/fiok` paranccsal.'
    });
    return;
  }

  if (optionalGithub && optionalGithub.trim().length > 0) {
    const ghUser = await verifyGithubUser(optionalGithub.trim());
    upsertDiscordCertification({
      discordUserId: member.id,
      discordUsername: member.user.username,
      displayName: member.displayName || member.user.globalName || member.user.username,
      githubHandle: ghUser.login,
      avatarUrl: member.user.displayAvatarURL({ size: 256 }),
      roles: certifiedRoles
    });
  }

  const issued = await issueDiscordCodeForMember(interaction.guild, member, purpose, false);
  const title =
    purpose === 'reset'
      ? '🔐 Webes Jelszó-visszaállító Kód'
      : '🌐 Webes Fejlesztői Fiók Aktiváló Kód';

  const codeEmbed = new EmbedBuilder()
    .setTitle(title)
    .setColor(0x00565b)
    .setDescription(
      `Az alábbi **egyszer használatos** kóddal hozhatod létre vagy állíthatod vissza a fiókodat a **http://localhost:3000** felületen (` +
      `Bejelentkezés → ${purpose === 'reset' ? 'Elfelejtett jelszó' : 'Regisztráció'}):\n\n` +
      `# \`${issued.code}\`\n\n` +
      `• **Hitelesített szerepkörök:** ${issued.cert.roles.join(', ')}\n` +
      (issued.cert.githubHandle ? `• **Igazolt GitHub:** \`@${issued.cert.githubHandle}\`\n` : '') +
      `• **Érvényesség:** 15 perc (csak neked látható)`
    )
    .setFooter({ text: 'StrataHu Auth • Fiókodhoz automatikusan kapcsolódnak a saját projektjeid' })
    .setTimestamp();

  await sendSafeReply({ embeds: [codeEmbed] });
}

async function startBot() {
  const config = getDiscordConfig();
  let activeGuild: Guild | null = null;

  startApiServer(() => activeGuild);

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildMembers
    ]
  });

  client.once('clientReady', async () => {
    console.log(`🤖 StrataHu Discord Bot aktív: ${client.user?.tag}`);
    await registerCommands(config);

    // GitHub repó figyelő inicializálása
    try {
      const guild = config.guildId
        ? await client.guilds.fetch(config.guildId).catch(() => undefined)
        : client.guilds.cache.first();

      if (guild) {
        activeGuild = guild;
        console.log('GitHub repó aktivitás-figyelő elindítva...');
        await checkGitHubUpdates(guild);
        setInterval(() => {
          checkGitHubUpdates(guild).catch(() => {});
        }, 30 * 60 * 1000);
      }
    } catch (err: any) {
      console.warn('GitHub figyelő indítási figyelmeztetés:', err.message);
    }
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

      // B2) Webes Fiók Aktiváló Kód Gomb
      if (interaction.customId === 'generate_web_auth_code') {
        try {
          const member = await interaction.guild.members.fetch(interaction.user.id);
          await replyWithWebActivationCode(
            {
              guild: interaction.guild,
              replied: interaction.replied,
              deferred: interaction.deferred,
              reply: (opts) => interaction.reply(opts),
              editReply: (opts) => interaction.editReply(opts)
            },
            member,
            'register'
          );
        } catch (err: any) {
          await interaction.reply({
            content: `⚠️ Nem sikerült aktiváló kódot generálni: ${err.message}`,
            ephemeral: true
          });
        }
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

      // E) Alapító Társ / Inkubátor Modal gombok
      if (interaction.customId === 'open_founder_application_modal') {
        await interaction.showModal(buildFounderModal());
        return;
      }

      if (interaction.customId === 'open_incubator_application_modal') {
        await interaction.showModal(buildIncubatorModal());
        return;
      }

      // F) Admin Jóváhagyás Gombok (Alapító Tag / Inkubált Projekt)
      if (
        interaction.customId.startsWith('approve_founder_') ||
        interaction.customId.startsWith('approve_incubated_')
      ) {
        const clicker = await interaction.guild.members.fetch(interaction.user.id);
        const isAdminOrFounder =
          clicker.permissions.has(PermissionFlagsBits.Administrator) ||
          clicker.roles.cache.some((r) => r.name === 'Alapító / Admin' || r.name === 'Alapító Tag');

        if (!isAdminOrFounder) {
          await interaction.reply({
            content: '⛔ Csak az **Alapító / Admin** csapat tudja jóváhagyni a jelentkezéseket.',
            ephemeral: true
          });
          return;
        }

        const isFounderGrant = interaction.customId.startsWith('approve_founder_');
        const targetUserId = interaction.customId
          .replace('approve_founder_', '')
          .replace('approve_incubated_', '');
        const targetRoleName = isFounderGrant ? 'Alapító Tag' : 'Inkubált Projekt';

        try {
          const roles = await interaction.guild.roles.fetch();
          const role = roles.find((r) => r.name === targetRoleName);
          const targetMember = await interaction.guild.members.fetch(targetUserId);

          if (!role) {
            await interaction.reply({
              content: `⚠️ A **${targetRoleName}** szerepkör nem található a szerveren.`,
              ephemeral: true
            });
            return;
          }

          await targetMember.roles.add(role, `Jóváhagyva általa: ${interaction.user.tag}`);
          await interaction.reply({
            content: `✅ <@${targetUserId}> megkapta a **${targetRoleName}** szerepkört! Mostantól látja a zárt alapítói és B2G tárgyaló szobákat.`,
            ephemeral: false
          });
        } catch (err: any) {
          await interaction.reply({
            content: `⚠️ Hiba a jóváhagyásnál: ${err.message}`,
            ephemeral: true
          });
        }
        return;
      }
    }

    // 1B. MODAL ŰRLAP BEKÜLDÉSEK (Alapító társ & Inkubációs pályázat)
    if (interaction.isModalSubmit() && interaction.guild) {
      if (interaction.customId === 'founder_application_modal') {
        const roleWanted = interaction.fields.getTextInputValue('founder_role');
        const exp = interaction.fields.getTextInputValue('founder_experience');
        const links = interaction.fields.getTextInputValue('founder_links') || 'Nem adott meg';

        const appEmbed = new EmbedBuilder()
          .setTitle(`🤝 Új Alapító Társ / Mentor Jelentkezés`)
          .setColor(0xd93b00)
          .setDescription(`**Jelentkező:** <@${interaction.user.id}> (${interaction.user.tag})`)
          .addFields(
            { name: 'Vállalt szerepkör', value: roleWanted, inline: false },
            { name: 'Tapasztalat & Motiváció', value: exp.slice(0, 1000), inline: false },
            { name: 'Linkek', value: links, inline: false }
          )
          .setTimestamp();

        const approveRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId(`approve_founder_${interaction.user.id}`)
            .setLabel('Jóváhagyás: Alapító Tag rang')
            .setStyle(ButtonStyle.Success)
            .setEmoji('✅')
        );

        const targetCh = interaction.guild.channels.cache.find(
          (c) => c.isTextBased() && c.name.includes('kormányzati-és-b2g')
        ) as TextChannel | undefined;

        if (targetCh) {
          await targetCh.send({ embeds: [appEmbed], components: [approveRow] });
        }

        await interaction.reply({
          content:
            '✅ **Köszönjük a jelentkezésedet az Alapító Magcsapatba!**\n' +
            'Az adatlapod továbbításra került az adminisztrátorok és az alapító kör számára. Hamarosan felvesszük veled a kapcsolatot és megkapod az **Alapító Tag** jogosultságot!',
          ephemeral: true
        });
        return;
      }

      if (interaction.customId === 'incubator_application_modal') {
        const projName = interaction.fields.getTextInputValue('inc_project_name');
        const repoUrl = interaction.fields.getTextInputValue('inc_repo_url');
        const market = interaction.fields.getTextInputValue('inc_target_market');
        const needs = interaction.fields.getTextInputValue('inc_support_needed');

        const incEmbed = new EmbedBuilder()
          .setTitle(`🚀 Új Inkubációs Projekt: ${projName}`)
          .setColor(0x00565b)
          .setDescription(`**Fejlesztő / Beküldő:** <@${interaction.user.id}> (${interaction.user.tag})`)
          .addFields(
            { name: 'Repó / Demó', value: repoUrl, inline: false },
            { name: 'Célpiac és megoldás', value: market.slice(0, 1000), inline: false },
            { name: 'Igényelt Inkubátori Támogatás', value: needs.slice(0, 1000), inline: false }
          )
          .setFooter({ text: '0 Ft előleg • Sikerdíjas Piaci Modell' })
          .setTimestamp();

        const approveRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId(`approve_incubated_${interaction.user.id}`)
            .setLabel('Inkubálás elfogadása (Rang adása)')
            .setStyle(ButtonStyle.Success)
            .setEmoji('🚀')
        );

        const forumCh = interaction.guild.channels.cache.find(
          (c) => c.name.includes('inkubátor-pályázatok')
        ) as ForumChannel | undefined;

        let threadUrl = '';
        if (forumCh && 'threads' in forumCh) {
          const mvpTag = forumCh.availableTags.find((t) => t.name.includes('MVP'));
          const b2gTag = forumCh.availableTags.find((t) => t.name.includes('Oktatás'));
          const appliedTags = [mvpTag?.id, b2gTag?.id].filter(Boolean) as string[];

          const thread = await forumCh.threads.create({
            name: `🚀 ${projName} — Piaci & Inkubációs Pályázat`,
            appliedTags,
            message: {
              embeds: [incEmbed],
              components: [approveRow]
            }
          });
          threadUrl = `https://discord.com/channels/${interaction.guild.id}/${thread.id}`;
        }

        await interaction.reply({
          content:
            `✅ **A(z) „${projName}” inkubációs pályázata sikeresen létrejött!**\n` +
            (threadUrl ? `📌 **Poszt linkje:** ${threadUrl}\n` : '') +
            'A közösség és a mentorok itt tudnak csatlakozni hozzád a piacra vitelhez.',
          ephemeral: true
        });
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
    const dbProjects = listActiveProjects();
    const projects = dbProjects.length > 0 ? dbProjects : getCatalogProjects();

    // /fiok [muvelet] [github]
    if (commandName === 'fiok') {
      if (!interaction.guild) {
        await interaction.reply({ content: 'Ez a parancs csak a StrataHu Discord szerveren használható.', ephemeral: true });
        return;
      }
      const purposeRaw = interaction.options.getString('muvelet');
      const purpose: 'register' | 'reset' = purposeRaw === 'reset' ? 'reset' : 'register';
      const optionalGithub = interaction.options.getString('github') || undefined;
      await interaction.deferReply({ ephemeral: true });

      try {
        const member = await interaction.guild.members.fetch(interaction.user.id);
        await replyWithWebActivationCode(
          {
            guild: interaction.guild,
            replied: interaction.replied,
            deferred: interaction.deferred,
            reply: (opts) => interaction.reply(opts),
            editReply: (opts) => interaction.editReply(opts)
          },
          member,
          purpose,
          optionalGithub
        );
      } catch (err: any) {
        const msg =
          typeof err?.message === 'string' && err.message.startsWith('NOT_FOUND:')
            ? `❌ Nem található ilyen GitHub profil: **${err.message.slice('NOT_FOUND:'.length)}**.`
            : `⚠️ Hiba történt a kód generálása során: ${err?.message || 'Ismeretlen hiba'}`;
        await interaction.editReply({ content: msg });
      }
      return;
    }

    // /hitelesites github:<felhasznalo>
    if (commandName === 'hitelesites') {
      const githubUsername = interaction.options.getString('github', true).trim();
      await interaction.deferReply({ ephemeral: true });

      try {
        let ghUser: Awaited<ReturnType<typeof verifyGithubUser>>;
        try {
          ghUser = await verifyGithubUser(githubUsername);
        } catch (err: any) {
          if (typeof err?.message === 'string' && err.message.startsWith('NOT_FOUND:')) {
            await interaction.editReply({
              content: `❌ Nem található GitHub profil ezzel a felhasználónévvel: **${githubUsername}**.\nKérlek ellenőrizd az írásmódot!`
            });
            return;
          }
          throw err;
        }
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

        const refreshedMember = await interaction.guild!.members.fetch(interaction.user.id);
        upsertDiscordCertification({
          discordUserId: refreshedMember.id,
          discordUsername: refreshedMember.user.username,
          displayName: refreshedMember.displayName || refreshedMember.user.globalName || refreshedMember.user.username,
          githubHandle: ghUser.login,
          avatarUrl: refreshedMember.user.displayAvatarURL({ size: 256 }),
          roles: getMemberCertifiedRoles(refreshedMember)
        });

        const embed = new EmbedBuilder()
          .setTitle(`🐙 Sikeres GitHub Hitelesítés: @${ghUser.login}`)
          .setColor(Colors.Green)
          .setThumbnail(ghUser.avatar_url)
          .setDescription(
            `A Discord fiókodat sikeresen összekapcsoltuk a **[${ghUser.login}](${ghUser.html_url})** GitHub profillal!\n\n` +
            `✅ Megkaptad a **Hitelesített Fejlesztő** szerepkört.\n` +
            (specialRoleGiven
              ? `🏆 **Gratulálunk!** A projekted szerepel a StrataHu katalógusban, ezért megkaptad a **${specialRoleGiven}** rangot is!\n`
              : '') +
            `\n🌐 Mostantól a lenti gombbal (vagy a \`/fiok\` paranccsal) **létrehozhatod a webes fejlesztői fiókodat**, amellyel automatikusan szerkesztheted vagy eltávolíthatod a saját projektjeidet a piactéren!`
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
            .setURL(ghUser.html_url),
          new ButtonBuilder()
            .setCustomId('generate_web_auth_code')
            .setLabel('🔑 Webes Fiók Aktiváló Kód')
            .setStyle(ButtonStyle.Success)
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

    if (commandName === 'alapitas') {
      const payload = createFoundingCenterPayload();
      await interaction.reply({
        ...payload,
        ephemeral: true
      });
      return;
    }

    if (commandName === 'inkubacio') {
      await interaction.showModal(buildIncubatorModal());
      return;
    }

    if (commandName === 'segitseg') {
      const helpEmbed = new EmbedBuilder()
        .setTitle('📚 StrataHu Bot — Útmutató & Parancsok')
        .setColor(Colors.Indigo)
        .setDescription(
          'A StrataHu AI Bot a magyar fejlesztői közösség hivatalos asszisztense. ' +
          'Kereshetsz projekteket, megnézheted a ranglistát, jelentkezhetsz alapító társnak, vagy beküldheted a projektedet inkubációra.'
        )
        .addFields(
          {
            name: '🤖 Elérhető parancsok',
            value:
              '• `/alapitas` — Szövetkezet & Egyesület alapítási terv (0 Ft) és alapítótárs jelentkezés\n' +
              '• `/inkubacio` — Projekt inkubációs jelentkezési űrlap (0 Ft előleg, piacra vitel)\n' +
              '• `/hitelesites github:<név>` — Profil összekapcsolása GitHub fiókkal\n' +
              '• `/fiok` — Webes fejlesztői fiók aktiváló kód generálása (Hitelesített Fejlesztőknek)\n' +
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

      const payload = buildProjectEmbedPayload(match, {
        titlePrefix: '🚀 ',
        repoButtonLabel: 'GitHub',
        demoButtonLabel: 'Élő oldal',
        footerText: 'StrataHu Katalógus • 1 000 magyar projekt'
      });

      await interaction.reply(payload);
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

    if (commandName === 'het-projektje') {
      const featured = projects.find((p: any) => p.name === 'Pala') || projects[0];
      const payload = buildProjectEmbedPayload(featured, {
        titlePrefix: '⭐ A Hét Kiemelt Projektje: ',
        color: Colors.Gold,
        repoButtonLabel: 'GitHub Repó',
        demoButtonLabel: 'Élő Oldal',
        footerText: 'StrataHu • stratahu.dev',
        includeHighlights: true
      });

      await interaction.reply(payload);
      return;
    }

    if (commandName === 'veletlen-projekt') {
      const randomProject = pickRandomShowcaseProject(projects);
      if (!randomProject) {
        await interaction.reply({ content: 'Nem található projekt a katalógusban.', ephemeral: true });
        return;
      }

      const payload = buildProjectEmbedPayload(randomProject, {
        titlePrefix: '🎲 Véletlen Magyar Projekt: ',
        repoButtonLabel: 'GitHub Repó',
        demoButtonLabel: 'Élő Oldal',
        footerText: 'StrataHu Katalógus • 1 000 hazai projekt'
      });

      await interaction.reply(payload);
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
