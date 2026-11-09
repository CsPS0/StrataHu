import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  Colors,
  EmbedBuilder,
  Guild,
  PermissionFlagsBits,
  TextChannel
} from 'discord.js';

export async function applyAllChannelPermissions(guild: Guild): Promise<void> {
  console.log('Szerepkör-alapú jogosultságok (RBAC) beállítása minden csatornára...');
  const channels = await guild.channels.fetch();
  const roles = await guild.roles.fetch();

  const everyoneRole = guild.roles.everyone;
  const adminRole = roles.find((r) => r.name === 'Alapító / Admin');
  const modRole = roles.find((r) => r.name === 'Moderátor');
  const botOpRole = roles.find((r) => r.name === 'Strata AI Operátor');
  const verifiedTagRole = roles.find((r) => r.name === 'Hitelesített Tag');
  const communityTagRole = roles.find((r) => r.name === 'Közösségi Tag');
  const devRole = roles.find((r) => r.name === 'Hitelesített Fejlesztő');
  const featuredRole = roles.find((r) => r.name === 'Kiemelt Fejlesztő');
  const ossRole = roles.find((r) => r.name === 'Nyílt Forráskódú Alkotó');
  const wickRole = roles.find((r) => r.name === 'Wick Védelem' || r.name === 'Wick');
  const musicRole = roles.find((r) => r.name === 'Zene Bot' || r.name === 'Jockie Music');

  if (!adminRole || !modRole || !botOpRole) {
    console.warn('Figyelmeztetés: Néhány alapvető admin/mod szerepkör nem található!');
    return;
  }

  // Azonosított verified szerepkörök listája
  const verifiedRoleIds = [
    adminRole.id,
    modRole.id,
    botOpRole.id,
    ...(verifiedTagRole ? [verifiedTagRole.id] : []),
    ...(communityTagRole ? [communityTagRole.id] : []),
    ...(devRole ? [devRole.id] : []),
    ...(featuredRole ? [featuredRole.id] : []),
    ...(ossRole ? [ossRole.id] : [])
  ];

  for (const [, ch] of channels) {
    if (!ch) continue;

    // 1. KATEGÓRIA / CSATORNA: SZIGORÚAN STAFF-ONLY (Biztonsági napló, Audit napló, Staff szoba)
    if (
      ch.name.includes('biztonsági-napló') ||
      ch.name.includes('audit-napló') ||
      ch.name.includes('staff-szoba')
    ) {
      console.log(`  🔒 Staff-only védelem beállítása: #${ch.name}`);
      await ch.permissionOverwrites.set([
        {
          id: everyoneRole.id,
          deny: [PermissionFlagsBits.ViewChannel]
        },
        {
          id: adminRole.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.ManageMessages
          ]
        },
        {
          id: modRole.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.ManageMessages
          ]
        },
        {
          id: botOpRole.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.EmbedLinks
          ]
        },
        ...(wickRole
          ? [
              {
                id: wickRole.id,
                allow: [
                  PermissionFlagsBits.ViewChannel,
                  PermissionFlagsBits.SendMessages,
                  PermissionFlagsBits.ReadMessageHistory
                ]
              }
            ]
          : [])
      ]);
      continue;
    }

    // 2. TÁJÉKOZTATÓ & HIVATALOS CSATORNÁK (Read-Only a tagoknak, Staff/Bot írhat)
    if (
      ch.name.includes('üdvözlet') ||
      ch.name.includes('szabályzat') ||
      ch.name.includes('hitelesítés') ||
      ch.name.includes('szerepkör-választó') ||
      ch.name.includes('bot-útmutató') ||
      ch.name.includes('bejelentések') ||
      ch.name.includes('hasznos-linkek') ||
      ch.name.includes('hét-projektje')
    ) {
      console.log(`  📢 Olvasási jog és védelem: #${ch.name}`);
      await ch.permissionOverwrites.set([
        {
          id: everyoneRole.id,
          deny: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.CreatePublicThreads, PermissionFlagsBits.CreatePrivateThreads],
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AddReactions]
        },
        {
          id: adminRole.id,
          allow: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageMessages, PermissionFlagsBits.EmbedLinks]
        },
        {
          id: modRole.id,
          allow: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageMessages, PermissionFlagsBits.EmbedLinks]
        },
        {
          id: botOpRole.id,
          allow: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks, PermissionFlagsBits.AttachFiles]
        }
      ]);
      continue;
    }

    // 3. FÓRUM CSATORNÁK (📦・projekt-beküldések, 🛠️・fejlesztői-fórum)
    if (ch.type === ChannelType.GuildForum) {
      console.log(`  📦 Fórum hozzáférési szintek: #${ch.name}`);
      const overwrites: any[] = [
        {
          id: everyoneRole.id,
          deny: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.CreatePublicThreads, PermissionFlagsBits.CreatePrivateThreads],
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AddReactions]
        },
        {
          id: adminRole.id,
          allow: [PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ManageThreads, PermissionFlagsBits.SendMessages]
        },
        {
          id: modRole.id,
          allow: [PermissionFlagsBits.ManageThreads, PermissionFlagsBits.SendMessages]
        }
      ];

      for (const roleId of verifiedRoleIds) {
        overwrites.push({
          id: roleId,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.CreatePublicThreads,
            PermissionFlagsBits.SendMessagesInThreads,
            PermissionFlagsBits.AttachFiles,
            PermissionFlagsBits.EmbedLinks,
            PermissionFlagsBits.AddReactions
          ]
        });
      }

      await ch.permissionOverwrites.set(overwrites);
      continue;
    }

    // 4. KÖZÖSSÉGI CSEVEGŐ ÉS SEGÍTŐ CSATORNÁK
    // (Új tag látja, de a spambotok kizárásához HITELESÍTÉS szükséges az üzenetküldéshez!)
    if (ch.type === ChannelType.GuildText) {
      console.log(`  💬 Hitelesítéshez kötött csevegő: #${ch.name}`);
      const overwrites: any[] = [
        {
          id: everyoneRole.id,
          deny: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles],
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AddReactions]
        },
        {
          id: adminRole.id,
          allow: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageMessages, PermissionFlagsBits.AttachFiles]
        },
        {
          id: modRole.id,
          allow: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageMessages, PermissionFlagsBits.AttachFiles]
        },
        {
          id: botOpRole.id,
          allow: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks, PermissionFlagsBits.AttachFiles]
        }
      ];

      // Zene szobában zenebot is írhat
      if (ch.name.includes('zene-parancsok') && musicRole) {
        overwrites.push({
          id: musicRole.id,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks]
        });
      }

      for (const roleId of verifiedRoleIds) {
        overwrites.push({
          id: roleId,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.AttachFiles,
            PermissionFlagsBits.EmbedLinks,
            PermissionFlagsBits.UseExternalEmojis
          ]
        });
      }

      await ch.permissionOverwrites.set(overwrites);
      continue;
    }

    // 5. HANGCSATORNÁK (Voice Channels)
    if (ch.type === ChannelType.GuildVoice) {
      console.log(`  🔊 Hangcsatorna jogosultságok: #${ch.name}`);
      await ch.permissionOverwrites.set([
        {
          id: everyoneRole.id,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect, PermissionFlagsBits.Speak]
        },
        {
          id: adminRole.id,
          allow: [PermissionFlagsBits.MuteMembers, PermissionFlagsBits.DeafenMembers, PermissionFlagsBits.MoveMembers]
        },
        {
          id: modRole.id,
          allow: [PermissionFlagsBits.MuteMembers, PermissionFlagsBits.DeafenMembers, PermissionFlagsBits.MoveMembers]
        }
      ]);
      continue;
    }
  }

  console.log('✅ Minden csatorna és kategória jogosultsága sikeresen beállítva!');
}

