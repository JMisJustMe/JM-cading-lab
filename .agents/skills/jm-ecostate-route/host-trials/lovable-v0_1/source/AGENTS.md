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

## Project rules
- Testbench logic lives as pure functions in `src/lib/jm/core.ts` with tests in `src/test/jm-core.test.ts`; UI only calls them — keeps math/hashing/quarantine independently testable.
- App is local-only: no backend, no storage, no network calls from app code — matches the JM knowledge-contact privacy rules.