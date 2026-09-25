# JM Rim Route v0.8.2 — Play App content prep

This is a preparation sheet, not a submitted Google Play questionnaire.

## Advertising
**Current candidate:** No ads. No ad SDK exists in the prepared carrier.

## App access
**Current candidate:** All core gameplay is accessible without login, membership or credentials.

## Online interaction
**Current candidate:** No online PvP, chat, user-generated-content posting or player-to-player network communication is present in v0.8.2. Local 2P is pass-the-phone play on one device.

## Content-rating evidence
Basketball/sports gameplay. Static source inspection and recovered feature text do not indicate gambling, sexual content, drugs, user chat or realistic graphic violence. Google/IARC questionnaire answers must still be completed against the exact release body in Play Console.

## Target audience
**OWNER SELECTION OPEN.** Do not infer a child-directed audience merely because the game is accessible or playful. Select the intended age groups in Play Console deliberately, then satisfy any resulting Families requirements if applicable.

## Permissions
Prepared manifest requests no runtime dangerous permissions and no Internet permission. Recheck the merged release manifest after CI build.

## Privacy policy
A local policy body is included at `app/src/main/assets/privacy.html`. Google Play additionally requires a public non-PDF privacy-policy URL before release; public hosting/contact detail remains a later pre-submission gate.
