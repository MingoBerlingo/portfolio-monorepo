# CMS Globals Split

Goal: Separate Footer, Hero, and Profile content and save the approved footer payoff.

- [x] Back up current Profile, extract Hero and Footer globals, and register them.
- [x] Generate shared types and migrate existing content through Payload's local API.
- [x] Update web queries, headline, description, footer, and Markdown export to use each global.
- [x] Check live CMS data, type checks, tests, and static build; inspect rendered footer.

Keep all other CMS collections and user changes intact. Preserve public routes and existing layout.

Also completed: preserve physics chip rotations and positions across resize; size changes at 1280px only. Verified by browser regression test.
