import type { MusicProvider } from './Provider.js';
import type { Track } from '../music/Track.js';
import { YouTubeProvider } from './YouTubeProvider.js';
import { SpotifyProvider } from './SpotifyProvider.js';
import { config } from '../config.js';
import { InvalidUrlError, NoResultsError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

export class ProviderRegistry {
  private readonly providers: MusicProvider[] = [];

  constructor() {
    if (config.spotify.enabled) {
      this.providers.push(new SpotifyProvider());
      logger.info('Spotify provider enabled');
    } else {
      logger.warn('Spotify provider disabled (missing credentials)');
    }

    this.providers.push(new YouTubeProvider());
    logger.info('YouTube provider enabled');
  }

  async resolve(input: string, requestedBy: string): Promise<Track[]> {
    const provider = this.providers.find((p) => p.canHandle(input));
    if (!provider) throw new InvalidUrlError(input);

    const tracks = await provider.resolve(input, requestedBy);
    if (tracks.length === 0) throw new NoResultsError(input);

    return tracks;
  }

  async search(query: string, requestedBy: string, limit = 5): Promise<Track[]> {
    const youtube = this.providers.find((p) => p.name === 'youtube');
    if (!youtube) throw new Error('YouTube provider not available');
    return youtube.search(query, requestedBy, limit);
  }
}
