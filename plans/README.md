# Portfolio motion implementation

Approved scope: the motion audit fixes, coordinated entrances, and brief scrambled link hovers. Based on Emil Kowalski’s `improve-animations`, `review-animations`, and `animate` skills (https://github.com/emilkowalski/skills). No new animation dependency.

| Plan | Status | Dependencies |
| --- | --- | --- |
| 001 Motion accessibility and lifecycle | TODO | None |
| 002 Navigation and card interactions | TODO | None |
| 003 Coordinated page entrances | TODO | 001, 002 |
| 004 Scrambled link hover feedback | TODO | 002 |

Execute in numbered order, one focused commit per plan. First preserve existing CMS and homepage work in separate commits. Keep all content, responsive sizing, the current description scroll reveal and prior no-blur preference. Marketing entrance duration is deliberately 450ms; UI interactions are 200ms, scramble is 200ms maximum. Build plans with tests, then perform a whole-change review.
