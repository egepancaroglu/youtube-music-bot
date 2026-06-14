import { execFile } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
const require = createRequire(import.meta.url);
const ytDlpConstants = require('yt-dlp-exec/src/constants');
const ytDlpPath: string =
  ytDlpConstants.YOUTUBE_DL_PATH ??
  path.join(require.resolve('yt-dlp-exec'), '..', 'bin', 'yt-dlp.exe');
import type { MusicProvider } from './Provider.js';
import type { Track } from '../music/Track.js';
import { detectInputType, normalizeYouTubeUrl } from '../utils/url.js';
import { ProviderError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

interface YtDlpEntry {
  id: string;
  title: string;
  channel?: string;
  uploader?: string;
  duration?: number;
  thumbnail?: string;
  thumbnails?: { url: string }[];
  webpage_url?: string;
  original_url?: string;
  url?: string;
}

export class YouTubeProvider implements MusicProvider {
  readonly name = 'youtube';

  canHandle(input: string): boolean {
    const type = detectInputType(input);
    return type === 'youtube_video' || type === 'youtube_playlist' || type === 'search';
  }

  async resolve(input: string, requestedBy: string): Promise<Track[]> {
    const type = detectInputType(input);

    if (type === 'youtube_playlist') {
      return this.resolvePlaylist(input, requestedBy);
    }

    if (type === 'youtube_video') {
      return this.resolveVideo(input, requestedBy);
    }

    return this.search(input, requestedBy, 1);
  }

  async search(query: string, requestedBy: string, limit = 5): Promise<Track[]> {
    try {
      const output = await this.exec([
        `ytsearch${limit}:${query}`,
        '--flat-playlist', '--dump-json', '--no-warnings', '-q',
      ]);

      const entries = output
        .trim()
        .split('\n')
        .filter(Boolean)
        .map((line) => JSON.parse(line) as YtDlpEntry);

      return entries.map((entry) => this.entryToTrack(entry, requestedBy));
    } catch (error) {
      logger.error('YouTube search failed', error);
      throw new ProviderError('YouTube', 'Search failed. Please try again.');
    }
  }

  private async resolveVideo(url: string, requestedBy: string): Promise<Track[]> {
    try {
      url = normalizeYouTubeUrl(url);
      const output = await this.exec([
        url, '--dump-json', '--no-playlist', '--no-warnings', '-q',
      ]);

      const entry = JSON.parse(output.trim()) as YtDlpEntry;
      return [this.entryToTrack(entry, requestedBy)];
    } catch (error) {
      logger.error('YouTube video resolve failed', error);
      throw new ProviderError('YouTube', 'Could not load that video.');
    }
  }

  private async resolvePlaylist(url: string, requestedBy: string): Promise<Track[]> {
    try {
      const output = await this.exec([
        url, '--flat-playlist', '--dump-json', '--no-warnings', '-q',
      ]);

      const entries = output
        .trim()
        .split('\n')
        .filter(Boolean)
        .map((line) => JSON.parse(line) as YtDlpEntry);

      if (entries.length === 0) throw new Error('Empty playlist');

      return entries.map((entry) => this.entryToTrack(entry, requestedBy));
    } catch (error) {
      logger.error('YouTube playlist resolve failed', error);
      throw new ProviderError('YouTube', 'Could not load that playlist.');
    }
  }

  private entryToTrack(entry: YtDlpEntry, requestedBy: string): Track {
    return {
      title: entry.title ?? 'Unknown Title',
      artist: entry.channel ?? entry.uploader ?? 'Unknown Artist',
      url: entry.webpage_url ?? entry.original_url ?? `https://www.youtube.com/watch?v=${entry.id}`,
      duration: entry.duration ?? 0,
      thumbnail: entry.thumbnail ?? entry.thumbnails?.[0]?.url ?? '',
      requestedBy,
      provider: 'youtube',
    };
  }

  private exec(args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      execFile(
        ytDlpPath,
        args,
        { maxBuffer: 50 * 1024 * 1024, timeout: 30_000 },
        (err, stdout) => (err ? reject(err) : resolve(stdout)),
      );
    });
  }
}
