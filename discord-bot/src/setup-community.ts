import {
  AutoModerationActionType,
  AutoModerationRuleEventType,
  AutoModerationRuleTriggerType,
  Client,
  GatewayIntentBits,
  Guild
} from 'discord.js';
import { getDiscordConfig } from './config';

let seq = 1;
function generateSnowflake(): string {
  const epoch = 1420070400000n;
  const time = BigInt(Date.now()) - epoch;
  const id = (time << 22n) + BigInt(seq++);
  return id.toString();
}

export async function setupCommunity(guild: Guild) {
  console.log(`\n======================================================`);
  console.log(`🏰 StrataHu Discord Közösségi Beállítások Konfigurálása`);
  console.log(`Szerver: ${guild.name} (${guild.id})`);
  console.log(`======================================================\n`);

  // 1. Alapvető közösségi adatok frissítése
  console.log('1. Szerver leírás és nyelv frissítése...');
  try {
    await guild.edit({
      description: 'A magyar fejlesztők, szoftverek és nyílt forráskódú projektek kurátori közössége.',
      preferredLocale: 'hu'
    });
    console.log('✅ Szerver leírás és preferredLocale (hu) frissítve.');
  } catch (err: any) {
    console.warn('⚠️ Hiba a szerver adatok szerkesztésekor:', err.message);
  }

  // Csatornák keresése
  const channels = await guild.channels.fetch();
  const getCh = (namePart: string) =>
    channels.find((c) => c && c.name && c.name.toLowerCase().includes(namePart.toLowerCase()));

  const rulesCh = getCh('üdvözlet-és-szabályzat');
  const authCh = getCh('hitelesítés');
  const rolesCh = getCh('szerepkör-választó');
  const generalCh = getCh('általános-társalgó');
  const forumCh = getCh('projekt-beküldések');
  const botGuideCh = getCh('bot-útmutató');
  const linksCh = getCh('hasznos-linkek');
  const annCh = getCh('bejelentések');
  const newProjCh = getCh('új-projektek');
  const starProjCh = getCh('hét-projektje');
  const devHelpCh = getCh('fejlesztői-segítség');
  const devForumCh = getCh('fejlesztői-fórum');
  const secLogCh = getCh('biztonsági-napló');
  const aiCmdCh = getCh('ai-parancsok');
  const teammatesCh = getCh('csapattárs-kereső');
  const offtopicCh = getCh('offtopic');
  const ideasCh = getCh('ötletelés');

  // 2. Üdvözlő képernyő (Welcome Screen) konfigurálása
  console.log('\n2. Üdvözlő képernyő (Welcome Screen) beállítása...');
  if (rulesCh && authCh && rolesCh && generalCh && forumCh) {
    try {
      await guild.editWelcomeScreen({
        enabled: true,
        description: 'Üdv a StrataHu-ban! Csatlakozz a hazai fejlesztői közösséghez!',
        welcomeChannels: [
          { channel: rulesCh.id, description: 'Hivatalos szabályzat és alapelvek', emoji: '👋' },
          { channel: authCh.id, description: 'Tagság megerősítése és GitHub auth', emoji: '🔐' },
          { channel: rolesCh.id, description: 'Válassz fejlesztői szakterületeket', emoji: '🎭' },
          { channel: generalCh.id, description: 'Köszönj be a magyar fejlesztőknek', emoji: '💬' },
          { channel: forumCh.id, description: 'Mutasd be a projektedet vagy böngéssz', emoji: '📦' }
        ]
      });
      console.log('✅ Welcome Screen sikeresen beállítva és bekapcsolva!');
    } catch (err: any) {
      console.error('❌ Hiba a Welcome Screen beállításakor:', err.message);
    }
  } else {
    console.warn('⚠️ Nem található az összes kötelező csatorna a Welcome Screenhez.');
  }

  // 3. Discord Ismerkedés (Onboarding) kérdések és csatornák
  console.log('\n3. Discord Ismerkedés (Onboarding) kérdőív és csatorna-elosztás beállítása...');
  const roles = await guild.roles.fetch();
  const getRole = (name: string) => roles.find((r) => r.name.toLowerCase() === name.toLowerCase());

  const feRole = getRole('Frontend Fejlesztő');
  const beRole = getRole('Backend Fejlesztő');
  const fsRole = getRole('Full-Stack Fejlesztő');
  const mobRole = getRole('Mobil Fejlesztő');
  const devOpsRole = getRole('DevOps / Rendszergazda');
  const aiRole = getRole('AI / Adattudomány');
  const studentRole = getRole('Diák / Pályakezdő');
  const notifyRole = getRole('Projekt Értesítések');

  const defaultChannelIds = [
    rulesCh?.id,
    annCh?.id,
    linksCh?.id,
    authCh?.id,
    rolesCh?.id,
    botGuideCh?.id,
    generalCh?.id,
    newProjCh?.id,
    starProjCh?.id,
    devHelpCh?.id,
    forumCh?.id,
    devForumCh?.id
  ].filter(Boolean) as string[];

  const onboardingPayload = {
    prompts: [
      {
        id: generateSnowflake(),
        title: 'Milyen fejlesztői szakterület érdekel?',
        single_select: false,
        required: true,
        in_onboarding: true,
        type: 0,
        options: [
          {
            id: generateSnowflake(),
            title: 'Frontend Fejlesztés',
            description: 'Vue, React, Svelte, Tailwind CSS, Vite, UI/UX',
            emoji_name: '🎨',
            role_ids: feRole ? [feRole.id] : [],
            channel_ids: [devHelpCh?.id, devForumCh?.id].filter(Boolean) as string[]
          },
          {
            id: generateSnowflake(),
            title: 'Backend Rendszerek',
            description: '.NET, C#, Go, Rust, Node.js, Python, PostgreSQL',
            emoji_name: '⚙️',
            role_ids: beRole ? [beRole.id] : [],
            channel_ids: [devHelpCh?.id, devForumCh?.id].filter(Boolean) as string[]
          },
          {
            id: generateSnowflake(),
            title: 'Full-Stack Építés',
            description: 'Web- és felhőalkalmazások végponttól végpontig',
            emoji_name: '🌐',
            role_ids: fsRole ? [fsRole.id] : [],
            channel_ids: [devHelpCh?.id, devForumCh?.id].filter(Boolean) as string[]
          },
          {
            id: generateSnowflake(),
            title: 'Mobilfejlesztés',
            description: 'Flutter, Dart, React Native, Swift, Kotlin',
            emoji_name: '📱',
            role_ids: mobRole ? [mobRole.id] : [],
            channel_ids: [devHelpCh?.id, devForumCh?.id].filter(Boolean) as string[]
          },
          {
            id: generateSnowflake(),
            title: 'DevOps és Felhő',
            description: 'Docker, Linux VPS, CI/CD, Kubernetes, Cloud',
            emoji_name: '☁️',
            role_ids: devOpsRole ? [devOpsRole.id] : [],
            channel_ids: [devHelpCh?.id, devForumCh?.id].filter(Boolean) as string[]
          },
          {
            id: generateSnowflake(),
            title: 'AI és Adattudomány',
            description: 'LLM-ek, PyTorch, gépi tanulás, RAG ágensek',
            emoji_name: '🧠',
            role_ids: aiRole ? [aiRole.id] : [],
            channel_ids: [aiCmdCh?.id, devHelpCh?.id].filter(Boolean) as string[]
          },
          {
            id: generateSnowflake(),
            title: 'Tanulás és Pályakezdés',
            description: 'Most tanulok kódolni, mentorálást keresek',
            emoji_name: '🎓',
            role_ids: studentRole ? [studentRole.id] : [],
            channel_ids: [devHelpCh?.id].filter(Boolean) as string[]
          }
        ]
      },
      {
        id: generateSnowflake(),
        title: 'Milyen célból csatlakozol a közösséghez?',
        single_select: false,
        required: false,
        in_onboarding: true,
        type: 0,
        options: [
          {
            id: generateSnowflake(),
            title: 'Új projektek és értesítések',
            description: 'Értesítések új beküldött és kiemelt projektekről',
            emoji_name: '🔔',
            role_ids: notifyRole ? [notifyRole.id] : [],
            channel_ids: [forumCh?.id, newProjCh?.id, starProjCh?.id].filter(Boolean) as string[]
          },
          {
            id: generateSnowflake(),
            title: 'Közösségi csevegés és networking',
            description: 'Beszélgetés más hazai fejlesztőkkel',
            emoji_name: '💬',
            role_ids: [],
            channel_ids: [generalCh?.id, teammatesCh?.id, offtopicCh?.id].filter(Boolean) as string[]
          },
          {
            id: generateSnowflake(),
            title: 'Saját projekt bemutatása',
            description: 'Saját app vagy csomag beküldése és promóciója',
            emoji_name: '📦',
            role_ids: [],
            channel_ids: [forumCh?.id, ideasCh?.id].filter(Boolean) as string[]
          }
        ]
      }
    ],
    default_channel_ids: defaultChannelIds,
    enabled: true,
    mode: 0
  };

  try {
    await guild.client.rest.put('/guilds/' + guild.id + '/onboarding', {
      body: onboardingPayload
    });
    console.log('✅ Discord Onboarding sikeresen beállítva és aktiválva!');
  } catch (err: any) {
    console.error('❌ Hiba az Onboarding frissítésekor:', err.rawError || err.message);
  }

  // 4. AutoMod adathalászat és spam védelem
  console.log('\n4. AutoMod csalás- és spamvédelmi szabályok ellenőrzése...');
  try {
    const existingRules = await guild.autoModerationRules.fetch();
    const hasCustom = existingRules.some((r) => r.name.includes('StrataHu Adathalászat'));
    if (!hasCustom && secLogCh) {
      await guild.autoModerationRules.create({
        name: 'StrataHu Adathalászat és Csalás Védelem',
        eventType: AutoModerationRuleEventType.MessageSend,
        triggerType: AutoModerationRuleTriggerType.Keyword,
        triggerMetadata: {
          keywordFilter: [
            '*free nitro*',
            '*discord nitro free*',
            '*steam gift*',
            '*discorcl*',
            '*dlscord*',
            '*gift nitro*'
          ]
        },
        actions: [
          {
            type: AutoModerationActionType.BlockMessage,
            metadata: {
              customMessage:
                'Az üzeneted adathalászat vagy kéretlen tartalom gyanúja miatt tiltásra került a StrataHu védelmi rendszere által.'
            }
          },
          {
            type: AutoModerationActionType.SendAlertMessage,
            metadata: {
              channel: secLogCh.id
            }
          }
        ],
        enabled: true,
        reason: 'StrataHu automatikus csalás- és spamvédelem'
      });
      console.log('✅ StrataHu Adathalászat és Csalás Védelem szabály létrehozva!');
    } else {
      console.log('ℹ️ AutoMod szabályok már érvényben vannak.');
    }
  } catch (err: any) {
    console.warn('⚠️ AutoMod szabály ellenőrzésekor hiba:', err.message);
  }

  console.log(`\n🎉 StrataHu Közösségi Szerver konfiguráció sikeresen befejezve!`);
}

// Ha önálló szkriptként futtatjuk:
if (import.meta.main) {
  const config = getDiscordConfig();
  const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildModeration]
  });

  client.once('ready', async () => {
    try {
      const guild = config.guildId
        ? await client.guilds.fetch(config.guildId)
        : client.guilds.cache.first();

      if (!guild) {
        throw new Error('Nem található a megadott Discord szerver!');
      }

      await setupCommunity(guild);
    } catch (err: any) {
      console.error('Hiba:', err);
    } finally {
      process.exit(0);
    }
  });

  client.login(config.token);
}
