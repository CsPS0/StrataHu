import {
  ChannelType,
  Client,
  EmbedBuilder,
  ForumChannel,
  ForumLayoutType,
  GatewayIntentBits,
  Guild,
  GuildForumTagData,
  PermissionFlagsBits,
  SortOrderType,
  TextChannel
} from 'discord.js';
import { getDiscordConfig } from './config';
import {
  ALL_ROLES,
  createBotsDirectoryPayload,
  createFoundingCenterPayload,
  createRoleSelectorPayload,
  createVerificationPayload
} from './roles';
import { applyAllChannelPermissions, postAllChannelRulesets } from './channel-rules';

interface ChannelSpec {
  name: string;
  topic?: string;
  readOnly?: boolean;
  type?: ChannelType;
  tags?: GuildForumTagData[];
  forumLayout?: ForumLayoutType;
  sortOrder?: SortOrderType;
}

interface CategorySpec {
  name: string;
  channels: ChannelSpec[];
}

// Csatornák és Fórumok struktúrája EMOJIKKAL (a szobák kapnak emojikat)
const SERVER_STRUCTURE: CategorySpec[] = [
  {
    name: '📢 │ TÁJÉKOZTATÁS',
    channels: [
      {
        name: '👋・üdvözlet-és-szabályzat',
        topic: 'A StrataHu közösség hivatalos célkitűzése, etikai kódexe és szabályzata.',
        readOnly: true
      },
      {
        name: '🔐・hitelesítés',
        topic: 'Új tagok hitelesítése, bot-védelem és GitHub fejlesztői fiók összekapcsolás.',
        readOnly: true
      },
      {
        name: '🎭・szerepkör-választó',
        topic: 'Válaszd ki az érdeklődési köreidet és technológiai szakterületedet az interaktív menüben!',
        readOnly: true
      },
      {
        name: '🤖・bot-útmutató',
        topic: 'Közösségi és védelmi botok (Zene, Amari, Sapphire, Wick, esmBot) bemutatása és meghívása.',
        readOnly: true
      },
      {
        name: '📢・bejelentések',
        topic: 'Hivatalos hírek, új platformfunkciók és közösségi események.',
        readOnly: true
      },
      {
        name: '🔗・hasznos-linkek',
        topic: 'StrataHu weboldal, GitHub forráskód, API végpontok és beküldési űrlap.',
        readOnly: true
      }
    ]
  },
  {
    name: '💬 │ KÖZÖSSÉGI TÉR',
    channels: [
      {
        name: '💬・általános-társalgó',
        topic: 'Kötetlen beszélgetések a magyar fejlesztői ökoszisztémáról és technológiákról.'
      },
      {
        name: '📊・ranglista-és-szintek',
        topic: 'AmariBot és közösségi aktivitási szintek, heti és összesített magyar ranglista.'
      },
      {
        name: '🎨・média-és-memek',
        topic: 'Képszerkesztés, animációk, mémek és esmBot parancsok (&caption, &magik, stb.).'
      },
      {
        name: '🛠️・fejlesztői-fórum',
        type: ChannelType.GuildForum,
        topic: 'Mélyebb technikai diskurzus, kód review, architektúra tervezés és kérdezz-felelek.',
        sortOrder: SortOrderType.LatestActivity,
        forumLayout: ForumLayoutType.ListView,
        tags: [
          { name: 'Vue / Frontend', emoji: { name: '⚡' } },
          { name: '.NET / C#', emoji: { name: '🔷' } },
          { name: 'Docker / DevOps', emoji: { name: '🐳' } },
          { name: 'Rust / Go', emoji: { name: '🦀' } },
          { name: 'Python / AI', emoji: { name: '🐍' } },
          { name: 'Adatbázis / SQL', emoji: { name: '🗄️' } },
          { name: 'Kód Review', emoji: { name: '🔍' } },
          { name: 'Kérdés / Segítség', emoji: { name: '❓' } }
        ]
      },
      {
        name: '💡・ötletelés-és-visszajelzés',
        topic: 'Ötletek új projektekhez, visszajelzések és közösségi javaslatok.'
      },
      {
        name: '🤝・csapattárs-kereső',
        topic: 'Társalapítók, nyílt forráskódú közreműködők és csapattársak keresése.'
      },
      {
        name: '☕・offtopic',
        topic: 'Minden, ami nem feltétlenül programozás: zene, játékok, hardver, kávé.'
      }
    ]
  },
  {
    name: '🚀 │ PROJEKT BEMUTATÓK',
    channels: [
      {
        name: '📦・projekt-beküldések',
        type: ChannelType.GuildForum,
        topic: 'Mutasd be a saját magyar fejlesztésű projektedet, kérj visszajelzést vagy toborozz csapattársakat!',
        sortOrder: SortOrderType.CreationDate,
        forumLayout: ForumLayoutType.GalleryView,
        tags: [
          { name: 'Nyílt Forráskód', emoji: { name: '🐙' } },
          { name: 'SaaS / Termék', emoji: { name: '💼' } },
          { name: 'Web / Frontend', emoji: { name: '🎨' } },
          { name: 'Backend / API', emoji: { name: '⚙️' } },
          { name: 'Mobil / App', emoji: { name: '📱' } },
          { name: 'AI / Gépi Tanulás', emoji: { name: '🧠' } },
          { name: 'Közreműködőt Keres', emoji: { name: '🤝' } },
          { name: 'Fejlesztés Alatt (WIP)', emoji: { name: '🚧' } }
        ]
      },
      {
        name: '🔥・új-projektek',
        topic: 'A StrataHu-ra beküldött és kurált magyar projektek automatikus bemutatói.'
      },
      {
        name: '⭐・hét-projektje',
        topic: 'Kiemelt, részletes esettanulmányok a legérdekesebb hazai projektekről.',
        readOnly: true
      },
      {
        name: '❓・fejlesztői-segítség',
        topic: 'Gyors kérdések és válaszok: Vue 3, .NET, Rust, Go, Python, Flutter, Docker.'
      }
    ]
  },
  {
    name: '🏛️ │ ALAPÍTÁS & INKUBÁTOR',
    channels: [
      {
        name: '📋・alapítási-terv-és-társak',
        topic: 'A StrataHu Szövetkezet / Egyesület 0 Ft-os alapítási terve és alapítótárs-toborzás.',
        readOnly: true
      },
      {
        name: '🚀・inkubátor-pályázatok',
        type: ChannelType.GuildForum,
        topic: 'Ide küldd be a piacra vitelre szánt magyar projektedet (pl. Firka, Pala, B2B/B2G eszközök)!',
        sortOrder: SortOrderType.LatestActivity,
        forumLayout: ForumLayoutType.ListView,
        tags: [
          { name: 'MVP Kész', emoji: { name: '✅' } },
          { name: 'Oktatás / B2G', emoji: { name: '🎓' } },
          { name: 'KKV / B2B', emoji: { name: '💼' } },
          { name: '90 Napos Pilot', emoji: { name: '🧪' } },
          { name: 'Biztonsági Audit', emoji: { name: '🛡️' } },
          { name: 'Társat Keres', emoji: { name: '🤝' } }
        ]
      },
      {
        name: '🏛️・kormányzati-és-b2g-tárgyalások',
        topic: 'Állami, minisztériumi, DMÜ, tankerületi és iskolai pilot-tárgyalások előkészítése.'
      },
      {
        name: '⚖️・jogi-és-szervezeti-műhely',
        topic: 'Egyesület (0 Ft), HSUP pályázatok, Szövetkezet alapítás, GDPR, IBTV és IP megállapodások.'
      },
      {
        name: '🏛️・Alapítói Tárgyaló',
        type: ChannelType.GuildVoice
      }
    ]
  },
  {
    name: '🤖 │ AI & RENDSZER',
    channels: [
      {
        name: '🤖・ai-parancsok',
        topic: 'Interakció a StrataHu AI Botjával (/projekt, /top10, /hitelesites, /szerepkorok).'
      },
      {
        name: '📜・audit-napló',
        topic: 'Rendszerüzenetek, hitelesítések, moderációs események és frissítési napló.',
        readOnly: true
      },
      {
        name: '🛡️・biztonsági-napló',
        topic: 'Wick / Beemo anti-spam, karantén és szervervédelmi eseménynapló.',
        readOnly: true
      }
    ]
  },
  {
    name: '🔊 │ HANGCSATORNÁK',
    channels: [
      {
        name: '🎵・zene-parancsok',
        topic: 'Zenebot parancsok (Jockie Music: m!play, m!skip, m!queue).'
      },
      {
        name: '🔊・Közös Kódolás',
        type: ChannelType.GuildVoice
      },
      {
        name: '🔊・Zene Szoba',
        type: ChannelType.GuildVoice
      },
      {
        name: '☕・Kávézó & Dumcsi',
        type: ChannelType.GuildVoice
      }
    ]
  }
];

