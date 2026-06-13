import type { Track } from '../music/Track.js';

export interface MusicProvider {
  name: string;
  canHandle(input: string): boolean;
  resolve(input: string, requestedBy: string): Promise<Track[]>;
  search(query: string, requestedBy: string, limit?: number): Promise<Track[]>;
}
