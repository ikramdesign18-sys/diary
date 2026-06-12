export class BackendError extends Error {
  constructor(message: string, readonly status = 500) {
    super(message);
  }
}
