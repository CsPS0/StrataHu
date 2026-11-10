import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Colors,
  EmbedBuilder,
  StringSelectMenuBuilder
} from 'discord.js';

export interface RoleDefinition {
  name: string;
  color: number;
  hoist: boolean;
  mentionable: boolean;
  emojiIcon?: string; // Csak a Discord UI dropdownban/gombokban használjuk, maga a ROLE NEVE SZIGORÚAN EMOJI NÉLKÜLI
  description?: string;
}

// 1. Rendszer- és adminisztrátori szerepkörök (SZIGORÚAN EMOJIK NÉLKÜL)
export const SYSTEM_ROLES: RoleDefinition[] = [
  { name: 'Alapító / Admin', color: 0xf59e0b, hoist: true, mentionable: true },
  { name: 'Alapító Tag', color: 0xd93b00, hoist: true, mentionable: true },
  { name: 'Mentor / Szakértő', color: 0x6a55fa, hoist: true, mentionable: true },
  { name: 'Inkubált Projekt', color: 0x00565b, hoist: true, mentionable: true },
  { name: 'Moderátor', color: 0x3b82f6, hoist: true, mentionable: true },
  { name: 'Strata AI Operátor', color: 0x6366f1, hoist: true, mentionable: true },
  { name: 'Kiemelt Fejlesztő', color: 0xec4899, hoist: true, mentionable: true },
  { name: 'Nyílt Forráskódú Alkotó', color: 0x06b6d4, hoist: true, mentionable: true },
  { name: 'Hitelesített Fejlesztő', color: 0x0ea5e9, hoist: true, mentionable: false },
  { name: 'Hitelesített Tag', color: 0x10b981, hoist: true, mentionable: false },
  { name: 'Közösségi Tag', color: 0x10b981, hoist: false, mentionable: false }
];

// 2. Külső bot integrációs szerepkörök (SZIGORÚAN EMOJIK NÉLKÜL)
export const BOT_INTEGRATION_ROLES: RoleDefinition[] = [
  { name: 'Botok', color: 0x64748b, hoist: true, mentionable: false },
  { name: 'Zene Bot', color: 0xa855f7, hoist: false, mentionable: false },
  { name: 'AmariBot', color: 0xeab308, hoist: false, mentionable: false },
  { name: 'Sapphire', color: 0x3b82f6, hoist: false, mentionable: false },
  { name: 'Wick Védelem', color: 0xef4444, hoist: false, mentionable: false },
  { name: 'esmBot', color: 0xec4899, hoist: false, mentionable: false }
];

// 3. Érdeklődési körök és szakterületek (SZIGORÚAN EMOJIK NÉLKÜL A NÉVBEN)
export const INTEREST_ROLES: RoleDefinition[] = [
  {
    name: 'Frontend Fejlesztő',
    color: 0x38bdf8,
    hoist: false,
    mentionable: false,
    emojiIcon: '🎨',
    description: 'Vue, React, Svelte, Tailwind CSS, Vite, UI/UX'
  },
  {
    name: 'Backend Fejlesztő',
    color: 0x34d399,
    hoist: false,
    mentionable: false,
    emojiIcon: '⚙️',
    description: '.NET, C#, Go, Rust, Node.js, Python, PostgreSQL'
  },
  {
    name: 'Full-Stack Fejlesztő',
    color: 0xa78bfa,
    hoist: false,
    mentionable: false,
    emojiIcon: '🌐',
    description: 'Teljes körű web- és felhőalkalmazások építése'
  },
  {
    name: 'Mobil Fejlesztő',
    color: 0xfb923c,
    hoist: false,
    mentionable: false,
    emojiIcon: '📱',
    description: 'Flutter, Dart, React Native, Swift, Kotlin'
  },
  {
    name: 'DevOps / Rendszergazda',
    color: 0xf472b6,
    hoist: false,
    mentionable: false,
    emojiIcon: '☁️',
    description: 'Docker, Linux VPS, CI/CD folyamatok, Kubernetes'
  },
  {
    name: 'AI / Adattudomány',
    color: 0x818cf8,
    hoist: false,
    mentionable: false,
    emojiIcon: '🧠',
    description: 'LLM-ek, Python, PyTorch, gépi tanulás, RAG'
  },
  {
    name: 'Diák / Pályakezdő',
    color: 0xe879f9,
    hoist: false,
    mentionable: false,
    emojiIcon: '🎓',
    description: 'Tanulás, mentorálás, első projektek és segítségkérés'
  },
  {
    name: 'Projekt Értesítések',
    color: 0xfacc15,
    hoist: false,
    mentionable: true,
    emojiIcon: '🔔',
    description: 'Értesítések új beküldött és kiemelt magyar projektekről'
  },
  {
    name: 'Üzlet / Pályázat / B2G',
    color: 0x0ea5e9,
    hoist: false,
    mentionable: false,
    emojiIcon: '💼',
    description: 'Értékesítés, iskolai/állami kapcsolatok, HSUP, szövetkezet-alapítás'
  },
  {
    name: 'Kód Review & Biztonság',
    color: 0x10b981,
    hoist: false,
    mentionable: false,
    emojiIcon: '🛡️',
    description: 'GDPR megfelelőség, biztonsági audit és kódminőség ellenőrzés'
  }
];

