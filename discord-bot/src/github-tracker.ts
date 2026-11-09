import { ActionRowBuilder, ButtonBuilder, ButtonStyle, Colors, EmbedBuilder, Guild, TextChannel } from 'discord.js';

interface GitHubTrackerState {
  lastCheckedTag?: string;
  lastKnownStars?: number;
}

let state: GitHubTrackerState = {};

export async function checkGitHubUpdates(guild: Guild): Promise<void> {
  const repoOwner = 'CsPS0';
  const repoName = 'StrataHu';

  try {
    const announceChannel = guild.channels.cache.find(
      (c) => c.isTextBased() && c.name.includes('bejelentések')
    ) as TextChannel | undefined;

    if (!announceChannel) return;

    // 1. Repó adatok lekérése (Stars & Forks)
    const repoRes = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}`, {
      headers: {
        'User-Agent': 'StrataHu-Discord-Bot',
        Accept: 'application/vnd.github.v3+json'
      }
    });

    if (repoRes.ok) {
      const repoData = await repoRes.json();
      const stars: number = repoData.stargazers_count || 0;

      // Mérföldkövek: pl. 10, 25, 50, 100, 250, 500, 1000
      const milestones = [10, 25, 50, 100, 250, 500, 1000];
      if (typeof state.lastKnownStars === 'number') {
        for (const m of milestones) {
          if (state.lastKnownStars < m && stars >= m) {
            const milestoneEmbed = new EmbedBuilder()
              .setTitle(`⭐ Új Mérföldkő: Elértük a ${m} GitHub Csillagot!`)
              .setColor(Colors.Gold)
              .setDescription(
                `A **StrataHu** repó elérte a **${m} csillagot** a GitHubon! Köszönjük a hazai fejlesztői közösség támogatását!\n\n` +
                `Ha még nem csillagoztad, nézd meg a forráskódot:`
              )
              .setFooter({ text: 'StrataHu GitHub Tracker' })
              .setTimestamp();

            const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
              new ButtonBuilder()
                .setLabel('⭐ GitHub Csillagozás')
                .setStyle(ButtonStyle.Link)
                .setURL(`https://github.com/${repoOwner}/${repoName}`)
            );

            await announceChannel.send({ embeds: [milestoneEmbed], components: [row] });
            break;
          }
        }
      }
      state.lastKnownStars = stars;
    }

    // 2. Legfrissebb Release lekérése
    const releaseRes = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/releases/latest`, {
      headers: {
        'User-Agent': 'StrataHu-Discord-Bot',
        Accept: 'application/vnd.github.v3+json'
      }
    });

    if (releaseRes.ok) {
      const releaseData = await releaseRes.json();
      const tagName = releaseData.tag_name;

      if (tagName && state.lastCheckedTag && state.lastCheckedTag !== tagName) {
        const releaseEmbed = new EmbedBuilder()
          .setTitle(`🚀 Új StrataHu Verzió Megjelent: ${releaseData.name || tagName}`)
          .setColor(Colors.Green)
          .setDescription(
            `Új hivatalos verzió jelent meg a GitHubon!\n\n` +
            (releaseData.body ? `${releaseData.body.slice(0, 1500)}\n\n` : '')
          )
          .setFooter({ text: `Verzió: ${tagName} • StrataHu Releases` })
          .setTimestamp();

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setLabel('Release Jegyzetek Megtekintése')
            .setStyle(ButtonStyle.Link)
            .setURL(releaseData.html_url)
        );

        await announceChannel.send({ embeds: [releaseEmbed], components: [row] });
      }

      if (tagName) {
        state.lastCheckedTag = tagName;
      }
    }
  } catch (err: any) {
    // Csendes hiba (pl. rate-limit megelőzésére), nem állítja le a botot
    console.warn('(GitHub tracker figyelmeztetés:', err.message, ')');
  }
}
