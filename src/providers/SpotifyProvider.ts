import type { MusicProvider } from './Provider.js';
import type { Track } from '../music/Track.js';
import { config } from '../config.js';
import { detectInputType, extractSpotifyId } from '../utils/url.js';
import { ProviderError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

interface SpotifyTrackData {
  name: string;
  artists: { name: string }[];
  duration_ms: number;
  album?: { images?: { url: string }[] };
  external_urls?: { spotify?: string };
}

interface SpotifyPlaylistResponse {
  items: { track: SpotifyTrackData }[];
  next: string | null;
}

interface SpotifyAlbumTracksResponse {
  items: SpotifyTrackData[];
  next: string | null;
}

export class SpotifyProvider implements MusicProvider {
  readonly name = 'spotify';
  private accessToken = '';
  private tokenExpiry = 0;

  canHandle(input: string): boolean {
    const type = detectInputType(input);
    return type === 'spotify_track' || type === 'spotify_playlist' || type === 'spotify_album';
  }

  async resolve(input: string, requestedBy: string): Promise<Track[]> {
    const type = detectInputType(input);
    const id = extractSpotifyId(input);
    if (!id) throw new ProviderError('Spotify', 'Invalid Spotify URL.');

    await this.ensureToken();

    if (type === 'spotify_track') {
      return this.resolveTrack(id, requestedBy);
    }
    if (type === 'spotify_playlist') {
      return this.resolvePlaylist(id, requestedBy);
    }
    if (type === 'spotify_album') {
      return this.resolveAlbum(id, requestedBy);
    }

    throw new ProviderError('Spotify', 'Unsupported Spotify URL type.');
  }

  async search(_query: string, _requestedBy: string, _limit = 5): Promise<Track[]> {
    return [];
  }

  private async resolveTrack(id: string, requestedBy: string): Promise<Track[]> {
    const data = await this.api<SpotifyTrackData>(`/tracks/${id}`);
    return this.spotifyTracksToPlayable([data], requestedBy);
  }

  private async resolvePlaylist(id: string, requestedBy: string): Promise<Track[]> {
    const allTracks: SpotifyTrackData[] = [];
    let nextUrl: string | null = `/playlists/${id}/tracks?limit=100`;

    while (nextUrl) {
      const page: SpotifyPlaylistResponse = await this.api<SpotifyPlaylistResponse>(nextUrl);
      allTracks.push(...page.items.filter((i) => i.track).map((i) => i.track));
      nextUrl = page.next ? page.next.replace('https://api.spotify.com/v1', '') : null;
    }

    return this.spotifyTracksToPlayable(allTracks, requestedBy);
  }

  private async resolveAlbum(id: string, requestedBy: string): Promise<Track[]> {
    const album = await this.api<{ images?: { url: string }[]; artists: { name: string }[] }>(
      `/albums/${id}`,
    );
    const allTracks: SpotifyTrackData[] = [];
    let nextUrl: string | null = `/albums/${id}/tracks?limit=50`;

    while (nextUrl) {
      const page: SpotifyAlbumTracksResponse = await this.api<SpotifyAlbumTracksResponse>(nextUrl);
      allTracks.push(
        ...page.items.map((t: SpotifyTrackData) => ({
          ...t,
          album: { images: album.images },
        })),
      );
      nextUrl = page.next ? page.next.replace('https://api.spotify.com/v1', '') : null;
    }

    return this.spotifyTracksToPlayable(allTracks, requestedBy);
  }

  private spotifyTracksToPlayable(
    tracks: SpotifyTrackData[],
    requestedBy: string,
  ): Track[] {
    return tracks.map((track) => {
      const artist = track.artists.map((a) => a.name).join(', ');
      return {
        title: track.name,
        artist,
        url: '',
        duration: Math.floor(track.duration_ms / 1000),
        thumbnail: track.album?.images?.[0]?.url ?? '',
        requestedBy,
        provider: 'spotify' as const,
        searchQuery: `${artist} - ${track.name}`,
      };
    });
  }

  private async ensureToken(): Promise<void> {
    if (this.accessToken && Date.now() < this.tokenExpiry) return;

    if (!config.spotify.enabled) {
      throw new ProviderError('Spotify', 'Spotify credentials are not configured.');
    }

    const credentials = Buffer.from(
      `${config.spotify.clientId}:${config.spotify.clientSecret}`,
    ).toString('base64');

    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    if (!response.ok) {
      throw new ProviderError('Spotify', 'Failed to authenticate with Spotify.');
    }

    const data = (await response.json()) as { access_token: string; expires_in: number };
    this.accessToken = data.access_token;
    this.tokenExpiry = Date.now() + data.expires_in * 1000 - 60_000;
  }

  private async api<T>(path: string): Promise<T> {
    const base = path.startsWith('http') ? '' : 'https://api.spotify.com/v1';
    const response = await fetch(`${base}${path}`, {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });

    if (!response.ok) {
      throw new ProviderError('Spotify', `API request failed: ${response.statusText}`);
    }

    return response.json() as Promise<T>;
  }
}