export const ALL_ROLES: RoleDefinition[] = [
  ...SYSTEM_ROLES,
  ...BOT_INTEGRATION_ROLES,
  ...INTEREST_ROLES
];

export function createRoleSelectorPayload() {
  const embed = new EmbedBuilder()
    .setTitle('🎯 Válassz technológiai fókuszt és érdeklődési kört!')
    .setColor(Colors.Purple)
    .setDescription(
      'A **StrataHu** közösségben különböző technológiákkal és területekkel foglalkozó hazai fejlesztők alkotnak együtt.\n\n' +
      'Jelöld be az alábbi legördülő menüben, hogy mely szakterületek érdekelnek leginkább! ' +
      'A szerepkörök alapján könnyebben megtalálhatjátok egymást a csapattárs-keresőben, releváns segítséget kérhettek, és elsőként értesülhettek új fejlesztésekről.\n\n' +
      '*(A választásodat bármikor módosíthatod vagy törölheted)*'
    )
    .addFields(
      INTEREST_ROLES.map((r) => ({
        name: `${r.emojiIcon} ${r.name}`,
        value: r.description || 'Fejlesztői szakterület',
        inline: true
      }))
    )
    .setFooter({ text: 'StrataHu • Automatikus szerepkör-kezelő rendszer' })
    .setTimestamp();

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('select_developer_roles')
    .setPlaceholder('Válassz érdeklődési köröket (több is bejelölhető)...')
    .setMinValues(0)
    .setMaxValues(INTEREST_ROLES.length)
    .addOptions(
      INTEREST_ROLES.map((r) => ({
        label: r.name,
        value: r.name,
        description: r.description ? r.description.slice(0, 100) : undefined,
        emoji: r.emojiIcon
      }))
    );

  const rowMenu = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

  const rowButtons = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('check_my_roles')
      .setLabel('Saját szerepköreim ellenőrzése')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('👤'),
    new ButtonBuilder()
      .setCustomId('clear_developer_roles')
      .setLabel('Szerepkörök visszaállítása / törlése')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('🧹')
  );

  return {
    embeds: [embed],
    components: [rowMenu, rowButtons]
  };
}

