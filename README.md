# OGX Smart Ladder — free browser prototype

A no-build HTML/CSS/JavaScript pickleball ladder manager. No server, dependencies or API keys needed.

## Start
Open `index.html` in a modern browser. Add 4+ players or choose **Load demo players**. The app automatically fills free courts when **Auto-fill empty courts** is enabled. Tap +1 / −1 to score, **Pause** to stop the match clock and disable scoring, and **Finish** to confirm the result and rotate players.

## Publish on GitHub Pages
1. Sign in to https://github.com and create a **public** repository named `ogx-smart-ladder` (do not add a README when creating it).
2. Choose **Add file → Upload files** and upload `index.html`, `style.css`, and `app.js` (optionally this README).
3. Commit changes.
4. Open repository **Settings → Pages**.
5. Under **Build and deployment**, choose **Deploy from a branch**. Choose branch `main` and folder `/(root)`, then **Save**.
6. After deployment, visit `https://YOUR-USERNAME.github.io/ogx-smart-ladder/`.

GitHub Pages hosts the front-end only. This prototype stores data in the current browser's localStorage, **not** on GitHub or in a shared database. Two devices will have separate data. Export backups frequently. Do not use this version for official tournament results or DUPR submissions.

## Fair rotation
The next four waiting players are chosen by fewest games played, then longest waiting. Team splits try to avoid recently repeated partnerships. Each court is automatically refilled after its match is completed or cancelled if enough players are waiting. This is a *social rotating doubles* scheduler, not a strict skill-based challenge ladder.

## Limitations
- Only one browser/device owns the live session. No multi-device synchronization or login.
- Timeout buttons record timeout counts, but do not automatically run a countdown or enforce official timeout limits.
- Score rules are simplified: no side-out scoring, server tracking, end changes, or full competition rules enforcement.
- No DUPR API connection.
- No protection against two tabs editing the same session concurrently.
- The app uses localStorage, so browser storage clearing or private browsing can delete the session.
- GitHub Pages availability and acceptable-use restrictions apply; for commercial events, use suitable hosting.

## Next upgrade
Add a hosted database (e.g., Supabase), authentication, server-validated match results, live synchronized scoreboards, timed timeout rules, and robust queue locking.

## Version 2: Court ladder and next queue
- Physical court labels can be manually entered in ranked order (highest court first).
- Winning doubles pairs move one court up; losing pairs move one court down. At boundaries they stay assigned to the boundary court.
- The highest-court winning pair may defend for at most two consecutive matches. After two, they enter the queue and must sit out at least the next top-court match.
- The Next Match Queue shows waiting pairs, target courts, and top-court rotation status.
- This is a local-browser prototype, not a synchronized multi-device server.
- Back up data before replacing files. Existing v1 local storage is imported on first use of v2.

## Manual score entry (V3)
On each live court, type the exact score for Team A or Team B in its **Score** field, then press Enter or tap outside the field. Scores must be whole numbers from 0 to 999. The +1/−1 buttons remain available. Changes are saved to the local session and are used when **Finish** confirms a match.


## V4 additions
- **Three courts** is now a supported session size (1, 2, 3, 4, 6 or 8). Court order remains highest to lowest and physical labels can be customized.
- Player registration includes an optional **gender** field (Female, Male, Non-binary, Prefer not to say).
- Gender appears in the player table and alongside player names in court matchups, the next-match queue and completed match history when disclosed.
- Existing saved players and imported backups without gender remain supported and display **Not specified** in the player table.
- Gender does not affect scheduling or team formation.

## V5: Editable court hierarchy

Use the up/down arrows in Session settings to rearrange the physical court numbers. The first entry is always TOP, regardless of its numeric value (for example 8, 3, 12). The ranking order is saved in this browser. Court numbers must be unique nonnegative integers; finish or cancel any live matches before reordering. The existing promotion, relegation, top-court two-round limit, three-court option, gender labels and manual scoring remain available.
