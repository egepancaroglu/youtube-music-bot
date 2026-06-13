import ytdl from '@distube/ytdl-core';
import { execFile } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
const require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-var-requires
const YouTube = require('youtube-sr').default ?? require('youtube-sr');
const ytDlpConstants = require('yt-dlp-exec/src/constants');
const ytDlpPath: string =
  ytDlpConstants.YOUTUBE_DL_PATH ??
  path.join(require.resolve('yt-dlp-exec'), '..', 'bin', 'yt-dlp.exe');
import type { MusicProvider } from './Provider.js';
import type { Track } from '../music/Track.js';
import { detectInputType, normalizeYouTubeUrl } from '../utils/url.js';
import { ProviderError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

interface YTVideo {
  id?: string;
  title?: string;
  channel?: { name?: string };
  duration?: number;
  thumbnail?: { url?: string };
}

interface YtDlpPlaylistEntry {
  id: string;
  title: string;
  channel?: string;
  uploader?: string;
  duration?: number;
  thumbnail?: string;
  thumbnails?: { url: string }[];
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
      const results: YTVideo[] = await YouTube.search(query, { type: 'video', limit });
      return results.map((video) => this.videoToTrack(video, requestedBy));
    } catch (error) {
      logger.error('YouTube search failed', error);
      throw new ProviderError('YouTube', 'Search failed. Please try again.');
    }
  }

  private async resolveVideo(url: string, requestedBy: string): Promise<Track[]> {
    try {
      url = normalizeYouTubeUrl(url);
      const info = await ytdl.getBasicInfo(url);
      const details = info.videoDetails;
      return [
        {
          title: details.title,
          artist: details.author.name,
          url: details.video_url,
          duration: parseInt(details.lengthSeconds, 10),
          thumbnail: details.thumbnails?.[0]?.url ?? '',
          requestedBy,
          provider: 'youtube',
        },
      ];
    } catch (error) {
      logger.error('YouTube video resolve failed', error);
      throw new ProviderError('YouTube', 'Could not load that video.');
    }
  }

  private async resolvePlaylist(url: string, requestedBy: string): Promise<Track[]> {
    try {
      const output = await new Promise<string>((resolve, reject) => {
        execFile(
          ytDlpPath,
          ['--flat-playlist', '--dump-json', '--no-warnings', '-q', url],
          { maxBuffer: 50 * 1024 * 1024, timeout: 30_000 },
          (err, stdout) => (err ? reject(err) : resolve(stdout)),
        );
      });

      const entries = output
        .trim()
        .split('\n')
        .filter(Boolean)
        .map((line) => JSON.parse(line) as YtDlpPlaylistEntry);

      if (entries.length === 0) throw new Error('Empty playlist');

      return entries.map((entry) => ({
        title: entry.title ?? 'Unknown Title',
        artist: entry.channel ?? entry.uploader ?? 'Unknown Artist',
        url: `https://www.youtube.com/watch?v=${entry.id}`,
        duration: entry.duration ?? 0,
        thumbnail: entry.thumbnail ?? entry.thumbnails?.[0]?.url ?? '',
        requestedBy,
        provider: 'youtube' as const,
      }));
    } catch (error) {
      logger.error('YouTube playlist resolve failed', error);
      throw new ProviderError('YouTube', 'Could not load that playlist.');
    }
  }

  private videoToTrack(video: YTVideo, requestedBy: string): Track {
    return {
      title: video.title ?? 'Unknown Title',
      artist: video.channel?.name ?? 'Unknown Artist',
      url: `https://www.youtube.com/watch?v=${video.id}`,
      duration: Math.floor((video.duration ?? 0) / 1000),
      thumbnail: video.thumbnail?.url ?? '',
      requestedBy,
      provider: 'youtube',
    };
  }
}
