# OGX Smart Ladder V12 — Prestige Edition

Premium modern interface redesign based on V12 Dynamic Court Allocation.

## Visual changes
- Midnight navy and champagne gold visual system
- TOP Court sky blue; all non-TOP courts use identical soft blue-grey
- Minimal geometric court emblems replace fruit icons
- Courts + queue together, players + leaderboard + history together
- Mobile-responsive styling

## Gameplay
Existing V12 Dynamic Court Allocation, Smart Overflow, Fair Rotation, scoring, Rest/Resume, reset buttons and browser-local storage are preserved.

## Installation
Upload index.html, app.js, style.css, v12-ui.js, and README.md to the root of the GitHub Pages repository. Export a session backup before replacing an existing deployment.


Attendance: Players have Pending, SHOW, and NO SHOW in the Players table. New registrations start Pending; existing saved registrations default to SHOW for compatibility. Only SHOW players are eligible for court allocation. Attendance changes persist in browser storage and exported backups. Playing players cannot change attendance until their match ends. Rest remains independent of attendance.


LIVE PLAYER REPLACEMENT: Each live team has Replace buttons beside its two players. Select a SHOW player from the waiting list and confirm. Scores and timer remain unchanged, departing player returns to waiting with original court eligibility, incoming player becomes playing, and replacement is saved in match history. Playing time is split at substitution; only finishing players receive game outcome statistics. Works on overflow matches. This is still browser-local and does not sync across devices.


ATELIER PRO VISUAL REDESIGN: Original CSS-rendered pickleball-court hero graphic (no image dependencies), editorial typography, platinum/forest-lime accents, live-court status bar, unified soft backgrounds on non-TOP courts, sky-blue TOP Court. Game rules and live player replacement unchanged. Works offline with local browser storage.

## Regular Player Registry
The Players page includes **Save regular players**, **Load regular players**, **Export registry**, **Import registry**, and **Delete saved registry**.
- Save merges all current registered players into a separate browser-local registry, identified by case-insensitive name. Saving does not erase previously saved regulars.
- Load adds only missing names to the current session as **Pending**, with zero statistics. Existing players and live games are unchanged. Mark SHOW when they arrive.
- Reset session clears the current session but **preserves the saved registry**. Reset game stats only preserves both.
- Export produces `ogx-regular-players.json`; import merges a previously exported registry file. Session backup remains separate.
- Browser storage is device/browser-specific, not multi-device synchronization. Export both backups before clearing browser data or moving devices.

## V13: Bulk Attendance & Search
- New **Attendance** tab: tick any number of registered players, including Select all visible eligible, choose SHOW / NO SHOW / Pending, and apply in one action. Existing on-court players are excluded to protect active matches.
- Search player names in the **Players** tab, and separately search waiting-player names in the **Next match queue** on the Courts tab. Both searches filter displayed rows only, never affect scheduling.
- Attendance tab also has its own search and single-player attendance dropdowns. Select all only applies to currently visible eligible rows; selections survive search changes until applied or cleared.
- Data continues to save locally in the browser. The regular-player registry and export/import remain available.

## V14: One-go bulk attendance on Players and Waiting Queue
- Tick any number of names directly in the Players list or Next Match Queue. Paired waiting players each have their own checkbox.
- Selections are shared between Players, Waiting Queue, and Attendance tabs. Choose SHOW, NO SHOW, or Pending and Apply to selected once.
- Select all visible respects the active search filter; names hidden by search are not selected automatically.
- Live-match participants cannot be selected or have attendance changed.
- Changing a waiting player to NO SHOW or Pending removes that player from queued pairs. Existing scores and matches remain unchanged.

## V15 — Fixed partners and court visibility
- Court & Live Scores shows player names without gender labels; gender remains available in the Players page.
- LIVE badge is bright red on every court.
- In Players, tick Fixed and choose the partner in the adjacent dropdown. Pairing is reciprocal and persists in session storage/backups.
- Uncheck Fixed to unlink both players. Only players not currently in a match can be paired.
- Normal match selection keeps mutually fixed partners on the same team, and skips a fixed player if their partner is not eligible. Dynamic overflow does not borrow fixed partners.
- Existing TOP-court defender/promoted pair reservations retain ladder precedence; these may supersede fixed pairing until the reserved match completes.


