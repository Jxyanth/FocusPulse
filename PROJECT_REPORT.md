# FocusPulse — Project Report

## Executive summary

FocusPulse is a client-side study-session timer and habit dashboard. It currently runs as a static single-page web app and stores completed sessions in browser `localStorage`. There is no backend, authentication, build system, or package manager. The dashboard is immediately demonstrable because a first visit seeds 21 sample focus sessions across 15 subjects, spanning today and the preceding six days.

## Current functionality

- Four fixed timer modes: Pomodoro (25 minutes), Deep Work (50 minutes), Short Break (5 minutes), and Long Break (15 minutes).
- Subject validation, optional topic notes, countdown display, pause/resume, reset, and automatic logging at completion.
- Local session records containing an ID, ISO timestamp, subject, topic notes, mode, duration, and an `isDemo` marker for seeded examples.
- Daily focus minutes and 120-minute goal progress, consecutive-day streak, sessions today, and a seven-day focus summary.
- Subject-level focus-time doughnut chart, recent session list, CSV export, sample-only removal, and all-data clearing.
- Responsive layout, empty states, semantic labels, accessible focus indicators, and reduced-motion styling.

Break sessions are saved and shown in history but are excluded from focus-minute, streak, weekly-focus, and subject-focus calculations. The daily session count includes all completed modes.

## Working architecture

```text
Browser
└── index.html
    ├── styles.css       Responsive presentation and layout
    ├── app.js           UI events, timer, sample data, calculations, CSV
    └── External CDNs    Tailwind CSS, Chart.js, Google Fonts
        └── localStorage (focuspulse.sessions.v1)
```

1. `index.html` provides all page regions, timer controls, form inputs, chart canvas, history, and action buttons.
2. `styles.css` provides the custom visual system and responsive breakpoints. Tailwind is currently loaded by CDN but the dashboard styling is primarily custom CSS.
3. `app.js` loads and validates saved records. If the storage key has never been created, it creates and saves a labeled example dataset. The persistent key distinguishes a fresh install from an intentionally cleared empty history.
4. The timer computes its end time from `Date.now()` and derives remaining time on each update, avoiding countdown drift from relying on interval ticks alone. It records a session only at completion.
5. Rendering derives metrics from the in-memory records. Chart.js is instantiated for the current subject totals and destroyed before a subsequent render.
6. CSV export creates a browser download; clearing and sample removal update local storage and re-render the dashboard.

## Current limitations and risks

- `localStorage` is browser- and origin-specific, synchronous, quota-limited, and not a backup. There is no cross-device sync, account, recovery, or protection against users editing stored values.
- Sample records deliberately affect visible metrics until removed. They are marked in the interface/history, but a clear sample-versus-real filter or sample-data toggle would make comparisons easier.
- The app does not persist an in-progress timer. Reloading or closing the tab loses the current timer state.
- A browser timer is not a reliable background alarm: browsers throttle or suspend inactive tabs, and there is no notification permission flow or audio alert. The timer catches up when it next runs, but completion may be noticed late.
- Timer durations and the daily goal are constants, not user-configurable. There are no settings, automatic break cycles, or keyboard shortcuts.
- The dependency CDNs require internet access and are not pinned or bundled for offline use. Tailwind's browser CDN emits a production-use warning and adds an external runtime dependency.
- Data validation is intentionally lightweight; malformed storage falls back to an empty in-memory list and logs an error, but does not offer a repair/recovery interface.
- There is no automated test suite, CI workflow, accessibility audit, or browser compatibility matrix yet.

## Realistic development roadmap

### Priority 1 — reliability and data integrity

1. Add unit tests for date boundaries, streaks, timer state transitions, sample seeding/removal, CSV escaping, and storage failures. Add browser-level smoke tests for the main happy paths.
2. Persist timer mode, remaining time, subject, notes, and running/paused state. On reload, define an explicit policy for whether a running timer continues based on its saved end timestamp.
3. Add import/restore from exported CSV or a versioned JSON backup; validate and preview imported records before replacing existing data.
4. Improve storage error UX and add a migration/versioning strategy before changing the session schema.

### Priority 2 — product usability

1. Add settings for focus/break durations, daily goal, and whether sample data is shown. Provide a clear way to distinguish or exclude samples in every metric.
2. Add session search/filtering and date-range analytics; show the subject percentages and make the chart useful with larger subject counts.
3. Add optional completion notification/audio with an explicit user permission/control. Document browser background-timer limitations rather than promising precise alarms.
4. Add a theme preference and small-screen usability/accessibility checks, including keyboard-only testing and screen-reader review of chart data.

### Priority 3 — release and maintainability

1. Remove the Tailwind browser CDN for production (the project currently relies on custom CSS) and pin or vendor Chart.js and fonts, with a documented offline/fallback strategy.
2. Add a lightweight test runner and CI checks for JavaScript syntax, tests, and static-site deployment. Keep the app framework-free unless product requirements justify introducing a build system.
3. Add a license, contribution guidance, issue templates, and a privacy/data-retention statement before inviting external contributions or users.
4. If sync is genuinely needed, design it as an optional backend feature with authentication, export/deletion controls, clear data ownership, and privacy/security review. A backend is not necessary for the current single-device use case.

## Run and validate

Run `py -m http.server 8000` from the project directory and open `http://localhost:8000`. The app requires internet access for its current CDN dependencies. A production deployment can serve the files as a static site; no server-side application is required.

