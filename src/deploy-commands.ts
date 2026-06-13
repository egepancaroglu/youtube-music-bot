import { REST, Routes } from 'discord.js';
import { config } from './config.js';
import { allCommands } from './client.js';
import { logger } from './utils/logger.js';

const rest = new REST({ version: '10' }).setToken(config.discord.token);

const body = allCommands.map((cmd) => cmd.data.toJSON());

async function deploy() {
  try {
    if (config.discord.guildId) {
      await rest.put(
        Routes.applicationGuildCommands(config.discord.clientId, config.discord.guildId),
        { body },
      );
      logger.info(`Registered ${body.length} commands to guild ${config.discord.guildId}`);
    } else {
      await rest.put(Routes.applicationCommands(config.discord.clientId), { body });
      logger.info(`Registered ${body.length} global commands`);
    }
  } catch (error) {
    logger.error('Failed to deploy commands:', error);
    process.exit(1);
  }
}

deploy();
