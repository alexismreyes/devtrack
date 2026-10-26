export type PublicUserDto = {
  id: string;
  email: string;
  displayName: string;
};

export function toPublicUserDto(user: {
  id: string;
  email: string;
  displayName: string;
}): PublicUserDto {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
  };
}
