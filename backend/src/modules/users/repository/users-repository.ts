import type { User } from "../domain/user";

export type CreateUserInput = {
  email: string;
  displayName: string;
};

export interface UsersRepository {
  create(input: CreateUserInput): Promise<User>;
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  updateDisplayName(id: string, displayName: string): Promise<User>;
}
