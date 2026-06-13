import { generateDependencyReport } from '@discordjs/voice';
import { config } from './config.js';
import { client } from './client.js';
import { logger } from './utils/logger.js';

logger.info('Voice dependency report:\n' + generateDependencyReport());

process.on('unhandledRejection', (error) => {
  logger.error('Unhandled rejection:', error);
});

client.login(config.discord.token).catch((error) => {
  logger.error('Failed to login:', error);
  process.exit(1);
});
