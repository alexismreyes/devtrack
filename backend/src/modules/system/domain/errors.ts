export class DatabaseUnavailableError extends Error {
  constructor() {
    super("Database is unavailable");
    this.name = "DatabaseUnavailableError";
  }
}
