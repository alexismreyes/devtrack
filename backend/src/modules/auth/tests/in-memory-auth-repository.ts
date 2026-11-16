import { AuthSession } from "../domain/auth-session";
import { SessionNotFoundError } from "../domain/errors";
import type {
  AuthRepository,
  RegisterPersistenceInput,
  RegisteredAuthRecord,
} from "../repository/auth-repository";
import type { InMemoryUsersRepository } from "../../users/tests/in-memory-users-repository";

export class InMemoryAuthRepository implements AuthRepository {
  readonly passwordHashes = new Map<string, string>();
  readonly sessions = new Map<string, AuthSession>();

  constructor(private readonly users: InMemoryUsersRepository) {}

  async savePasswordHash(userId: string, passwordHash: string): Promise<void> {
    this.passwordHashes.set(userId, passwordHash);
  }

  async findPasswordHashByUserId(userId: string): Promise<string | null> {
    return this.passwordHashes.get(userId) ?? null;
  }

  async createSession(userId: string): Promise<AuthSession> {
    const session = AuthSession.issue(userId);
    this.sessions.set(session.id, session);
    return session;
  }

  async findSessionById(id: string): Promise<AuthSession | null> {
    return this.sessions.get(id) ?? null;
  }

  async revokeSession(id: string): Promise<void> {
    const existing = this.sessions.get(id);
    if (existing === undefined) {
      throw new SessionNotFoundError();
    }
    this.sessions.set(id, existing.revoke());
  }

  async revokeSessionsForUserExcept(
    userId: string,
    sessionId: string,
  ): Promise<void> {
    for (const [id, session] of this.sessions) {
      if (session.userId !== userId || id === sessionId) {
        continue;
      }
      this.sessions.set(id, session.revoke());
    }
  }

  async createRegisteredUser(
    input: RegisterPersistenceInput,
  ): Promise<RegisteredAuthRecord> {
    const user = await this.users.create({
      email: input.email,
      displayName: input.displayName,
    });
    await this.savePasswordHash(user.id, input.passwordHash);
    const session = await this.createSession(user.id);
    return { user, session };
  }

  putSession(session: AuthSession): void {
    this.sessions.set(session.id, session);
  }
}
