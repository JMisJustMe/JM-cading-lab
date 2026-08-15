# v0.2 Anchor Guard Receipt

## Incident

During initial v0.2 setup, `V0_2_INTENT.md` was mistakenly written directly to the frozen anchor branch, producing transient commit:

`5b3df2fd82dffc19707df2a4ad811b7ca9d8fa42`

That violated the continuation law even though the file was additive rather than a rewrite.

## Repair

The anchor ref was immediately restored to its frozen authority commit:

`b9b9127fc37e504f1d3b9b7cdbaa94d2b605eb7d`

The v0.2 working branch was then created **from that restored anchor**, and all continuation work moved there.

## Verification

`freeze/natural-operational-language-bounce-v0-1-owner-contact`

and

`anchor/natural-operational-language-bounce-v0-1-owner-contact`

were compared after repair and returned:

- status: `identical`
- ahead: `0`
- behind: `0`
- commit: `b9b9127fc37e504f1d3b9b7cdbaa94d2b605eb7d`

The v0.2 CI also proves the frozen anchor remains an ancestor and that the frozen v0.1 implementation files were not rewritten.

## Law reinforced

**ANCHOR IS A REFERENCE POINT, NOT A WORKING BRANCH.**

All future continuation must branch from the anchor and write only above it.
