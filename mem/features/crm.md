---
name: CRM team management
description: Internal Anontalk CRM at /crm — admin login, creating worker logins, role model
type: feature
---
- Admin account username: Kindnature (auth email kindnature@anontalk.local), has `admin` role in user_roles.
- /crm-login is the internal sign-in (username + password), /crm is the team screen; both noindex.
- Admin creates worker logins directly (username + password set by admin, no email invites); worker gets `staff` role and is linked to a listeners row (new profile or an existing unlinked one).
- Admin can reset any worker password and hide/show a listener from the public site.
- Workers sign in at /crm-login and use /staff (listener desk).
- When a chat ends, its profile is released immediately but the ended chat stays open in the agent desk until the agent saves a new logbook entry for that conversation; only then does it disappear.
