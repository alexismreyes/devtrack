import type { AuthSession } from "../domain/auth-session";
import type { User } from "../../users/domain/user";

export type RegisterPersistenceInput = {
  email: string;
  displayName: string;
  passwordHash: string;
};

export type RegisteredAuthRecord = {
  user: User;
  session: AuthSession;
};

export interface AuthRepository {
  savePasswordHash(userId: string, passwordHash: string): Promise<void>;
  findPasswordHashByUserId(userId: string): Promise<string | null>;
  createSession(userId: string): Promise<AuthSession>;
  findSessionById(id: string): Promise<AuthSession | null>;
  revokeSession(id: string): Promise<void>;
  createRegisteredUser(
    input: RegisterPersistenceInput,
  ): Promise<RegisteredAuthRecord>;
}
