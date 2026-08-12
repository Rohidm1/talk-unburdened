export const avatarByKey: Record<string, string> = {
  "profile-1": "/avatars/profile-1.jpg",
  "profile-2": "/avatars/profile-2.jpg",
  "profile-3": "/avatars/profile-3.jpg",
  "profile-4": "/avatars/profile-4.jpg",
  "profile-5": "/avatars/profile-5.jpg",
  "profile-6": "/avatars/profile-6.jpg",
  "profile-7": "/avatars/profile-7.jpg",
  "profile-8": "/avatars/profile-8.jpg",
  "profile-9": "/avatars/profile-9.jpg",
  "profile-10": "/avatars/profile-10.jpg",
  "profile-11": "/avatars/profile-11.jpg",
  "profile-12": "/avatars/profile-12.jpg",
};

export function avatarFor(key: string): string {
  return avatarByKey[key] ?? "/avatars/profile-1.jpg";
}
