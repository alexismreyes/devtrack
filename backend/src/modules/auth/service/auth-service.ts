import type { UnitOfWork } from "../../projects/access/unit-of-work";
import type { AuthSession } from "../domain/auth-session";
import {
  InvalidCredentialsError,
  InvalidCurrentPasswordError,
  PasswordPolicyError,
  UnauthenticatedError,
} from "../domain/errors";
import { hashPassword, verifyPassword } from "../domain/password-hasher";
import type { AuthRepository } from "../repository/auth-repository";
import { DuplicateEmailError } from "../../users/domain/errors";
import type {
  UserIdentity,
  UsersIdentityPort,
} from "../../users/identity/users-identity-port";

const SESSION_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const MIN_PASSWORD_LENGTH = 8;

export type RegisterInput = {
  email: string;
  password: string;
  displayName: string;
};

export type LoginInput = {
  email: string;
  password: string;
};

export type ChangePasswordInput = {
  currentPassword: string;
  newPassword: string;
};

export type AuthenticatedActor = {
  userId: string;
  sessionId: string;
};

export type AuthSuccess = {
  user: UserIdentity;
  session: AuthSession;
};

export class AuthService {
  constructor(
    private readonly auth: AuthRepository,
    private readonly users: UsersIdentityPort,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  async register(input: RegisterInput): Promise<AuthSuccess> {
    const existing = await this.users.findByEmail(input.email);
    if (existing !== null) {
      throw new DuplicateEmailError();
    }
    const passwordHash = await hashPassword(input.password);
    const registered = await this.auth.createRegisteredUser({
      email: input.email,
      displayName: input.displayName,
      passwordHash,
    });
    return {
      user: toIdentity(registered.user),
      session: registered.session,
    };
  }

  async login(input: LoginInput): Promise<AuthSuccess> {
    const user = await this.users.findByEmail(input.email);
    const passwordHash =
      user === null ? null : await this.auth.findPasswordHashByUserId(user.id);
    const passwordMatches =
      passwordHash !== null &&
      (await verifyPassword(passwordHash, input.password));

    if (user === null || passwordHash === null || !passwordMatches) {
      throw new InvalidCredentialsError();
    }

    const session = await this.auth.createSession(user.id);
    return { user, session };
  }

  async logout(sessionId: string): Promise<void> {
    await this.auth.revokeSession(sessionId);
  }

  async changePassword(
    actor: AuthenticatedActor,
    input: ChangePasswordInput,
  ): Promise<void> {
    const currentPassword = input.currentPassword;
    const newPassword = input.newPassword;

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      throw new PasswordPolicyError(
        "Password must be at least 8 characters",
      );
    }
    if (newPassword === currentPassword) {
      throw new PasswordPolicyError(
        "New password must differ from the current password",
      );
    }

    const passwordHash = await this.auth.findPasswordHashByUserId(actor.userId);
    const matches =
      passwordHash !== null &&
      (await verifyPassword(passwordHash, currentPassword));
    if (!matches) {
      throw new InvalidCurrentPasswordError();
    }

    const nextHash = await hashPassword(newPassword);
    await this.unitOfWork.run(async () => {
      await this.auth.savePasswordHash(actor.userId, nextHash);
      await this.auth.revokeSessionsForUserExcept(
        actor.userId,
        actor.sessionId,
      );
    });
  }

  async authenticate(sessionId: string | undefined): Promise<AuthenticatedActor> {
    if (sessionId === undefined || !SESSION_ID_PATTERN.test(sessionId)) {
      throw new UnauthenticatedError();
    }

    const session = await this.auth.findSessionById(sessionId);
    if (session === null || !session.isValid()) {
      throw new UnauthenticatedError();
    }

    const user = await this.users.findById(session.userId);
    if (user === null) {
      throw new UnauthenticatedError();
    }

    return { userId: user.id, sessionId: session.id };
  }
}

function toIdentity(user: UserIdentity): UserIdentity {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
  };
}
