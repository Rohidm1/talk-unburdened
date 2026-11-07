<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Customer chat sends use the service-only atomic message RPC, coupling credit spending, usage counting and message insertion to prevent bypasses and lost credits.
- Account verification wraps server functions after the managed token attacher; keep the generated authentication files untouched.
- Payments use TanStack server functions and embedded Stripe checkout, not Edge Functions, to match the application's runtime.

- Public content metadata uses route head() and shared SEO/schema helpers; never add a competing head manager or root-level social images.
- Public dilemma detail pages and the sitemap read only prompt columns through a publishable server client; exclude future prompts and paginate sitemap queries without exposing participant data.

- Every paid user action (chat, Speed Chat, community, bottle drop/open/reply) spends credit in the database via one shared spend function; the UI only reacts to its `no_credit` error by calling `openPaywall()`, never by checking balances itself.
- Credit purchases go through one sheet offering web checkout or Google Play; Play purchases are verified server-side with Google and granted idempotently per purchase token, and every grant records its payment source.
- Optional analytics, engagement logging and ads run only after cookie consent; essential storage is always allowed.
- Google Ads tag and conversions live only in `src/lib/google-ads.ts` (loaded by one root component): one tag, consent-gated, events never replayed after a later accept — so ad measurement stays single-sourced and compliant.
- Cookie choices retain versioned, timestamped browser-local history; settings never clear the active choice, and the root Google Ads listener broadcasts cross-tab changes to all consent consumers to make withdrawal immediate.
- The phone bottom bar sets a `--nav-offset` CSS variable; any new fixed-bottom element must offset by it.
- UI text lives in per-language dictionaries under src/locales (English is the source type); new languages are added there, not inline.
- Pre-send safety uses the free on-device word filter (`confirmSafeToSend`) on every user-composed message; the database triggers remain the enforcement layer (masking, slur blocking, per-account limits). No AI moderation.
- Rewards (daily fortune, SOS streaks, referrals) are granted only inside security-definer database functions that are idempotent per day/person and log a credit transaction.
- Reports and blocks go through one `report_content` function feeding the admin Reports tab; matching, bottles and community views must respect `user_blocks`.
- Global overlays (SOS, safety prompt, report sheet, welcome, offline, holiday theme) mount once in the root inside `SafeBoundary` and are opened via window events.
- Chat-partner personas are disclosed on profile cards, in the chat and in the FAQ. Automatic chat replies are off (`AI_REPLIES_ENABLED = false`, enforced server-side); re-enabling them requires restoring AI disclosures site-wide first, because EU AI transparency and ad rules forbid undisclosed AI replies.
