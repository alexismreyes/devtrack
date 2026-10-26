export type UserIdentity = {
  id: string;
  email: string;
  displayName: string;
};

export type CreateUserIdentityInput = {
  email: string;
  displayName: string;
};

export interface UsersIdentityPort {
  create(input: CreateUserIdentityInput): Promise<UserIdentity>;
  findById(id: string): Promise<UserIdentity | null>;
  findByEmail(email: string): Promise<UserIdentity | null>;
}
