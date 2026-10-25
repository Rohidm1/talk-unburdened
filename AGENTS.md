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
