export const CRM_EMAIL_DOMAIN = "anontalk.local";

export function usernameToEmail(username: string) {
  return `${username.trim().toLowerCase()}@${CRM_EMAIL_DOMAIN}`;
}
