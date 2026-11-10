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


## V22 — Concurrent singles and doubles courts
- Enable **Single player mode** in the right-hand Settings sidebar, then tick the physical courts assigned to singles (1 vs 1).
- Unselected courts continue to run doubles (2 vs 2), including while singles matches are active.
- Only idle courts can be reassigned; live matches and scores remain untouched.
- The global waiting player pool feeds both match types; no player can be assigned to two simultaneous matches.
- If auto-fill is enabled, singles courts are filled before doubles courts. Existing LADDER / SOCIAL PLAY selection remains active.
- Turn singles off only after any active singles matches have finished or been cancelled.
- This is a local code update; live Firebase synchronization still requires testing.

## V23 — OGX Nightshift color system
The complete interface is refreshed around **Onyx Black `#010101`**, **Electric Indigo `#6331FB`**, and **Tropical Mint `#88F9C0`**. Onyx is the main canvas, Indigo defines navigation and championship emphasis, and Mint highlights actions, live status, and selections. Teams retain distinct high-contrast indigo-tinted and mint-tinted panels. This update is visual only: V22 mixed singles/doubles court assignment and prior gameplay features are preserved.


## V24 — One-click WIN (no points required)
Each active team has a **🏆 WIN** button. Selecting it opens a confirmation naming the team, then finishes the match, updates wins/losses, match history, player rotation and court availability, without needing a score. Match history displays **WIN ONLY** rather than 0–0 for these results; point differential is not changed. Existing score-entry and Finish options are unchanged.


## V25 — Settings-controlled Quick WIN
- A new **Quick WIN (no score entry)** checkbox appears in Settings → PLAY MODES (right sidebar).
- **OFF by default**: Quick WIN buttons are hidden from live match cards. Regular score entry and Finish remain available.
- **ON**: each live team has a 🏆 WIN button. Selecting it prompts for confirmation, then records a WIN ONLY result without requiring scores.
- Toggle this setting while matches are active; it takes effect immediately without affecting the matches.
- Existing V24 data is preserved and defaults to OFF if this setting was absent.


## V26 Trial — OGX SOCIAL BALANCE
- Optional feature **only** for SOCIAL PLAY doubles (2 vs 2). It never changes LADDER matchmaking or Singles.
- Settings > PLAY MODES > OGX SOCIAL BALANCE (TRIAL): enable/disable without resetting live matches. New matches use the selected settings; existing matches retain their match configuration.
- Players can optionally choose a broad social experience preference (Open to all / New / Developing / Experienced). No public handicap labels.
- Balanced partner mode selects the same four waiting players as before (prioritizing fewer games and fixed-partner preferences), then minimizes estimated team experience imbalance. Random partner mode preserves prior pairing behavior. Experience is a self-selected preference, not a competitive rating.
- Optional friendly rules appear only on applicable new social doubles matches: controlled opening return or limited overhead attacks, after confirmation that all four players agree. Default is standard rules. These are house rules, not official tournament rules.
- Accessibility setting is an organizer reminder to discuss suitable accommodations, not an automatic handicap or medical classification.
- No score/rotation penalties for declining; match history notes any trial rule. No rating changes from trial outcomes.
- Full interactive browser and Firebase multi-device testing still required before production deployment.


## V27 — Live player replacement
During an active Singles or Doubles match, use **↔ Replace [player]** below the team name, choose a checked-in waiting player by number and confirm. This preserves court, score, match clock, pause state, timeouts, serving state and remaining players. Replacements are logged in match history. The outgoing player returns to the waiting pool; the incoming player leaves the queue and joins the live match. The outgoing player receives only elapsed participation time, not the eventual result. The replacement earns the result at match end. The operator may rest the outgoing player from Players if appropriate. Does not automatically start other matches.
