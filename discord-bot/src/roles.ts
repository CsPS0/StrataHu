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
  { name: 'Moderátor', color: 0x3b82f6, hoist: true, mentionable: true },
  { name: 'Strata AI Operátor', color: 0x6366f1, hoist: true, mentionable: true },
  { name: 'Kiemelt Fejlesztő', color: 0xec4899, hoist: true, mentionable: true },
  { name: 'Nyílt Forráskódú Alkotó', color: 0x06b6d4, hoist: true, mentionable: true },
  { name: 'Közösségi Tag', color: 0x10b981, hoist: false, mentionable: false }
];

// 2. Érdeklődési körök és szakterületek (SZIGORÚAN EMOJIK NÉLKÜL A NÉVBEN)
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
  }
];

export const ALL_ROLES: RoleDefinition[] = [...SYSTEM_ROLES, ...INTEREST_ROLES];

import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Colors,
  EmbedBuilder,
  StringSelectMenuBuilder
} from 'discord.js';

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
