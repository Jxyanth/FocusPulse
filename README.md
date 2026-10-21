# FocusPulse

FocusPulse is a lightweight, local-first study timer and habit analytics dashboard. It runs in a browser with no account, backend, package installation, or build step. Your session history is stored in that browser's `localStorage`.

## Run it

1. Download or clone this repository.
2. Open a terminal in the project folder.
3. Start a small static web server:

   ```powershell
   py -m http.server 8000
   ```

   If the Python launcher is unavailable, use `python -m http.server 8000`.
4. Open [http://localhost:8000](http://localhost:8000) in your browser.
5. To stop the server, press **Ctrl+C** in the terminal.

You can also open `index.html` directly, but the local server is recommended because browser storage behavior for `file://` pages varies. An internet connection is required to load the Tailwind, Chart.js, and Google Fonts CDN resources.

## What it does

- Offers Pomodoro (25 min), Deep Work (50 min), Short Break (5 min), and Long Break (15 min) timers with start, pause/resume, and reset controls.
- Requires a subject and optionally records topic notes when a timer starts.
- Automatically saves completed sessions with their timestamp, subject, notes, mode, and duration.
- Shows daily focus progress toward a 120-minute goal, a consecutive-day streak, a weekly activity chart, session history, and a subject-by-focus-time doughnut chart.
- Exports saved sessions as CSV and supports clearing all saved data or removing only the sample sessions.
- Seeds **21 clearly labeled sample sessions across 15 subjects** on the first visit to demonstrate the dashboard. Sample sessions count toward the displayed analytics until removed. Selecting **Remove sample data** leaves real sessions intact. **Clear data** removes all sessions and keeps the dashboard empty on later visits.

## Project files

| File | Purpose |
| --- | --- |
| `index.html` | Accessible page structure and CDN references |
| `styles.css` | Responsive layout and visual styling |
| `app.js` | Timer, sample data, local storage, analytics, history, and CSV export |
| `PROJECT_REPORT.md` | Current architecture, capabilities, limitations, and development roadmap |

## Data and privacy

Data remains in the browser profile that created it; there is no server or cross-device sync. Clearing browser storage, changing browsers/profiles, or using a different origin can make the data unavailable. Export a CSV if you need a separate copy. The app does not send session data to the CDN providers; the CDN requests load front-end libraries, fonts, and styles.

## Push to GitHub

The repository includes a `.gitignore` for common local files. Review the changes and confirm no private data is staged before publishing:

```powershell
git status
git add README.md PROJECT_REPORT.md .gitignore index.html styles.css app.js
git commit -m "Add FocusPulse study dashboard"
git push
```

If this checkout has no GitHub remote configured, add the repository URL first with `git remote add origin <repository-url>`, then push the branch with `git push -u origin <branch-name>`.

