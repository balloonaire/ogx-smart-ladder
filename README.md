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


## V16 changes (built from user-provided V15)
- Settings: TOP court champion-defense ON/OFF. Switching requires no live matches; disabled mode still has ranked courts, but no two-win champion-drop rule.
- Settings: rally scoring or traditional side-out 0-0-2. In side-out mode Team A starts serving as server 2, only the serving team can score with +1, and the scorekeeper presses Side out / Next server to advance server. Manual score correction remains available. This is not an automated official serving-position referee.
- Next Match Queue: removed only attendance tickboxes and its bulk-selection toolbar. Players and Attendance tabs retain bulk attendance selection. Rest and Edit buttons remain.
- Live courts: Team A has vivid blue framing and Team B orange framing, with contrasting text and score fields.
- Settings: Host / Editor + 3 or more Live Viewers via Firebase Realtime Database REST polling (~3 seconds). The cloud connection is optional; local use still works.

### Firebase setup (required for cross-device sharing)
1. Create a Firebase project and Realtime Database, and enable Anonymous sign-in under Authentication.
2. For a **temporary private test project only**, use database rules that allow signed-in clients to read/write the `ogxSessions` tree. Example:

```json
{ "rules": { "ogxSessions": { "$session": { ".read": "auth != null", ".write": "auth != null" } } } }
```

**Security limitation:** These demonstration rules do NOT enforce host-only editing on the server and are NOT safe for sensitive data or public production use. Any authenticated anonymous user who discovers a session code could read or overwrite that session. The viewer role is enforced by the app interface only. For production, add Firebase custom-claims/owner-based rules, verified membership, and stronger access control.
3. Copy the Firebase Web API key, HTTPS Realtime Database URL, and a long random session code into Settings on all devices. Use Generate session code on the host and copy it to viewers.
4. Connect the host first, then viewers. Only host changes are pushed by this client. The host can optionally load an existing remote ladder when reconnecting.
5. Avoid concurrent hosts. Do not share the session code publicly. Cloud registry syncing is NOT included; the regular-player registry stays browser-local. Export it as backup.
6. Network access is required for shared sessions; disconnected viewers show their last synced copy.

No Firebase credentials are included in the ZIP. The shared mode cannot work until Firebase is configured.