export async function postAllChannelRulesets(guild: Guild): Promise<void> {
  console.log('Dedikált szobai szabályzatok és tájékoztató kártyák közzététele...');
  const channels = await guild.channels.fetch();

  // 1. Általános társalgó szabályzata
  const generalCh = channels.find((c) => c && c.isTextBased() && c.name.includes('általános-társalgó')) as TextChannel | undefined;
  if (generalCh) {
    const msgs = await generalCh.messages.fetch({ limit: 10 });
    const hasRules = msgs.some((m) => m.embeds.some((e) => e.title?.includes('Általános Társalgó — Etikett')));
    if (!hasRules) {
      const embed = new EmbedBuilder()
        .setTitle('💬 Általános Társalgó — Etikett & Szabályok')
        .setColor(0x6366f1)
        .setDescription(
          'Ez a szoba a hazai fejlesztői ökoszisztéma, technológiai trendek és kötetlen szakmai beszélgetések központi tere.'
        )
        .addFields(
          {
            name: '✅ Támogatott témák',
            value:
              '• Hazai és nemzetközi szoftverfejlesztési hírek, keretrendszer-frissítések\n' +
              '• Szakmai karrier, tapasztalatcsere, munkaerőpiaci meglátások\n' +
              '• Kisebb kódolási érdekességek, benchmarkok és vitaindítók',
            inline: false
          },
          {
            name: '❌ Nem támogatott / Tiltott',
            value:
              '• Személyeskedés, lekezelő hangnem, politikai viták (erre ott a `#☕・offtopic`)\n' +
              '• Részletes hibaelhárítási kérdések (használd a `#❓・fejlesztői-segítség` szobát!)\n' +
              '• Kéretlen önreklám és affiliate linkek',
            inline: false
          }
        )
        .setFooter({ text: 'StrataHu • Kulturált szakmai diskurzus' });

      const msg = await generalCh.send({ embeds: [embed] });
      await msg.pin().catch(() => {});
      console.log('  ✓ Általános társalgó szabályzat közzétéve!');
    }
  }

  // 2. Csapattárs-kereső szabályzata és sablonja
  const teamCh = channels.find((c) => c && c.isTextBased() && c.name.includes('csapattárs-kereső')) as TextChannel | undefined;
  if (teamCh) {
    const msgs = await teamCh.messages.fetch({ limit: 10 });
    const hasRules = msgs.some((m) => m.embeds.some((e) => e.title?.includes('Csapattárs-kereső Sablon')));
    if (!hasRules) {
      const embed = new EmbedBuilder()
        .setTitle('🤝 Csapattárs-kereső Sablon & Szabályzat')
        .setColor(0x3b82f6)
        .setDescription(
          'Társalapítót, nyílt forráskódú közreműködőt vagy hobbi projekthez csapattársat keresel? ' +
          'A sikeres toborzáshoz kérjük, hogy az alábbi kötelező elemeket tartalmazza a bejegyzésed:'
        )
        .addFields(
          {
            name: '📝 Ajánlott Beküldési Sablon',
            value:
              '1. **Projekt neve és leírása:** *Mi a projekt célja és jelenlegi állapota?*\n' +
              '2. **Keresett szerepkör:** *Pl. Frontend fejlesztő (Vue 3), Backend (.NET), UI/UX designer*\n' +
              '3. **Technológiai Stack:** *Milyen nyelvek és eszközök szükségesek?*\n' +
              '4. **Együttműködés típusa:** *Nyílt forráskód (OSS), hobbi, részesedés (Equity), vagy fizetett*\n' +
              '5. **Időigény & Elérhetőség:** *Heti becsült óraszám, Discord DM vagy e-mail*',
            inline: false
          },
          {
            name: '⚠️ Szigorú tiltások',
            value:
              '• MLM, kripto-token értékesítés, és rejtett költségű hálózatépítés tilos.\n' +
              '• Teljes munkaidős ingyenmunka kérése üzleti haszonszerzés céljából nem engedélyezett.',
            inline: false
          }
        )
        .setFooter({ text: 'StrataHu Toborzási Szabályzat' });

      const msg = await teamCh.send({ embeds: [embed] });
      await msg.pin().catch(() => {});
      console.log('  ✓ Csapattárs-kereső szabályzat közzétéve!');
    }
  }

  // 3. Ötletelés és visszajelzés szabályzata
  const ideaCh = channels.find((c) => c && c.isTextBased() && c.name.includes('ötletelés-és-visszajelzés')) as TextChannel | undefined;
  if (ideaCh) {
    const msgs = await ideaCh.messages.fetch({ limit: 10 });
    const hasRules = msgs.some((m) => m.embeds.some((e) => e.title?.includes('Ötletelés & Visszajelzés')));
    if (!hasRules) {
      const embed = new EmbedBuilder()
        .setTitle('💡 Ötletelés & Visszajelzés — Útmutató')
        .setColor(0x8b5cf6)
        .setDescription(
          'Mielőtt belevágsz egy több hónapos fejlesztésbe, itt megoszthatod a nyers ötleteidet, architektúrális terveidet és drótvázaidat.'
        )
        .addFields(
          {
            name: '🎯 Hogyan kérj jó visszajelzést?',
            value:
              '• Fogalmazd meg a célközönséget: *Kinek old meg problémát a szoftver?*\n' +
              '• Hozz fel 1-2 meglévő alternatívát, és hogy miben lennél más.\n' +
              '• Ha van Figma terv, wireframe vagy MVP demó, mindenképp csatold!',
            inline: false
          },
          {
            name: '🤝 A visszajelzőknek (Konstruktív kritika)',
            value:
              'Ne azt mondd, hogy „ez nem fog működni”, hanem fejtsd ki az okot és javasolj alternatívát (Szendvics-módszer: ami jó + ami kockázatos + lehetséges megoldás).',
            inline: false
          }
        )
        .setFooter({ text: 'StrataHu Ötletinkubátor' });

      const msg = await ideaCh.send({ embeds: [embed] });
      await msg.pin().catch(() => {});
      console.log('  ✓ Ötletelés szabályzat közzétéve!');
    }
  }

  // 4. Fejlesztői segítség szabályzata (SSCCE módszer)
  const helpCh = channels.find((c) => c && c.isTextBased() && c.name.includes('fejlesztői-segítség')) as TextChannel | undefined;
  if (helpCh) {
    const msgs = await helpCh.messages.fetch({ limit: 10 });
    const hasRules = msgs.some((m) => m.embeds.some((e) => e.title?.includes('Kérdezési Útmutató')));
    if (!hasRules) {
      const embed = new EmbedBuilder()
        .setTitle('❓ Fejlesztői Segítség — Kérdezési Útmutató & Szabályzat')
        .setColor(0x10b981)
        .setDescription(
          'Ahhoz, hogy a közösség gyors és pontos választ tudjon adni a technikai elakadásodra, kérjük, hogy az alábbi elvek szerint tedd fel a kérdésedet:'
        )
        .addFields(
          {
            name: '📋 Kötelező minimális információk',
            value:
              '1. **Környezet és verziók:** *Pl. Vue 3.4 + Vite, .NET 10 Minimal API, Node 22, Ubuntu 24.04*\n' +
              '2. **A pontos hibaüzenet:** *Másold be a terminál/konzol hibaüzenetet kódblokkban (` ``` `)!*\n' +
              '3. **Minimális reprodukálható kód (SSCCE):** *Csak azt a 10-20 sort másold be, ami releváns, vagy linkelj egy minimal GitHub repót / StackBlitz demót!*\n' +
              '4. **Mit próbáltál eddig?** *Segíts elkerülni, hogy ugyanazt javasoljuk, amit már kipróbáltál.*',
            inline: false
          },
          {
            name: '❌ Kerülendő magatartás',
            value:
              '• „Valaki help me please” (anélkül, hogy leírnád, mi a gond)\n' +
              '• Monitorról telefonnal fotózott képernyőfotók (használj Win+Shift+S billentyűkombinációt!)\n' +
              '• Titkos jelszavak, API kulcsok vagy éles adatbázis adatok másolása a kódba',
            inline: false
          }
        )
        .setFooter({ text: 'StrataHu Helpdesk • Segíts, hogy segíthessünk!' });

      const msg = await helpCh.send({ embeds: [embed] });
      await msg.pin().catch(() => {});
      console.log('  ✓ Fejlesztői segítség szabályzat közzétéve!');
    }
  }

  // 5. Offtopic szabályzat
  const offCh = channels.find((c) => c && c.isTextBased() && c.name.includes('offtopic')) as TextChannel | undefined;
  if (offCh) {
    const msgs = await offCh.messages.fetch({ limit: 10 });
    const hasRules = msgs.some((m) => m.embeds.some((e) => e.title?.includes('Offtopic Szabályzat')));
    if (!hasRules) {
      const embed = new EmbedBuilder()
        .setTitle('☕ Offtopic — Kötetlen Dumcsi Szabályzat')
        .setColor(0xd97706)
        .setDescription('Itt beszélgethetünk mindenről, ami nem szorosan programozás vagy munka.')
        .addFields(
          {
            name: '☕ Kedvenc témáink',
            value: 'Hardver építés, mechanikus billentyűzetek, kávék, munkaállomások, gamer diskurzus, zeneajánlók, tech könyvek.',
            inline: false
          },
          {
            name: '🚫 Szigorúan Tilos',
            value: 'Politikai viták, pártpolitika, vallási és ideológiai flamewar, NSFW / 18+ tartalom, illegális letöltések.',
            inline: false
          }
        )
        .setFooter({ text: 'StrataHu • Pihenj meg egy kávé mellett' });

      const msg = await offCh.send({ embeds: [embed] });
      await msg.pin().catch(() => {});
      console.log('  ✓ Offtopic szabályzat közzétéve!');
    }
  }

  // 6. Biztonsági napló szabályzata és staff hozzáférési protokoll
  const secCh = channels.find((c) => c && c.isTextBased() && c.name.includes('biztonsági-napló')) as TextChannel | undefined;
  if (secCh) {
    const msgs = await secCh.messages.fetch({ limit: 10 });
    const hasRules = msgs.some((m) => m.embeds.some((e) => e.title?.includes('Bizalmas Védelmi Napló')));
    if (!hasRules) {
      const embed = new EmbedBuilder()
        .setTitle('🛡️ Bizalmas Védelmi Napló — Hozzáférési Szintek & Protokoll')
        .setColor(0xef4444)
        .setDescription(
          'Ez a csatorna a StrataHu biztonsági architektúrájának zárt naplója. ' +
          'A tartalom kizárólag a kijelölt adminisztrátori és moderátori szintek számára érhető el.'
        )
        .addFields(
          {
            name: '🔐 Jogosultsági Szintek (RBAC)',
            value:
              '• **Alapító / Admin:** Teljes felügyelet, vészhelyzeti protokoll indítása (`w!panic`), IP és karantén audit.\n' +
              '• **Moderátor:** Karantén feloldás, figyelmeztetések (warn) és némítások kezelése.\n' +
              '• **Strata AI Operátor:** Automatikus logolás, GitHub hitelesítési és szellemi tulajdon audit.\n' +
              '• **Wick Védelem & Beemo:** Anti-raid és spam automata védelmi bejegyzések.',
            inline: false
          },
          {
            name: '🚨 Incidenskezelési Teendők',
            value:
              '1. Tömeges bot-támadás esetén a `w!panic` paranccsal zárolható a szerver belépési kapuja.\n' +
              '2. Kétség esetén a naplózott ID-k alapján ellenőrizhető a felhasználó Discord regisztrációs dátuma.\n' +
              '3. Minden moderációs intézkedést indokolni kell a belső audit integritása érdekében.',
            inline: false
          }
        )
        .setFooter({ text: 'StrataHu Biztonsági Osztály • Szigorúan Bizalmas' })
        .setTimestamp();

      const msg = await secCh.send({ embeds: [embed] });
      await msg.pin().catch(() => {});
      console.log('  ✓ Biztonsági napló belső protokoll közzétéve!');
    }
  }

  // 7. Zárt Staff szoba létrehozása (ha még nincs)
  const adminCat = channels.find((c) => c && c.type === ChannelType.GuildCategory && (c.name.includes('AI') || c.name.includes('RENDSZER')));
  const staffCh = channels.find((c) => c && c.name.includes('staff-szoba'));
  if (!staffCh && adminCat) {
    console.log('  🔒 Zárt Staff szoba létrehozása: #🔒・staff-szoba...');
    const adminRole = (await guild.roles.fetch()).find((r) => r.name === 'Alapító / Admin');
    const modRole = (await guild.roles.fetch()).find((r) => r.name === 'Moderátor');

    const newStaff = await guild.channels.create({
      name: '🔒・staff-szoba',
      type: ChannelType.GuildText,
      parent: adminCat.id,
      topic: 'Zárt moderátori és adminisztrátori megbeszélések, döntéshozatal és teendők.',
      permissionOverwrites: [
        {
          id: guild.roles.everyone.id,
          deny: [PermissionFlagsBits.ViewChannel]
        },
        ...(adminRole
          ? [
              {
                id: adminRole.id,
                allow: [
                  PermissionFlagsBits.ViewChannel,
                  PermissionFlagsBits.SendMessages,
                  PermissionFlagsBits.ReadMessageHistory,
                  PermissionFlagsBits.ManageMessages
                ]
              }
            ]
          : []),
        ...(modRole
          ? [
              {
                id: modRole.id,
                allow: [
                  PermissionFlagsBits.ViewChannel,
                  PermissionFlagsBits.SendMessages,
                  PermissionFlagsBits.ReadMessageHistory
                ]
              }
            ]
          : [])
      ]
    });

    const staffEmbed = new EmbedBuilder()
      .setTitle('🔒 StrataHu Staff Szoba — Belső Moderátori Tér')
      .setColor(0x1e293b)
      .setDescription(
        'Üdvözlünk a StrataHu belső adminisztrátori és moderátori szobájában!\n\n' +
        'Ez a csatorna kizárólag az **Alapító / Admin** és **Moderátor** szerepkörök számára látható.\n\n' +
        '📌 **Itt egyeztetünk:**\n' +
        '• Felmerülő moderációs vitákról, kitiltásokról és szabálysértésekről\n' +
        '• A weboldalra beküldött új projektek jóváhagyásáról / moderációjáról\n' +
        '• Közösségi eseményekről és új bot-funkciókról'
      )
      .setFooter({ text: 'StrataHu Belső Moderáció' });

    const sent = await newStaff.send({ embeds: [staffEmbed] });
    await sent.pin().catch(() => {});
    console.log('  ✓ Staff szoba sikeresen létrehozva és beállítva!');
  }
}
