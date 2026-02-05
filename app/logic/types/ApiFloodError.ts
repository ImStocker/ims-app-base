export default class ApiFloodError extends Error {
  repeatIn: number;
  constructor(message: string, repeat_in: number) {
    super(message);
    this.repeatIn = repeat_in;
    if (Error.captureStackTrace) Error.captureStackTrace(this, ApiFloodError);
  }
}
