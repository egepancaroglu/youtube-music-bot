export class BotError extends Error {
  constructor(
    message: string,
    public readonly userMessage: string = message,
  ) {
    super(message);
    this.name = 'BotError';
  }
}

export class NotInVoiceChannelError extends BotError {
  constructor() {
    super('User is not in a voice channel', 'You must be in a voice channel to use this command.');
  }
}

export class EmptyQueueError extends BotError {
  constructor() {
    super('Queue is empty', 'The queue is empty. Use `/play` to add tracks.');
  }
}

export class NoResultsError extends BotError {
  constructor(query: string) {
    super(`No results found for: ${query}`, `No results found for **${query}**.`);
  }
}

export class InvalidUrlError extends BotError {
  constructor(url: string) {
    super(`Invalid or unsupported URL: ${url}`, 'That URL is not supported. Try a YouTube or Spotify link.');
  }
}

export class ProviderError extends BotError {
  constructor(provider: string, message: string) {
    super(`[${provider}] ${message}`, `Playback error: ${message}`);
  }
}
