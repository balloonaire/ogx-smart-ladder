# OGX Smart Ladder V12 — Sporty Fun Pro

Static offline-capable browser app. Open index.html or publish all five files together to GitHub Pages.

## V12 changes
- Sporty Fun Pro dashboard with fruit graphics, large cards and responsive navigation tabs.
- TOP-ranked court is sky blue (#A8DCF7), regardless of physical court number.
- Every non-TOP court uses the same soft blue-grey (#E8F0F2).
- Court status, match scoring and all V11 Smart Court Overflow/Fair Rotation rules are retained.
- Players, queue, leaderboard/history and settings are separated into accessible tabs.
- Existing two reset buttons are preserved under Players, with Reset game stats only below Reset session.

## Important
V12 changes presentation only; it does not reset or migrate local storage. Session data is stored in the same browser as V11. Export a backup before updating.

V12 layout update: The Next Match Queue is directly below the Courts section in the same Courts view. The separate Queue tab is removed; all queue controls and game logic remain unchanged.

V12 layout update: Courts and Next Match Queue share the Courts tab. Players, Leaderboard, and Match History share the Players tab. The separate Leaderboard tab is removed.


## Dynamic Court Allocation update
- Automatically attempts regular court assignments before filling idle courts with four players from a busy court's waiting list.
- Prioritizes adjacent court queues, fewer games, less accumulated playing time and longest waiting time.
- TOP defenders and promoted contenders remain protected; overflow matches are provisional and do not confer TOP promotion.
- Players return to their original court eligibility when an overflow match completes or is cancelled.
- Works across any configured number of courts; requires four eligible waiting players assigned to the same currently occupied court.
- Local browser data is retained; export a backup before upgrading.