export function createVerificationPayload() {
  const embed = new EmbedBuilder()
    .setTitle('🔐 StrataHu Hitelesítési Központ (Member Verification)')
    .setColor(0x10b981)
    .setDescription(
      'Üdvözlünk a **StrataHu** magyar fejlesztői közösségben!\n\n' +
      '🛡️ **Miért szükséges a hitelesítés?**\n' +
      'A kéretlen reklámok, automatizált spambotok és raid-támadások megelőzése érdekében minden új tagnak meg kell erősítenie a tagságát.\n\n' +
      '✅ **Hogyan hitelesítheted magad?**\n' +
      '1. Kattints az alábbi **„🔐 Tagság megerősítése”** gombra az azonnali ellenőrzéshez!\n' +
      '2. Ha hitelesítve vagy, azonnal megkapod a **Hitelesített Tag** szerepkört.\n\n' +
      '🐙 **GitHub Fejlesztői Hitelesítés:**\n' +
      'Ha rendelkezel GitHub profillal, a `/hitelesites github:<felhasznalonev>` paranccsal összekapcsolhatod a fiókodat és megkaphatod a **Hitelesített Fejlesztő** rangot!\n\n' +
      '🌐 **Webes Fiók Létrehozása (Önkiszolgáló szerkesztés & eltávolítás):**\n' +
      'Hitelesített Fejlesztőként kattints a **„🔑 Webes Fiók Kód”** gombra vagy írd be a `/fiok` parancsot az egyszer használatos regisztrációs kódért!'
    )
    .addFields(
      {
        name: '⚡ Azonnali hozzáférés',
        value: 'A hitelesítés után azonnal feloldódik a csevegés az általános társalgóban és a fórumokban!',
        inline: false
      }
    )
    .setFooter({ text: 'StrataHu Biztonsági Kapu • Anti-Spam & Bot Védelem' })
    .setTimestamp();

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('verify_member_button')
      .setLabel('🔐 Tagság megerősítése (Hitelesítés)')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('github_auth_info_button')
      .setLabel('🐙 GitHub Hitelesítés Info')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('generate_web_auth_code')
      .setLabel('🔑 Webes Fiók Kód')
      .setStyle(ButtonStyle.Secondary)
  );

  return {
    embeds: [embed],
    components: [row]
  };
}

export function createBotsDirectoryPayload() {
  const embed = new EmbedBuilder()
    .setTitle('🤖 Ajánlott Közösségi & Védelmi Botok Gyűjteménye')
    .setColor(0x6366f1)
    .setDescription(
      'A StrataHu szerver felkészült a legnépszerűbb, legmegbízhatóbb közösségi, védelmi és szórakoztató botok fogadására.\n' +
      'Az alábbi gombokra kattintva a szerver tulajdonosa vagy adminisztrátora 1 kattintással meghívhatja őket a megfelelő jogosultságokkal:'
    )
    .addFields(
      {
        name: '🎵 Jockie Music (Zene Bot)',
        value:
          '• **Funkció:** Kiváló minőségű zenelejátszás (YouTube, Spotify, SoundCloud, Apple Music).\n' +
          '• **Irányítás:** `#🎵・zene-parancsok` szoba és hangcsatornák.\n' +
          '• **Előtag / Slash:** `m!play <zene>` vagy `/play`',
        inline: false
      },
      {
        name: '📊 AmariBot (Szintezés és Ranglista)',
        value:
          '• **Funkció:** Aktivitás- és üzenet-alapú szintezési rendszer, heti és összesített magyar ranglista.\n' +
          '• **Irányítás:** `#📊・ranglista-és-szintek` szoba.\n' +
          '• **Parancsok:** `:level`, `:leaderboard`, `:rank`',
        inline: false
      },
      {
        name: '💎 Sapphire (Multi-Purpose & Auto-Mod)',
        value:
          '• **Funkció:** Haladó moderáció, testreszabható üdvözlések, reakció-szerepkörök és naplózás.\n' +
          '• **Irányítás:** Dashboard és `/` parancsok.',
        inline: false
      },
      {
        name: '🛡️ Wick & Beemo (Anti-Spam & Raid Védelem)',
        value:
          '• **Funkció:** Gépi tanulásos spambot szűrés, anti-nuke, anti-raid és karantén védelmi rendszer.\n' +
          '• **Napló:** `#🛡️・biztonsági-napló` szoba.',
        inline: false
      },
      {
        name: '🎨 esmBot (Média, Mémek & Képszerkesztés)',
        value:
          '• **Funkció:** Több mint 100 képi, videós és animációs mém- és médiatranszformációs parancs.\n' +
          '• **Irányítás:** `#🎨・média-és-memek` szoba.\n' +
          '• **Parancsok:** `&caption`, `&magik`, `&meme`, `&speed`',
        inline: false
      }
    )
    .setFooter({ text: 'Kattints az alábbi gombokra a hivatalos meghíváshoz!' })
    .setTimestamp();

  const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setLabel('🎵 Jockie Music Meghívása')
      .setStyle(ButtonStyle.Link)
      .setURL('https://discord.com/oauth2/authorize?client_id=411916947773587456&scope=bot&permissions=3148800'),
    new ButtonBuilder()
      .setLabel('📊 AmariBot Meghívása')
      .setStyle(ButtonStyle.Link)
      .setURL('https://discord.com/oauth2/authorize?client_id=339254240012648448&scope=bot&permissions=268443648'),
    new ButtonBuilder()
      .setLabel('💎 Sapphire Meghívása')
      .setStyle(ButtonStyle.Link)
      .setURL('https://discord.com/oauth2/authorize?client_id=741006429388963951&scope=bot%20applications.commands&permissions=8')
  );

  const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setLabel('🛡️ Wick Védelem Meghívása')
      .setStyle(ButtonStyle.Link)
      .setURL('https://discord.com/oauth2/authorize?client_id=536991182035746816&scope=bot&permissions=8'),
    new ButtonBuilder()
      .setLabel('🎨 esmBot Meghívása')
      .setStyle(ButtonStyle.Link)
      .setURL('https://discord.com/oauth2/authorize?client_id=429342139172290560&scope=bot&permissions=274878220352')
  );

  return {
    embeds: [embed],
    components: [row1, row2]
  };
}

