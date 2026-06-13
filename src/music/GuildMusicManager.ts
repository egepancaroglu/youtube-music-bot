import {
  joinVoiceChannel,
  getVoiceConnection,
  VoiceConnectionStatus,
  entersState,
  type VoiceConnection,
} from '@discordjs/voice';
import type { VoiceBasedChannel, TextChannel } from 'discord.js';
import { EmbedBuilder } from 'discord.js';
import { Queue } from './Queue.js';
import { Player } from './Player.js';
import type { Track } from './Track.js';
import { config } from '../config.js';
import { formatDuration } from '../utils/duration.js';
import { logger } from '../utils/logger.js';

const managers = new Map<string, GuildMusicManager>();

export class GuildMusicManager {
  readonly queue = new Queue();
  readonly player = new Player();
  currentTrack: Track | null = null;
  textChannel: TextChannel | null = null;
  private connection: VoiceConnection | null = null;
  private disconnectTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(public readonly guildId: string) {
    this.player.volume = config.defaultVolume;

    this.player.onIdle(() => {
      this.playNext();
    });

    this.player.onError((error) => {
      logger.error(`Playback error in guild ${guildId}:`, error);
      this.sendEmbed('Playback Error', `Skipping track due to an error.`, 0xff0000);
      this.playNext();
    });
  }

  static get(guildId: string): GuildMusicManager {
    let manager = managers.get(guildId);
    if (!manager) {
      manager = new GuildMusicManager(guildId);
      managers.set(guildId, manager);
    }
    return manager;
  }

  async connect(channel: VoiceBasedChannel): Promise<void> {
    this.clearDisconnectTimer();

    const existing = getVoiceConnection(this.guildId);
    if (existing && existing.joinConfig.channelId === channel.id) {
      this.connection = existing;
      return;
    }

    logger.info(`Joining voice channel ${channel.id} in guild ${this.guildId}`);

    this.connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: this.guildId,
      adapterCreator: channel.guild.voiceAdapterCreator,
      selfDeaf: true,
    });

    this.connection.on('stateChange', (oldState, newState) => {
      logger.info(`Voice connection: ${oldState.status} -> ${newState.status}`);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const networking = Reflect.get(newState, 'networking') as any;
      if (networking?.on) {
        networking.on('stateChange', (os: any, ns: any) => {
          logger.info(`Networking state: ${os?.code} -> ${ns?.code}`);
        });
        networking.on('close', (code: any) => {
          logger.error(`Networking WebSocket closed with code: ${code}`);
        });
        networking.on('error', (err: any) => {
          logger.error(`Networking error: ${err?.message}`);
        });
        networking.on('debug', (msg: any) => {
          logger.debug(`Networking: ${msg}`);
        });
      }
    });

    this.connection.on('debug', (message) => {
      logger.debug(message);
    });

    this.connection.on('error', (error) => {
      logger.error(`Voice connection error: ${error.message}`);
    });

    this.connection.on(VoiceConnectionStatus.Disconnected, async () => {
      try {
        await Promise.race([
          entersState(this.connection!, VoiceConnectionStatus.Signalling, 5_000),
          entersState(this.connection!, VoiceConnectionStatus.Connecting, 5_000),
        ]);
      } catch {
        this.destroy();
      }
    });

    this.connection.subscribe(this.player.audioPlayer);

    try {
      await entersState(this.connection, VoiceConnectionStatus.Ready, 15_000);
      logger.info('Voice connection ready');
    } catch (err) {
      logger.error('Voice connection failed. Final status: ' + this.connection.state.status);
      this.destroy();
      throw new Error('Could not connect to voice channel. Check bot permissions (Connect + Speak).');
    }
  }

  async playTrack(track: Track): Promise<void> {
    this.currentTrack = track;
    await this.player.play(track);
  }

  async playNext(): Promise<void> {
    const next = this.queue.next();
    if (!next) {
      this.currentTrack = null;
      this.scheduleDisconnect();
      return;
    }

    try {
      await this.playTrack(next);
      this.sendNowPlaying(next);
    } catch (error) {
      logger.error('Error playing next track:', error);
      this.playNext();
    }
  }

  disconnect(): void {
    this.queue.clear();
    this.currentTrack = null;
    this.player.stop();
    this.destroy();
  }

  private destroy(): void {
    this.clearDisconnectTimer();
    const conn = getVoiceConnection(this.guildId);
    conn?.destroy();
    this.connection = null;
    managers.delete(this.guildId);
  }

  private scheduleDisconnect(): void {
    this.clearDisconnectTimer();
    this.disconnectTimer = setTimeout(() => {
      this.sendEmbed('Disconnected', 'Left the voice channel due to inactivity.', 0xffaa00);
      this.destroy();
    }, 5 * 60 * 1000);
  }

  private clearDisconnectTimer(): void {
    if (this.disconnectTimer) {
      clearTimeout(this.disconnectTimer);
      this.disconnectTimer = null;
    }
  }

  private sendEmbed(title: string, description: string, color: number): void {
    this.textChannel
      ?.send({
        embeds: [new EmbedBuilder().setTitle(title).setDescription(description).setColor(color)],
      })
      .catch(() => {});
  }

  private sendNowPlaying(track: Track): void {
    const embed = new EmbedBuilder()
      .setTitle('Now Playing')
      .setDescription(`[${track.title}](${track.url})`)
      .addFields(
        { name: 'Artist', value: track.artist, inline: true },
        { name: 'Duration', value: formatDuration(track.duration), inline: true },
        { name: 'Requested By', value: track.requestedBy, inline: true },
      )
      .setThumbnail(track.thumbnail || null)
      .setColor(0x5865f2);

    this.textChannel?.send({ embeds: [embed] }).catch(() => {});
  }
}
