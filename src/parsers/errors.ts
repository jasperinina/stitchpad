export class PatternParseError extends Error {
  constructor(
    message: string,
    readonly code: 'unsupported' | 'corrupt' | 'missing' | 'limit' = 'corrupt',
  ) {
    super(message);
    this.name = 'PatternParseError';
  }
}
