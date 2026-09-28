# Platform setup (OAuth & publishing)

PostPilot publishes through official APIs only. Until app review is complete, use **demo OAuth** in Settings → Connected accounts (`PUBLISH_DRY_RUN` defaults to `true`).

## Instagram + Facebook (Meta)

1. Create a Meta app with Instagram Graph API + Facebook Login for Business.
2. Required permissions (typical): `instagram_basic`, `instagram_content_publish`, `pages_show_list`, `pages_read_engagement`, `business_management`.
3. Complete Meta App Review for each permission before production publish.
4. Set `META_APP_ID`, `META_APP_SECRET`, and redirect URI `{AUTH_URL}/api/social/meta/callback` (live callback lands when review passes).
5. Tokens are stored AES-256-GCM encrypted (`TOKEN_ENCRYPTION_KEY`).

## LinkedIn

1. Create a LinkedIn app with Community Management / Share APIs.
2. Company page posting needs organization admin authorization.
3. Set `LINKEDIN_CLIENT_ID` / `LINKEDIN_CLIENT_SECRET` when going live.

## X (Twitter)

1. X API v2 with Read and Write elevated access.
2. OAuth 2.0 PKCE for user context.
3. Set `X_CLIENT_ID` / `X_CLIENT_SECRET`.

## TikTok

1. TikTok for Developers — Content Posting API.
2. App review required for unaudited clients; sandbox first.
3. Set `TIKTOK_CLIENT_KEY` / `TIKTOK_CLIENT_SECRET`.

## WhatsApp approvals

1. WhatsApp Cloud API phone number + permanent token.
2. Set `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_ID`. Magic-link notify uses this when present; otherwise Resend email or console log.

## Safe defaults

- `PUBLISH_DRY_RUN=true` — never hits live social APIs
- Demo connect buttons create encrypted `demo_*` tokens for full UX without app review
