import { SlashCommandBuilder, EmbedBuilder, type ChatInputCommandInteraction, GuildMember, type TextChannel } from 'discord.js';
import { GuildMusicManager } from '../music/GuildMusicManager.js';
import { ProviderRegistry } from '../providers/ProviderRegistry.js';
import { BotError } from '../utils/errors.js';
import { formatDuration } from '../utils/duration.js';
import { logger } from '../utils/logger.js';

const registry = new ProviderRegistry();

export const data = new SlashCommandBuilder()
  .setName('play')
  .setDescription('Play a track or add it to the queue')
  .addStringOption((opt) =>
    opt.setName('query').setDescription('URL or search query').setRequired(true),
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const member = interaction.member as GuildMember;
  const channel = member.voice.channel;

  if (!channel) {
    await interaction.reply({ content: 'You must be in a voice channel to use this command.', ephemeral: true });
    return;
  }

  const query = interaction.options.getString('query', true);
  logger.info(`/play query="${query}" by ${member.displayName}`);
  await interaction.deferReply();

  try {
    const manager = GuildMusicManager.get(interaction.guildId!);
    manager.textChannel = interaction.channel as TextChannel;

    logger.info('Connecting to voice channel...');
    await manager.connect(channel);

    logger.info('Resolving tracks...');
    const tracks = await registry.resolve(query, member.displayName);
    logger.info(`Resolved ${tracks.length} track(s)`);

    if (tracks.length === 1) {
      const track = tracks[0];
      if (manager.currentTrack) {
        manager.queue.add(track);
        const embed = new EmbedBuilder()
          .setTitle('Added to Queue')
          .setDescription(`[${track.title}](${track.url})`)
          .addFields(
            { name: 'Artist', value: track.artist, inline: true },
            { name: 'Duration', value: formatDuration(track.duration), inline: true },
            { name: 'Position', value: `#${manager.queue.size}`, inline: true },
          )
          .setThumbnail(track.thumbnail || null)
          .setColor(0x57f287);
        await interaction.editReply({ embeds: [embed] });
      } else {
        await manager.playTrack(track);
        const embed = new EmbedBuilder()
          .setTitle('Now Playing')
          .setDescription(`[${track.title}](${track.url})`)
          .addFields(
            { name: 'Artist', value: track.artist, inline: true },
            { name: 'Duration', value: formatDuration(track.duration), inline: true },
          )
          .setThumbnail(track.thumbnail || null)
          .setColor(0x5865f2);
        await interaction.editReply({ embeds: [embed] });
      }
    } else {
      const firstTrack = tracks[0];
      const rest = tracks.slice(1);

      if (!manager.currentTrack) {
        await manager.playTrack(firstTrack);
      } else {
        manager.queue.add(firstTrack);
      }
      manager.queue.addMany(rest);

      const totalDuration = tracks.reduce((sum, t) => sum + t.duration, 0);
      const embed = new EmbedBuilder()
        .setTitle('Playlist Added')
        .setDescription(`Added **${tracks.length}** tracks to the queue`)
        .addFields(
          { name: 'Total Duration', value: formatDuration(totalDuration), inline: true },
          { name: 'Queue Size', value: `${manager.queue.size}`, inline: true },
        )
        .setColor(0x5865f2);
      await interaction.editReply({ embeds: [embed] });
    }
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error(`/play failed: ${err.message}`);
    logger.error(err.stack ?? 'No stack trace');
    const message = error instanceof BotError ? error.userMessage : `Error: ${err.message}`;
    await interaction.editReply({ content: message }).catch(() => {});
  }
}
