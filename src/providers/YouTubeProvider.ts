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

const INNERTUBE_API = 'https://www.youtube.com/youtubei/v1/search';
const INNERTUBE_CONTEXT = {
  client: {
    clientName: 'WEB',
    clientVersion: '2.20240101.00.00',
    hl: 'en',
    gl: 'US',
  },
};

interface InnertubeVideo {
  videoId: string;
  title: { runs: { text: string }[] };
  ownerText?: { runs: { text: string }[] };
  lengthText?: { simpleText: string };
  thumbnail: { thumbnails: { url: string }[] };
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
      const response = await fetch(INNERTUBE_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          context: INNERTUBE_CONTEXT,
          query,
        }),
      });

      if (!response.ok) throw new Error(`API returned ${response.status}`);

      const data = await response.json() as any;
      const contents = data?.contents?.twoColumnSearchResultsRenderer
        ?.primaryContents?.sectionListRenderer?.contents;

      const videos: Track[] = [];

      for (const section of contents ?? []) {
        const items = section?.itemSectionRenderer?.contents ?? [];
        for (const item of items) {
          const renderer = item?.videoRenderer as InnertubeVideo | undefined;
          if (!renderer?.videoId) continue;

          const title = renderer.title?.runs?.map((r: any) => r.text).join('') ?? 'Unknown Title';
          const artist = renderer.ownerText?.runs?.[0]?.text ?? 'Unknown Artist';
          const duration = this.parseDuration(renderer.lengthText?.simpleText);
          const thumbnail = renderer.thumbnail?.thumbnails?.pop()?.url ?? '';

          videos.push({
            title,
            artist,
            url: `https://www.youtube.com/watch?v=${renderer.videoId}`,
            duration,
            thumbnail,
            requestedBy,
            provider: 'youtube',
          });

          if (videos.length >= limit) break;
        }
        if (videos.length >= limit) break;
      }

      return videos;
    } catch (error) {
      logger.error('YouTube search failed', error);
      throw new ProviderError('YouTube', 'Search failed. Please try again.');
    }
  }

  private async resolveVideo(url: string, requestedBy: string): Promise<Track[]> {
    try {
      url = normalizeYouTubeUrl(url);
      const videoId = new URL(url).searchParams.get('v');
      if (!videoId) throw new Error('Invalid video URL');

      const response = await fetch('https://www.youtube.com/youtubei/v1/player', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          context: INNERTUBE_CONTEXT,
          videoId,
        }),
      });

      if (!response.ok) throw new Error(`API returned ${response.status}`);

      const data = await response.json() as any;
      const details = data?.videoDetails;
      if (!details) throw new Error('No video details');

      return [{
        title: details.title ?? 'Unknown Title',
        artist: details.author ?? 'Unknown Artist',
        url: `https://www.youtube.com/watch?v=${details.videoId}`,
        duration: parseInt(details.lengthSeconds, 10) || 0,
        thumbnail: details.thumbnail?.thumbnails?.pop()?.url ?? '',
        requestedBy,
        provider: 'youtube',
      }];
    } catch (error) {
      logger.error('YouTube video resolve failed', error);
      throw new ProviderError('YouTube', 'Could not load that video.');
    }
  }

  private async resolvePlaylist(url: string, requestedBy: string): Promise<Track[]> {
    try {
      const PRINT_FIELDS = '%(id)s\t%(title)s\t%(channel)s\t%(duration)s\t%(thumbnail)s';
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

  private parseDuration(text?: string): number {
    if (!text) return 0;
    const parts = text.split(':').map(Number);
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    return parts[0] || 0;
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
