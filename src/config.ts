import 'dotenv/config';

function required(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export const config = {
  discord: {
    token: required('DISCORD_TOKEN'),
    clientId: required('DISCORD_CLIENT_ID'),
    guildId: process.env.DISCORD_GUILD_ID ?? '',
  },
  spotify: {
    clientId: process.env.SPOTIFY_CLIENT_ID ?? '',
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET ?? '',
    get enabled() {
      return Boolean(this.clientId && this.clientSecret);
    },
  },
  allowedChannelId: process.env.ALLOWED_CHANNEL_ID ?? '',
  defaultVolume: Math.min(100, Math.max(0, Number(process.env.DEFAULT_VOLUME) || 50)),
};
