export const avatarByKey: Record<string, string> = {
  "profile-1": "/avatars/profile-1.jpg",
  "profile-2": "/avatars/profile-2.jpg",
  "profile-3": "/avatars/profile-3.jpg",
  "profile-4": "/avatars/profile-4.jpg",
  "profile-5": "/avatars/profile-5.jpg",
  "profile-6": "/avatars/profile-6.jpg",
  "profile-7": "/avatars/profile-7.jpg",
};

export function avatarFor(key: string): string {
  return avatarByKey[key] ?? "/avatars/profile-1.jpg";
}
