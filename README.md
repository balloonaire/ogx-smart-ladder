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
