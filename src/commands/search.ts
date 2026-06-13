import {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ComponentType,
  type ChatInputCommandInteraction,
  GuildMember,
  type TextChannel,
} from 'discord.js';
import { GuildMusicManager } from '../music/GuildMusicManager.js';
import { ProviderRegistry } from '../providers/ProviderRegistry.js';
import { NotInVoiceChannelError } from '../utils/errors.js';
import { formatDuration } from '../utils/duration.js';

const registry = new ProviderRegistry();

export const data = new SlashCommandBuilder()
  .setName('search')
  .setDescription('Search for a track and choose from results')
  .addStringOption((opt) =>
    opt.setName('query').setDescription('Search query').setRequired(true),
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const member = interaction.member as GuildMember;
  if (!member.voice.channel) throw new NotInVoiceChannelError();

  const query = interaction.options.getString('query', true);
  await interaction.deferReply();

  const results = await registry.search(query, member.displayName, 5);

  if (results.length === 0) {
    await interaction.editReply({ content: `No results found for **${query}**.` });
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle(`Search Results for "${query}"`)
    .setDescription(
      results
        .map((t, i) => `**${i + 1}.** [${t.title}](${t.url}) — ${t.artist} (${formatDuration(t.duration)})`)
        .join('\n'),
    )
    .setColor(0x5865f2);

  const select = new StringSelectMenuBuilder()
    .setCustomId('search-select')
    .setPlaceholder('Select a track')
    .addOptions(
      results.map((t, i) => ({
        label: t.title.slice(0, 100),
        description: `${t.artist} — ${formatDuration(t.duration)}`.slice(0, 100),
        value: i.toString(),
      })),
    );

  const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);
  const reply = await interaction.editReply({ embeds: [embed], components: [row] });

  try {
    const selection = await reply.awaitMessageComponent({
      componentType: ComponentType.StringSelect,
      filter: (i) => i.user.id === interaction.user.id,
      time: 30_000,
    });

    const index = parseInt(selection.values[0], 10);
    const track = results[index];

    const manager = GuildMusicManager.get(interaction.guildId!);
    manager.textChannel = interaction.channel as TextChannel;
    await manager.connect(member.voice.channel);

    if (manager.currentTrack) {
      manager.queue.add(track);
      await selection.update({
        content: `Added **${track.title}** to the queue.`,
        embeds: [],
        components: [],
      });
    } else {
      await manager.playTrack(track);
      await selection.update({
        content: `Now playing **${track.title}**.`,
        embeds: [],
        components: [],
      });
    }
  } catch {
    await interaction.editReply({ content: 'Selection timed out.', embeds: [], components: [] });
  }
}
