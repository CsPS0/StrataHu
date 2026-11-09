import dotenv from 'dotenv';
import path from 'path';

// Load .env from discord-bot folder first, then workspace root
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '..', '.env') });

export interface DiscordConfig {
  token: string;
  guildId?: string;
  clientId?: string;
}

export function getDiscordConfig(): DiscordConfig {
  const token = process.env.DISCORD_BOT_TOKEN;

  if (!token || token.trim().length === 0) {
    throw new Error(
      'DISCORD_BOT_TOKEN hiányzik! Kérlek add meg a discord-bot/.env fájlban vagy a környezeti változók között.\n' +
      'Útmutató a bot létrehozásához: https://discord.com/developers/applications'
    );
  }

  return {
    token: token.trim(),
    guildId: process.env.DISCORD_GUILD_ID?.trim(),
    clientId: process.env.DISCORD_CLIENT_ID?.trim()
  };
}
