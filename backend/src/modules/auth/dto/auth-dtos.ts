export type RegisterRequestDto = {
  email: string;
  password: string;
  displayName: string;
};

export type LoginRequestDto = {
  email: string;
  password: string;
};

export type ChangePasswordRequestDto = {
  currentPassword: string;
  newPassword: string;
};
