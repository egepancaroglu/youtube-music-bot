const YOUTUBE_VIDEO = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtube\.com\/shorts\/|youtu\.be\/)[\w-]+/;
const YOUTUBE_PLAYLIST = /^(https?:\/\/)?(www\.)?youtube\.com\/playlist\?list=[\w-]+/;
const SPOTIFY_TRACK = /^(https?:\/\/)?open\.spotify\.com\/track\/[\w]+/;
const SPOTIFY_PLAYLIST = /^(https?:\/\/)?open\.spotify\.com\/playlist\/[\w]+/;
const SPOTIFY_ALBUM = /^(https?:\/\/)?open\.spotify\.com\/album\/[\w]+/;

export type InputType =
  | 'youtube_video'
  | 'youtube_playlist'
  | 'spotify_track'
  | 'spotify_playlist'
  | 'spotify_album'
  | 'search';

export function detectInputType(input: string): InputType {
  if (YOUTUBE_PLAYLIST.test(input)) return 'youtube_playlist';
  if (YOUTUBE_VIDEO.test(input)) return 'youtube_video';
  if (SPOTIFY_TRACK.test(input)) return 'spotify_track';
  if (SPOTIFY_PLAYLIST.test(input)) return 'spotify_playlist';
  if (SPOTIFY_ALBUM.test(input)) return 'spotify_album';
  return 'search';
}

export function normalizeYouTubeUrl(url: string): string {
  const shortsMatch = url.match(/youtube\.com\/shorts\/([\w-]+)/);
  if (shortsMatch) {
    return `https://www.youtube.com/watch?v=${shortsMatch[1]}`;
  }
  return url;
}

export function extractSpotifyId(url: string): string {
  const match = url.match(/open\.spotify\.com\/(?:track|playlist|album)\/([\w]+)/);
  return match?.[1] ?? '';
}
