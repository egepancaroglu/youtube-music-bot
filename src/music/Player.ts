// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - ffmpeg-static default export typing mismatch
import ffmpegPath from 'ffmpeg-static';
import {
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  StreamType,
  type AudioPlayer,
  type AudioResource,
  NoSubscriberBehavior,
} from '@discordjs/voice';
import { spawn, type ChildProcess } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import type { Track } from './Track.js';
import { logger } from '../utils/logger.js';

const req = createRequire(import.meta.url);
const ytDlpConstants = req('yt-dlp-exec/src/constants');
const ytDlpPath: string =
  ytDlpConstants.YOUTUBE_DL_PATH ??
  path.join(req.resolve('yt-dlp-exec'), '..', 'bin', 'yt-dlp.exe');

if (ffmpegPath) {
  process.env.FFMPEG_PATH = ffmpegPath as unknown as string;
}

const ffmpeg = ffmpegPath as unknown as string;

function noop() {}

export class Player {
  readonly audioPlayer: AudioPlayer;
  private resource: AudioResource | null = null;
  private _volume = 50;
  private processes: ChildProcess[] = [];

  constructor() {
    this.audioPlayer = createAudioPlayer({
      behaviors: { noSubscriber: NoSubscriberBehavior.Pause },
    });
  }

  async play(track: Track): Promise<void> {
    this.killProcesses();

    let ffmpegInput: string[];

    if (track.streamUrl) {
      ffmpegInput = ['-i', track.streamUrl, '-analyzeduration', '0', '-loglevel', '0', '-f', 's16le', '-ar', '48000', '-ac', '2', 'pipe:1'];
      logger.info('Using prefetched stream URL');
    } else {
      ffmpegInput = ['-i', 'pipe:0', '-analyzeduration', '0', '-loglevel', '0', '-f', 's16le', '-ar', '48000', '-ac', '2', 'pipe:1'];
    }

    const ffmpegProc = spawn(
      ffmpeg,
      ffmpegInput,
      { stdio: [track.streamUrl ? 'ignore' : 'pipe', 'pipe', 'ignore'] },
    );

    ffmpegProc.stdout!.on('error', noop);
    ffmpegProc.on('error', noop);

    if (!track.streamUrl) {
      const ytdlp = spawn(
        ytDlpPath,
        [track.url, '-f', 'bestaudio[ext=webm]/bestaudio/best', '-o', '-', '--no-playlist', '--no-warnings', '-q'],
        { stdio: ['ignore', 'pipe', 'pipe'] },
      );

      this.processes = [ytdlp, ffmpegProc];

      ytdlp.stderr?.on('data', (data: Buffer) => {
        const msg = data.toString().trim();
        if (msg) logger.debug(`yt-dlp: ${msg}`);
      });

      ytdlp.stdout.on('error', noop);
      ffmpegProc.stdin!.on('error', noop);
      ytdlp.on('error', noop);

      ytdlp.stdout.pipe(ffmpegProc.stdin!);
    } else {
      this.processes = [ffmpegProc];
    }

    this.resource = createAudioResource(ffmpegProc.stdout!, {
      inputType: StreamType.Raw,
      inlineVolume: true,
    });
    this.resource.volume?.setVolumeLogarithmic(this._volume / 100);
    this.audioPlayer.play(this.resource);
    logger.info(`Now playing: ${track.title} - ${track.artist}`);
  }

  pause(): boolean {
    return this.audioPlayer.pause();
  }

  resume(): boolean {
    return this.audioPlayer.unpause();
  }

  stop(): void {
    this.audioPlayer.stop(true);
    this.killProcesses();
  }

  private killProcesses(): void {
    for (const proc of this.processes) {
      try {
        proc.stdout?.destroy();
        proc.stderr?.destroy();
        proc.stdin?.destroy();
        proc.kill('SIGKILL');
      } catch {
        // already dead
      }
    }
    this.processes = [];
  }

  get volume(): number {
    return this._volume;
  }

  set volume(value: number) {
    this._volume = Math.min(100, Math.max(0, value));
    this.resource?.volume?.setVolumeLogarithmic(this._volume / 100);
  }

  get isPlaying(): boolean {
    return this.audioPlayer.state.status === AudioPlayerStatus.Playing;
  }

  get isPaused(): boolean {
    return this.audioPlayer.state.status === AudioPlayerStatus.Paused;
  }

  get isIdle(): boolean {
    return this.audioPlayer.state.status === AudioPlayerStatus.Idle;
  }

  onIdle(callback: () => void): void {
    this.audioPlayer.on(AudioPlayerStatus.Idle, callback);
  }

  onError(callback: (error: Error) => void): void {
    this.audioPlayer.on('error', (error) => callback(error));
  }
}
