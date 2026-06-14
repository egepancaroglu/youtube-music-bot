import {
  Client,
  Collection,
  GatewayIntentBits,
  type ChatInputCommandInteraction,
  type SharedSlashCommand,
} from 'discord.js';
import { config } from './config.js';
import { BotError } from './utils/errors.js';
import { logger } from './utils/logger.js';

import * as play from './commands/play.js';
import * as search from './commands/search.js';
import * as pause from './commands/pause.js';
import * as resume from './commands/resume.js';
import * as skip from './commands/skip.js';
import * as stop from './commands/stop.js';
import * as queue from './commands/queue.js';
import * as nowplaying from './commands/nowplaying.js';
import * as shuffle from './commands/shuffle.js';
import * as remove from './commands/remove.js';
import * as clear from './commands/clear.js';
import * as leave from './commands/leave.js';
import * as volume from './commands/volume.js';

interface Command {
  data: SharedSlashCommand;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}

const commands = new Collection<string, Command>();
const allCommands: Command[] = [
  play, search, pause, resume, skip, stop,
  queue, nowplaying, shuffle, remove, clear, leave, volume,
];

for (const cmd of allCommands) {
  commands.set(cmd.data.name, cmd);
}

export const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

client.once('ready', (c) => {
  logger.info(`Logged in as ${c.user.tag}`);
});

client.on('interactionCreate', async (interaction) => {
  logger.info(`Interaction received: ${interaction.type} / ${interaction.id}`);
  if (!interaction.isChatInputCommand()) return;

  if (config.allowedChannelId && interaction.channelId !== config.allowedChannelId) {
    await interaction.reply({ content: 'Bu komutu sadece <#' + config.allowedChannelId + '> kanalında kullanabilirsin.', ephemeral: true });
    return;
  }

  logger.info(`Command: /${interaction.commandName}`);
  const command = commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    const message = error instanceof BotError ? error.userMessage : 'An unexpected error occurred.';
    logger.error(`Command /${interaction.commandName} failed: ${err.message}`);
    logger.error(err.stack ?? 'No stack trace');

    const reply = { content: message, ephemeral: true };
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply(reply).catch(() => {});
    } else {
      await interaction.reply(reply).catch(() => {});
    }
  }
});

export { allCommands };