export async function setupServer(targetGuildId?: string): Promise<void> {
  const config = getDiscordConfig();
  const guildId = targetGuildId || config.guildId;

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.MessageContent
    ]
  });

  console.log('Kapcsolódás a Discordhoz...');
  await client.login(config.token);

  try {
    let guild: Guild | undefined;
    if (guildId) {
      guild = await client.guilds.fetch(guildId);
    } else {
      guild = client.guilds.cache.first();
    }

    if (!guild) {
      throw new Error(
        'Nem található a megadott szerver! Ellenőrizd a DISCORD_GUILD_ID értéket, és győződj meg róla, hogy a bot már meg lett hívva a szerverre!'
      );
    }

    console.log(`\n========================================`);
    console.log(`Szerver konfigurálása: ${guild.name} (${guild.id})`);
    console.log(`========================================\n`);

    // 0. Felesleges sablon csatornák (general, General) és kategóriák takarítása
    console.log('0. Felesleges sablon csatornák ellenőrzése...');
    const initialChannels = await guild.channels.fetch();
    for (const [, ch] of initialChannels) {
      if (!ch) continue;
      if (
        (ch.name.toLowerCase() === 'general' && !ch.name.includes('・')) ||
        ch.name.toLowerCase() === 'text channels' ||
        ch.name.toLowerCase() === 'voice channels'
      ) {
        console.log(`  🗑️ Felesleges sablon csatorna eltávolítása: ${ch.name} (${ch.id})`);
        try {
          await ch.delete('Sablon csatorna törlése a felhasználó kérésére');
        } catch (e: any) {
          console.warn(`    Nem sikerült törölni (${ch.name}): ${e.message}`);
        }
      }
    }

    // 1. Szerepkörök (Roles) beállítása (SZIGORÚAN EMOJIK NÉLKÜL)
    console.log('\n1. Szerepkörök ellenőrzése és létrehozása (szigorúan emojik nélkül)...');
    const existingRoles = await guild.roles.fetch();
    const stripEmojis = (str: string) => str.replace(/^[\p{Extended_Pictographic}\uFE0F\u200D\s]+/u, '').trim();

    for (const spec of ALL_ROLES) {
      let existing = existingRoles.find((r) => r.name === spec.name);

      if (!existing) {
        existing = existingRoles.find((r) => stripEmojis(r.name) === spec.name);
        if (existing) {
          console.log(`  ✎ Szerepkör átnevezése (emoji eltávolítása): "${existing.name}" -> "${spec.name}"`);
          await existing.setName(spec.name, 'Emojik eltávolítása a szerepkörökből');
          await existing.setColor(spec.color);
          await existing.setHoist(spec.hoist);
          await existing.setMentionable(spec.mentionable);
        }
      }

      if (!existing) {
        console.log(`  + Szerepkör létrehozása: ${spec.name}`);
        await guild.roles.create({
          name: spec.name,
          color: spec.color,
          hoist: spec.hoist,
          mentionable: spec.mentionable,
          reason: 'StrataHu szerepkör (emojik nélkül)'
        });
      } else {
        console.log(`  ✓ Szerepkör kész (emoji nélkül): ${spec.name}`);
      }
    }

    // Szerepkörök frissítése és admin hozzárendelés a tulajdonoshoz
    const updatedRoles = await guild.roles.fetch();
    const adminRole = updatedRoles.find((r) => r.name === 'Alapító / Admin');
    if (adminRole) {
      try {
        const owner = await guild.fetchOwner();
        if (owner && !owner.roles.cache.has(adminRole.id)) {
          await owner.roles.add(adminRole, 'Tulajdonos Alapító / Admin szerepkör');
          console.log(`  👑 Szerver tulajdonos (${owner.user.tag}) megkapta a(z) "${adminRole.name}" szerepkört!`);
        }
      } catch (err: any) {
        console.warn(`  (Szerver tulajdonos szerepkör hozzárendelés kihagyva: ${err.message})`);
      }
    }

    // Bot hozzárendelése az operátor szerepkörhöz
    const botRole = updatedRoles.find((r) => r.name === 'Strata AI Operátor');
    if (botRole && client.user) {
      try {
        const botMember = await guild.members.fetch(client.user.id);
        if (botMember && !botMember.roles.cache.has(botRole.id)) {
          await botMember.roles.add(botRole, 'Strata AI Operátor szerepkör hozzárendelés');
          console.log(`  🤖 Bot megkapta a(z) "${botRole.name}" szerepkört!`);
        }
      } catch (err: any) {
        console.warn(`  (Bot szerepkör hozzárendelés kihagyva: ${err.message})`);
      }
    }

    // 2. Kategóriák, csatornák és fórumok létrehozása (EMOJIKKAL A SZOBÁKBAN)
    console.log('\n2. Csatornastruktúra és fórumok létrehozása (emojikkal a szobákban)...');
    const channels = await guild.channels.fetch();

    for (const catSpec of SERVER_STRUCTURE) {
      let category = channels.find(
        (c) => c?.type === ChannelType.GuildCategory && c.name.toLowerCase() === catSpec.name.toLowerCase()
      );

      if (!category) {
        console.log(`  📁 Kategória létrehozása: ${catSpec.name}`);
        category = await guild.channels.create({
          name: catSpec.name,
          type: ChannelType.GuildCategory,
          reason: 'StrataHu kategória'
        });
      } else {
        console.log(`  📁 Kategória már létezik: ${catSpec.name}`);
      }

      for (const chSpec of catSpec.channels) {
        const chType = chSpec.type ?? ChannelType.GuildText;
        let channel = channels.find(
          (c) => c?.type === chType && c.name.toLowerCase() === chSpec.name.toLowerCase()
        );

        if (!channel) {
          console.log(`    #️⃣ Csatorna/Fórum létrehozása: ${chSpec.name}`);
          
          const permissionOverwrites = chSpec.readOnly && chType === ChannelType.GuildText
            ? [
                {
                  id: guild.roles.everyone.id,
                  deny: [PermissionFlagsBits.SendMessages],
                  allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory]
                },
                {
                  id: client.user!.id,
                  allow: [
                    PermissionFlagsBits.SendMessages,
                    PermissionFlagsBits.EmbedLinks,
                    PermissionFlagsBits.AttachFiles,
                    PermissionFlagsBits.ViewChannel,
                    PermissionFlagsBits.ReadMessageHistory
                  ]
                }
              ]
            : undefined;

          if (chType === ChannelType.GuildForum) {
            channel = await guild.channels.create({
              name: chSpec.name,
              type: ChannelType.GuildForum,
              parent: category.id,
              topic: chSpec.topic,
              availableTags: chSpec.tags,
              defaultForumLayout: chSpec.forumLayout,
              defaultSortOrder: chSpec.sortOrder,
              reason: 'StrataHu Fórum csatorna'
            });
          } else {
            channel = await guild.channels.create({
              name: chSpec.name,
              type: chType,
              parent: category.id,
              topic: chSpec.topic,
              permissionOverwrites,
              reason: 'StrataHu csatorna (emojival)'
            });
          }
        } else {
          console.log(`    ✓ Csatorna/Fórum már létezik: ${chSpec.name}`);
        }

        // Fórumok kezdő útmutató posztjának elhelyezése
        if (chType === ChannelType.GuildForum && channel instanceof ForumChannel) {
          const threads = await channel.threads.fetchActive();
          if (threads.threads.size === 0) {
            if (chSpec.name.includes('projekt-beküldések')) {
              console.log(`      📌 Projekt beküldési fórum útmutató közzététele...`);
              const guideEmbed = new EmbedBuilder()
                .setTitle('📌 Útmutató saját projekt bemutatásához')
                .setColor(0x6366f1)
                .setDescription(
                  'Ebben a fórumban bárki létrehozhat egy dedikált bejegyzést (posztot) a saját hazai fejlesztésének, webalkalmazásának, könyvtárának vagy ötletének!\n\n' +
                  '💡 **Ajánlott beküldési sablon:**\n' +
                  '• **Projekt neve és 1-2 mondatos célja:** *Mi a projekt, és milyen problémát old meg?*\n' +
                  '• **Hivatkozások:** *GitHub / GitLab forráskód URL és/vagy Élő weboldal, kipróbálási link*\n' +
                  '• **Technológiai Stack:** *Pl. Vue 3, .NET 10, PostgreSQL, Tailwind, Flutter, Rust, stb.*\n' +
                  '• **Képernyőkép / Bemutató:** *Csatolj képet a felületről vagy a kódról a bejegyzéshez!*\n' +
                  '• **Milyen visszajelzést vársz?** *Pl. UI/UX véleményezés, architektúra review, vagy közreműködők/tesztelők toborzása?*\n\n' +
                  '🌟 **Tipp:** A kiemelkedő projektek bekerülnek a hivatalos [stratahu.dev](http://localhost:3000) webes katalógusba és a `#⭐・hét-projektje` rovatba is!'
                )
                .setFooter({ text: 'StrataHu Fórum • Magyar Projektek Tárháza' });

              const thread = await channel.threads.create({
                name: '📌 Olvasd el: Hogyan mutasd be a projektedet ebben a fórumban?',
                message: { embeds: [guideEmbed] }
              });
              await thread.pin();
            } else if (chSpec.name.includes('fejlesztői-fórum')) {
              console.log(`      📌 Technikai fórum útmutató közzététele...`);
              const guideEmbed = new EmbedBuilder()
                .setTitle('📌 Útmutató a Technikai Fórum használatához')
                .setColor(0x3b82f6)
                .setDescription(
                  'Ez a fórum a strukturált szakmai beszélgetések, technikai kérdések és kód-véleményezések helye.\n\n' +
                  '🎯 **Mikor hozz létre új posztot ebben a fórumban?**\n' +
                  '• Ha technikai elakadásod vagy hibád van, és részletes kódrészlettel tudod bemutatni.\n' +
                  '• Ha architektúrális döntés előtt állsz (pl. adatbázis választás, ORM vs SQL, SPA vs SSR).\n' +
                  '• Ha szeretnéd, hogy tapasztaltabb fejlesztők ránézzenek a GitHub repódra (Kód Review).\n' +
                  '• Ha érdekes technikai tapasztalatot, esettanulmányt vagy benchmarkot szeretnél megosztani.\n\n' +
                  '💡 **Hogyan tegyél fel jó kérdést?**\n' +
                  '1. Válassz megfelelő címkét (pl. `.NET / C#` vagy `Vue / Frontend`).\n' +
                  '2. Írd le a pontos célt, mit próbáltál meg eddig, és mi a váratlan viselkedés / hibaüzenet.'
                )
                .setFooter({ text: 'StrataHu Technikai Fórum' });

              const thread = await channel.threads.create({
                name: '📌 Olvasd el: Hogyan használhatod a Fejlesztői Fórumot?',
                message: { embeds: [guideEmbed] }
              });
              await thread.pin();
            } else if (chSpec.name.includes('inkubátor-pályázatok')) {
              console.log(`      🚀 Inkubátor fórum útmutató közzététele...`);
              const guideEmbed = new EmbedBuilder()
                .setTitle('🚀 Inkubátor Pályázatok — Hogyan vigyük nagypiacra a projektedet?')
                .setColor(0xd93b00)
                .setDescription(
                  'Van egy már működő magyar diákprojekted vagy szoftvered (pl. *Firka*, *Pala*, oktatási/KKV eszköz), amit szívesen látnál cégeknél, iskolákban vagy akár országos pilotban?\n\n' +
                  '💡 **Használd a `/inkubacio` parancsot vagy nyiss új posztot az alábbi mintával:**\n' +
                  '• **Projekt neve & Repó:** `pl. Firka — https://github.com/...`\n' +
                  '• **Mit csinál / Miért jobb?** `Melyik elavult megoldást váltja ki?`\n' +
                  '• **Eddigi eredmények:** `Aktív diákok / letöltések / értékelések`\n' +
                  '• **Miben kell a Szövetkezet segítsége?** `Jogi háttér / GDPR audit / Iskolai vagy Kormányzati tárgyalás / Mentorálás`\n\n' +
                  '⚖️ **Költség:** **0 Ft előleg**, a közös bevételből **75–85% a fejlesztő csapaté**!'
                )
                .setFooter({ text: 'StrataHu Közösségi Inkubátor' });

              const thread = await channel.threads.create({
                name: '📌 Útmutató: Így add be a projekted az Inkubátorba (0 Ft előleg)',
                message: { embeds: [guideEmbed] }
              });
              await thread.pin();
            }
          }
        }

        // Kezdő üzenetek: Részletes szabályzat és köszöntő közzététele
        if (chSpec.name === '👋・üdvözlet-és-szabályzat' && channel.type === ChannelType.GuildText) {
          const textCh = channel as TextChannel;
          const messages = await textCh.messages.fetch({ limit: 10 });
          const hasFullRules = messages.some((m) => m.embeds.some((e) => e.title?.includes('Code of Conduct')));
          if (!hasFullRules) {
            console.log(`      📝 Hivatalos részletes szabályzat és köszöntő közzététele...`);
            for (const [, m] of messages) {
              await m.delete().catch(() => {});
            }

            const welcomeEmbed = new EmbedBuilder()
              .setTitle('🇭🇺 Üdvözlünk a StrataHu Magyar Fejlesztői Közösségben!')
              .setColor(0x6366f1)
              .setDescription(
                'A **StrataHu** (stratahu.dev) a hazai szoftverfejlesztők, nyílt forráskódú alkotók, mérnökök és technológiai érdeklődők független szakmai platformja.\n\n' +
                '🎯 **Küldetésünk:** láthatóvá tenni a legjobb magyar digitális fejlesztéseket, elősegíteni a tapasztalatcserét, és közös teret biztosítani a hobbiprojektektől az ipari megoldásokig.'
              )
              .addFields(
                {
                  name: '🚀 Gyors kezdési lépések új tagoknak',
                  value:
                    '1️⃣ **Hitelesítés**: Kattints a `#🔐・hitelesítés` szobára a tagságod megerősítéséhez!\n' +
                    '2️⃣ **Szerepkörök**: Ugorj be a `#🎭・szerepkör-választó` szobába és válaszd ki a technológiáidat!\n' +
                    '3️⃣ **Beköszönés**: Írj egy szót magadról a `#💬・általános-társalgó` csatornában!\n' +
                    '4️⃣ **Projekt bemutatás**: Hozz létre saját posztot a `📦・projekt-beküldések` fórumban!\n' +
                    '5️⃣ **Katalógus**: Böngészd át az 1000+ magyar projektet a **http://localhost:3000** (stratahu.dev) oldalon!'
                }
              )
              .setFooter({ text: 'StrataHu • Magyar Fejlesztések Kurátori Tárháza' });

            const rulesEmbed = new EmbedBuilder()
              .setTitle('📜 Hivatalos Szerverszabályzat (Code of Conduct)')
              .setColor(0xf59e0b)
              .setDescription('Kérjük, hogy a közösség barátságos és szakmai légkörének megőrzése érdekében tartsd be az alábbi pontokat:')
              .addFields(
                {
                  name: '§1. Kölcsönös Tisztelet és Szakmaiság',
                  value:
                    'A közösségben nincs helye személyeskedésnek, lekezelő vagy toxikus stílusnak, zaklatásnak. ' +
                    'A kritikát mindig a kódra, megoldásra vagy ötletre fogalmazd meg — konstruktívan és segítőkészen, függetlenül a másik tapasztalati szintjétől.'
                },
                {
                  name: '§2. Nyílt Forráskód és Szellemi Tulajdon',
                  value:
                    'Mások szellemi tulajdonát szigorúan tiszteletben tartjuk. Nyílt forráskódú könyvtárak használatakor az eredeti készítő licencét és krediteket meg kell őrizni. ' +
                    'Szigorúan tilos lopott, szivárogtatott forráskódok, szerzői jogilag védett könyvek vagy licenckulcsok megosztása.'
                },
                {
                  name: '§3. Spammentesség és Önreklám Szabályzata',
                  value:
                    'Kéretlen direkt üzenetek (DM spam), csalások, kriptovaluta promóciók és nem releváns hirdetések azonnali és végleges kitiltást (Ban) vonnak maguk után.\n' +
                    '**Saját fejlesztések megosztása**: Kifejezetten támogatott és bátorított a `📦・projekt-beküldések` fórumban és a `🔥・új-projektek` csatornában, ha működő demóval vagy GitHub repóval párosul!'
                },
                {
                  name: '§4. Csatornahasználat és Segítségkérés',
                  value:
                    'Kérünk, hogy minden témát a megfelelő szobában tárgyalj meg. Technikai kérdéseknél mellékelj minimális reprodukálható példakódot, a használt környezetet és a pontos hibaüzenetet (kerüld a „nem megy, miért?” típusú tartalmatlan kérdéseket).'
                },
                {
                  name: '§5. Biztonság, Titkok és Adatvédelem',
                  value:
                    'Soha ne ossz meg éles API kulcsokat, jelszavakat, jelszóhasheket, `.env` fájlokat, privát céges adatokat vagy személyes információkat (GDPR). Ha véletlenül mégis feltöltöttél egy kulcsot, azonnal vond vissza azt a szolgáltatónál!'
                },
                {
                  name: '§6. Moderáció és 24 Órás Eltávolítási Garancia',
                  value:
                    'A moderátorok jogosultak figyelmeztetést (Warn), némítást (Timeout) vagy kitiltást (Ban) alkalmazni szabályszegés esetén.\n' +
                    'Ha saját szellemi termékedet vagy projektedet szeretnéd eltávolíttatni a weboldalról vagy a szerverről, írj a `moderation@stratahu.dev` címre — **24 órás garantált reakcióidővel** intézkedünk.'
                }
              )
              .setFooter({ text: 'StrataHu Szabályzat • Érvényes a szerver minden tagjára' })
              .setTimestamp();

            await textCh.send({ embeds: [welcomeEmbed, rulesEmbed] });
          }
        }

        // Kezdő üzenetek: Hitelesítés (Verification Gate)
        if (chSpec.name === '🔐・hitelesítés' && channel.type === ChannelType.GuildText) {
          const textCh = channel as TextChannel;
          const messages = await textCh.messages.fetch({ limit: 5 });
          if (messages.size === 0) {
            console.log(`      🔐 Hitelesítési kapu üzenet közzététele...`);
            const payload = createVerificationPayload();
            await textCh.send(payload);
          }
        }

        // Kezdő üzenetek: Interaktív szerepkör-választó
        if (chSpec.name === '🎭・szerepkör-választó' && channel.type === ChannelType.GuildText) {
          const textCh = channel as TextChannel;
          const messages = await textCh.messages.fetch({ limit: 5 });
          if (messages.size === 0) {
            console.log(`      🎭 Szerepkör-választó interaktív menü közzététele...`);
            const payload = createRoleSelectorPayload();
            await textCh.send(payload);
          }
        }

        // Kezdő üzenetek: Bot útmutató és 1-kattintásos meghívó tárház
        if (chSpec.name === '🤖・bot-útmutató' && channel.type === ChannelType.GuildText) {
          const textCh = channel as TextChannel;
          const messages = await textCh.messages.fetch({ limit: 5 });
          if (messages.size === 0) {
            console.log(`      🤖 Ajánlott botok tárháza közzététele...`);
            const payload = createBotsDirectoryPayload();
            await textCh.send(payload);
          }
        }

        // Kezdő üzenetek: Alapítási Terv & Inkubátor Központ
        if (chSpec.name === '📋・alapítási-terv-és-társak' && channel.type === ChannelType.GuildText) {
          const textCh = channel as TextChannel;
          const messages = await textCh.messages.fetch({ limit: 5 });
          const hasCenter = messages.some((m) => m.embeds.some((e) => e.title?.includes('Alapítási Központ')));
          if (!hasCenter) {
            console.log(`      🏛️ Alapítási központ és interaktív jelentkezés közzététele...`);
            const payload = createFoundingCenterPayload();
            await textCh.send(payload);
          }
        }

        // Kezdő üzenetek: Hasznos linkek
        if (chSpec.name === '🔗・hasznos-linkek' && channel.type === ChannelType.GuildText) {
          const textCh = channel as TextChannel;
          const messages = await textCh.messages.fetch({ limit: 5 });
          if (messages.size === 0) {
            console.log(`      🔗 Hasznos linkek beágyazás közzététele...`);
            const linksEmbed = new EmbedBuilder()
              .setTitle('🔗 StrataHu — Hivatalos Linkek & Erőforrások')
              .setColor(0x3b82f6)
              .setDescription('Itt találod a platformhoz kapcsolódó legfontosabb hivatalos hivatkozásokat:')
              .addFields(
                { name: '🌐 Weboldal & Katalógus', value: '[http://localhost:3000](http://localhost:3000) (stratahu.dev)', inline: true },
                { name: '💬 Discord Állandó Meghívó', value: '[https://discord.gg/kNt5sqzM6w](https://discord.gg/kNt5sqzM6w)', inline: true },
                { name: '🐙 GitHub Forráskód', value: '[github.com/CsPS0/StrataHu](https://github.com/CsPS0/StrataHu)', inline: true },
                { name: '📡 REST API Végpont', value: '`http://localhost:5000/api/projects`', inline: true },
                { name: '⚖️ Eltávolítás & Moderáció', value: 'moderation@stratahu.dev (24 órás garancia)', inline: false }
              )
              .setFooter({ text: 'Mentett linkek • Frissítve a legújabb verzióhoz' });

            await textCh.send({ embeds: [linksEmbed] });
          }
        }
      }
    }

    // 3. Szerepkör-alapú jogosultságok (RBAC) és szobai szabályzatok élesítése
    console.log('\n3. Csatornánkénti jogosultsági szintek és szabályzatok érvényesítése...');
    await applyAllChannelPermissions(guild);
    await postAllChannelRulesets(guild);

    console.log('\n✅ A Discord szerver struktúrája, hitelesítése, jogosultságai és szabályzatai sikeresen konfigurálva lettek!');
  } finally {
    client.destroy();
  }
}
