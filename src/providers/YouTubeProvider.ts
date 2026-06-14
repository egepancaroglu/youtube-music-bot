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

const PRINT_FIELDS = '%(id)s\t%(title)s\t%(channel)s\t%(duration)s\t%(thumbnail)s';

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
        '--flat-playlist', '--print', PRINT_FIELDS,
        '--no-warnings', '-q',
      ]);

      return this.parseLines(output, requestedBy);
    } catch (error) {
      logger.error('YouTube search failed', error);
      throw new ProviderError('YouTube', 'Search failed. Please try again.');
    }
  }

  private async resolveVideo(url: string, requestedBy: string): Promise<Track[]> {
    try {
      url = normalizeYouTubeUrl(url);
      const output = await this.exec([
        url, '--no-playlist', '--print', PRINT_FIELDS,
        '--no-warnings', '-q',
      ]);

      return this.parseLines(output, requestedBy);
    } catch (error) {
      logger.error('YouTube video resolve failed', error);
      throw new ProviderError('YouTube', 'Could not load that video.');
    }
  }

  private async resolvePlaylist(url: string, requestedBy: string): Promise<Track[]> {
    try {
      const output = await this.exec([
        url, '--flat-playlist', '--print', PRINT_FIELDS,
        '--no-warnings', '-q',
      ]);

      const tracks = this.parseLines(output, requestedBy);
      if (tracks.length === 0) throw new Error('Empty playlist');
      return tracks;
    } catch (error) {
      logger.error('YouTube playlist resolve failed', error);
      throw new ProviderError('YouTube', 'Could not load that playlist.');
    }
  }

  private parseLines(output: string, requestedBy: string): Track[] {
    return output
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        const [id, title, channel, duration, thumbnail] = line.split('\t');
        return {
          title: title && title !== 'NA' ? title : 'Unknown Title',
          artist: channel && channel !== 'NA' ? channel : 'Unknown Artist',
          url: `https://www.youtube.com/watch?v=${id}`,
          duration: parseInt(duration, 10) || 0,
          thumbnail: thumbnail && thumbnail !== 'NA' ? thumbnail : '',
          requestedBy,
          provider: 'youtube' as const,
        };
      });
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