export function createFoundingCenterPayload() {
  const embed = new EmbedBuilder()
    .setTitle('🏛️ StrataHu Szövetkezet & Inkubátor — Alapítási Központ')
    .setColor(0xd93b00)
    .setDescription(
      'Célunk egy olyan **magyar fejlesztői közösségi szövetkezet és inkubátor** létrehozása, amely **0 Ft előleggel** karolja fel a hazai diák- és független projekteket (pl. *Firka*, *Pala*), jogi és biztonsági hátteret ad nekik, majd kiviszi őket a nagyvállalati (B2B) és állami/oktatási (B2G) piacra!\n\n' +
      '### 🪜 Hogyan építjük fel tőke nélkül?\n' +
      '**0. Fázis (Aktív):** Közösségi validáció a StrataHu Piactéren és Discordon.\n' +
      '**1. Fázis (0 Ft alaptőke):** Minimum **10 alapító taggal** egy civil **Egyesület** (0 Ft törvényi tőke) + egyetemi **HSUP ösztöndíj** és pályázati bevételek indítása.\n' +
      '**2. Fázis (Nagypiac & B2G):** Kockázatmentes **90 napos iskolai/intézményi pilotok** (GDPR, WCAG, hivatalos API audit után), majd teljes értékű **Szövetkezet / Projektcég** alapítása az első megrendelésekből.\n\n' +
      '### 💰 Sikerdíjas Modell (Zero-Upfront)\n' +
      '• A fejlesztőknek **ingyenes** a csatlakozás és az inkubáció.\n' +
      '• Ha a szervezet értékesíti vagy támogatja a szoftvert, a bevétel **75–85%-a a fejlesztőké**, **15–25%-a pedig az inkubátor alapé**.'
    )
    .addFields(
      {
        name: '👥 Kiket keresünk az Alapító Magcsapatba?',
        value:
          '• **Senior Mentorok & Kód Reviewer-ek** (biztonsági audit, architektúra)\n' +
          '• **Üzleti / B2G & Pályázati Társak** (iskolai pilot, HSUP, értékesítés)\n' +
          '• **Jogi / GDPR Érdeklődők** (alapszabály, IP megállapodás)\n' +
          '• **Saját projekttel rendelkező fejlesztők** (pl. oktatás, AI, DevOps)',
        inline: false
      }
    )
    .setFooter({ text: 'StrataHu • Alapításra Kész Inkubációs Központ' })
    .setTimestamp();

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('open_founder_application_modal')
      .setLabel('Jelentkezek Alapító Társnak')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('🤝'),
    new ButtonBuilder()
      .setCustomId('open_incubator_application_modal')
      .setLabel('Projektem Inkubálását Kérem')
      .setStyle(ButtonStyle.Success)
      .setEmoji('🚀'),
    new ButtonBuilder()
      .setLabel('Sablonok & Terv (GitHub)')
      .setStyle(ButtonStyle.Link)
      .setURL('https://github.com/CsPS0/StrataHu/tree/main/docs')
  );

  return {
    embeds: [embed],
    components: [row]
  };
}
