export interface Track {
  title: string;
  artist: string;
  url: string;
  duration: number;
  thumbnail: string;
  requestedBy: string;
  provider: 'youtube' | 'spotify';
  searchQuery?: string;
  streamUrl?: string;
}