## V17 — ATELIER PRO updates (from supplied files)
- Original five uploaded files retained as the foundation; `cloud-sync.js` added.
- Settings: TOP champion defense on/off. Turn off only after finishing/cancelling live matches. When off, court 1 still ranks highest, but winners there do not defend or get two-win penalties.
- Settings: Rally or traditional side-out (0-0-2). Side-out mode starts at 0-0-2 and only the serving team can gain a point using +1; manually use **Switch server / side-out** to track serve changes. Manual score corrections remain available. This is NOT a full automatic pickleball fault/serve engine.
- Next match queue: checkboxes and its bulk attendance toolbar removed ONLY from this queue. Players and Attendance tabs retain bulk tick functionality.
- Live court cards: softly contrasting BLUE Team A and PEACH Team B borders, backgrounds and name colors.
- Cloud: optional Firebase REST synchronization, one host and any number of read-only viewers, ~3 second polling.

### Configure shared devices
1. Create a Firebase project, enable **Authentication → Sign-in method → Anonymous**, and create **Realtime Database**.
2. Copy the Firebase Realtime Database URL and the Firebase Web API key from the Firebase project settings into the OGX Settings tab.
3. Configure database rules. For **temporary private testing only**, this sample allows ANY authenticated anonymous user to read/write all sessions (not suitable for public use):

```json
{ "rules": { "ogxSessions": { "$session": { ".read": "auth != null", ".write": "auth != null" } } } }
```

4. On the laptop choose Host / editor, generate a long random session code, and connect.
5. On the tablet and phone use the SAME database URL, API key and session code, choose Live viewer, then connect.
6. Changes from the host appear on viewers after approximately 3 seconds. The regular-player registry is still browser-local; it is not synced by this feature.

**SECURITY LIMITATION:** The above rules are a demo only. The host/viewer distinction is implemented in the interface, NOT enforced by Firebase. Anyone with database access and the code may overwrite session data. Do not deploy these rules for public or sensitive use. Use secure role-based Firebase rules and identity management before production. Internet connectivity is required. If the host is offline, local changes may not be uploaded until a later change; export backups regularly.

### Installation
Upload all SIX files: `index.html`, `app.js`, `style.css`, `v12-ui.js`, `cloud-sync.js`, `README.md`.


## V18 — TOP-court appearance and timeout stars
- Turning TOP-court champion defense OFF removes TOP labels (including the court-ranking editor) and uses the same standard-court styling for Court 1 as the other courts. Turning it ON restores the sky-blue TOP appearance and labels. Existing V17 rule restricting mode changes during live matches remains.
- Each team displays one gold star beside its timeout button after one timeout, two after two. The button disables at two; the count persists with the active match in session backups and browser storage.


## V19 — LADDER / SOCIAL PLAY modes
- **LADDER ON**: Original TOP sky-blue court and TOP labels; ranked courts, promotion/relegation, defender streaks, dynamic overflow.
- **LADDER OFF = SOCIAL PLAY**: All courts have the standard background and no TOP labels or rank hierarchy. All eligible SHOW/waiting players may be allocated to any available court; no promotion, relegation, defender pair reservation or dynamic overflow. Selection is randomized among similarly experienced players; reciprocal fixed partners stay on the same team.
- On finishing a SOCIAL PLAY match, all four players return to the general waiting pool, with scores, time played and win/loss statistics recorded. Cancellation also returns all four to the general pool.
- Switching modes requires all courts to be idle and clears old waiting court assignments; other data is preserved.
- Two-star timeout limit and all other V18 features remain.

## V20 — Team timeout stars
Each team may record up to **3 timeouts per match**. One gold star appears beside the Record Team Timeout button for each recorded timeout (★, ★★, ★★★). The button disables at three; the count is saved with the match.


## V21: Singles and right-side play mode sidebar
- Settings has a right-hand sidebar containing TOP-court champion defense and a separate Single player mode checkbox. On mobile it stacks above settings.
- Singles ON assigns exactly one player to Team A and one to Team B on every court. All new matches use 1 vs 1; doubles and fixed partner pair allocation are inactive until singles is OFF.
- Singles works in both LADDER and SOCIAL PLAY. LADDER singles promotes the winning individual and relegates the loser; TOP winner defends up to two wins. SOCIAL singles selects two waiting individuals for any open court and returns both to the general pool after finishing.
- Switching singles or ladder/social requires no active matches.
