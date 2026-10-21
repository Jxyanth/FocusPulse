"use strict";

const STORAGE_KEY = "focuspulse.sessions.v1";
const DAILY_GOAL_MINUTES = 120;
const MODES = {
  pomodoro: { label: "Pomodoro", minutes: 25, shortLabel: "POMODORO", type: "focus" },
  deep: { label: "Deep work", minutes: 50, shortLabel: "DEEP WORK", type: "focus" },
  shortBreak: { label: "Short break", minutes: 5, shortLabel: "SHORT BREAK", type: "break" },
  longBreak: { label: "Long break", minutes: 15, shortLabel: "LONG BREAK", type: "break" }
};
const CHART_COLORS = ["#6f9f7b", "#8da8c2", "#d4a77a", "#a394c1", "#d17f71", "#8db8b1", "#c4b46e", "#9a9eab"];
const RING_CIRCUMFERENCE = 2 * Math.PI * 108;
const elements = {
  date: document.querySelector("#today-date"),
  todayMinutes: document.querySelector("#today-minutes"),
  streakDays: document.querySelector("#streak-days"),
  todaySessions: document.querySelector("#today-sessions"),
  timerDisplay: document.querySelector("#timer-display"),
  timerModeLabel: document.querySelector("#timer-mode-label"),
  timerState: document.querySelector("#timer-state"),
  ringFill: document.querySelector("#ring-fill"),
  subject: document.querySelector("#subject-input"),
  notes: document.querySelector("#notes-input"),
  startButton: document.querySelector("#start-button"),
  resetButton: document.querySelector("#reset-button"),
  progressMinutes: document.querySelector("#progress-minutes"),
  progressFill: document.querySelector("#progress-fill"),
  progressBar: document.querySelector("#daily-progress"),
  progressPercent: document.querySelector("#progress-percent"),
  insight: document.querySelector("#daily-insight"),
  weekChart: document.querySelector("#week-chart"),
  chartCanvas: document.querySelector("#subject-chart"),
  chartLegend: document.querySelector("#chart-legend"),
  totalFocus: document.querySelector("#total-focus"),
  emptyChart: document.querySelector("#empty-chart"),
  activityList: document.querySelector("#activity-list"),
  emptyActivity: document.querySelector("#empty-activity"),
  sessionCount: document.querySelector("#session-count"),
  exportButton: document.querySelector("#export-button"),
  clearButton: document.querySelector("#clear-button"),
  sampleNotice: document.querySelector("#sample-notice"),
  sampleSubjectCount: document.querySelector("#sample-subject-count"),
  removeSampleButton: document.querySelector("#remove-sample-button"),
  toast: document.querySelector("#toast")
};

let selectedMode = "pomodoro";
let chart = null;
let timerInterval = null;
let timerPaused = false;
let remainingMs = MODES[selectedMode].minutes * 60_000;
let endsAt = null;
let sessionSubject = "";
let sessionNotes = "";
let toastTimeout = null;
let showingDemoData = false;
let sessions = loadSessions();
if (showingDemoData) saveSessions();

function createDemoSessions() {
  const samples = [
    { subject: "Biology", notes: "Cellular respiration and ATP", age: 0, hour: 9, duration: 50 },
    { subject: "Calculus", notes: "Integration by parts", age: 0, hour: 11, duration: 25 },
    { subject: "World History", notes: "Trade routes of the Silk Road", age: 0, hour: 13, duration: 25 },
    { subject: "Spanish", notes: "Past tense conversation practice", age: 0, hour: 15, duration: 25 },
    { subject: "Physics", notes: "Newton's laws and free-body diagrams", age: 1, hour: 9, duration: 50 },
    { subject: "English Literature", notes: "Character analysis and close reading", age: 1, hour: 11, duration: 25 },
    { subject: "Chemistry", notes: "Balancing redox reactions", age: 1, hour: 14, duration: 25 },
    { subject: "Computer Science", notes: "Sorting algorithms and complexity", age: 2, hour: 10, duration: 50 },
    { subject: "Economics", notes: "Supply, demand, and elasticity", age: 2, hour: 13, duration: 25 },
    { subject: "Algebra", notes: "Systems of linear equations", age: 2, hour: 16, duration: 25 },
    { subject: "Design", notes: "Typography and visual hierarchy", age: 3, hour: 9, duration: 25 },
    { subject: "Psychology", notes: "Memory models and retrieval practice", age: 3, hour: 11, duration: 50 },
    { subject: "Statistics", notes: "Confidence intervals", age: 3, hour: 14, duration: 25 },
    { subject: "Geography", notes: "Climate zones and ocean currents", age: 4, hour: 10, duration: 25 },
    { subject: "Music Theory", notes: "Intervals and chord progressions", age: 4, hour: 13, duration: 25 },
    { subject: "Biology", notes: "Mitosis and meiosis review", age: 4, hour: 15, duration: 25 },
    { subject: "Calculus", notes: "Limits and continuity practice", age: 5, hour: 9, duration: 50 },
    { subject: "Physics", notes: "Conservation of energy problems", age: 5, hour: 12, duration: 25 },
    { subject: "Chemistry", notes: "Periodic trends and bonding", age: 6, hour: 10, duration: 25 },
    { subject: "Spanish", notes: "Vocabulary review and listening", age: 6, hour: 13, duration: 25 },
    { subject: "Computer Science", notes: "Data structures: maps and sets", age: 6, hour: 15, duration: 50 }
  ];
  return samples.map((sample, index) => {
    const date = new Date();
    const currentHour = date.getHours();
    date.setDate(date.getDate() - sample.age);
    date.setHours(
      sample.age === 0 ? Math.min(sample.hour, currentHour) : sample.hour,
      sample.age === 0 && sample.hour >= currentHour ? 0 : (index * 7) % 60,
      0,
      0
    );
    return {
      id: `demo-${index + 1}`,
      timestamp: date.toISOString(),
      subject: sample.subject,
      notes: sample.notes,
      mode: sample.duration === 50 ? "deep" : "pomodoro",
      duration: sample.duration,
      isDemo: true
    };
  });
}

function loadSessions() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === null) {
      showingDemoData = true;
      return createDemoSessions();
    }
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) throw new Error("Saved sessions are not a list.");
    return parsed.filter((session) =>
      session &&
      typeof session.id === "string" &&
      typeof session.subject === "string" &&
      typeof session.notes === "string" &&
      Object.prototype.hasOwnProperty.call(MODES, session.mode) &&
      Number.isFinite(session.duration) &&
      session.duration > 0 &&
      typeof session.timestamp === "string" &&
      !Number.isNaN(new Date(session.timestamp).getTime())
    );
  } catch (error) {
    console.error("Unable to read saved FocusPulse sessions.", error);
    showToast("Saved data could not be read. Check your browser storage.");
    return [];
  }
}

function saveSessions() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    return true;
  } catch (error) {
    console.error("Unable to save FocusPulse sessions.", error);
    showToast("Could not save this session. Check available browser storage.");
    return false;
  }
}

function localDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function focusSessions() {
  return sessions.filter((session) => MODES[session.mode].type === "focus");
}

function sessionDate(session) {
  return new Date(session.timestamp);
}

function formatDuration(minutes) {
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const remainder = minutes % 60;
    return remainder ? `${hours}h ${remainder}m` : `${hours}h`;
  }
  return `${minutes} min`;
}

function formatTime(date) {
  return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(date);
}

function renderTimer() {
  const totalMs = MODES[selectedMode].minutes * 60_000;
  const seconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const minutesPart = Math.floor(seconds / 60);
  const secondsPart = seconds % 60;
  elements.timerDisplay.textContent = `${String(minutesPart).padStart(2, "0")}:${String(secondsPart).padStart(2, "0")}`;
  elements.timerModeLabel.textContent = MODES[selectedMode].shortLabel;
  elements.ringFill.style.strokeDasharray = String(RING_CIRCUMFERENCE);
  elements.ringFill.style.strokeDashoffset = String(RING_CIRCUMFERENCE * (1 - remainingMs / totalMs));
}

function updateTimerState(state) {
  elements.timerState.textContent = ({
    ready: "Ready to begin",
    running: "Session in progress",
    paused: "Paused",
    complete: "Session complete!"
  })[state];
  elements.startButton.querySelector("span").textContent = state === "running"
    ? "Pause session"
    : state === "paused" ? "Resume session" : "Start focus";
  elements.startButton.querySelector("svg").innerHTML = state === "running"
    ? '<path d="M6 4.5h3v11H6zm5 0h3v11h-3z"/>'
    : '<path d="M6.5 4.7a1 1 0 0 1 1.52-.85l8.1 5.3a1 1 0 0 1 0 1.7l-8.1 5.3a1 1 0 0 1-1.52-.84V4.7Z"/>';
  document.querySelectorAll(".mode-tab").forEach((button) => {
    button.disabled = state === "running" || state === "paused";
  });
}

function setMode(mode) {
  if (!Object.prototype.hasOwnProperty.call(MODES, mode) || timerInterval) return;
  selectedMode = mode;
  remainingMs = MODES[mode].minutes * 60_000;
  document.querySelectorAll(".mode-tab").forEach((button) => {
    const isActive = button.dataset.mode === mode;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
  updateTimerState("ready");
  renderTimer();
}

function updateCountdown() {
  remainingMs = Math.max(0, endsAt - Date.now());
  renderTimer();
  if (remainingMs === 0) completeSession();
}

function startTimer() {
  if (timerPaused) {
    timerPaused = false;
    endsAt = Date.now() + remainingMs;
    updateTimerState("running");
    timerInterval = window.setInterval(updateCountdown, 200);
    updateCountdown();
    return;
  }

  const subject = elements.subject.value.trim();
  if (!subject) {
    elements.subject.setCustomValidity("Add a subject before starting your session.");
    elements.subject.reportValidity();
    elements.subject.addEventListener("input", () => elements.subject.setCustomValidity(""), { once: true });
    elements.subject.focus();
    return;
  }
  if (remainingMs <= 0) remainingMs = MODES[selectedMode].minutes * 60_000;
  sessionSubject = subject;
  sessionNotes = elements.notes.value.trim();
  endsAt = Date.now() + remainingMs;
  updateTimerState("running");
  timerInterval = window.setInterval(updateCountdown, 200);
  updateCountdown();
}

function pauseTimer() {
  if (!timerInterval) return;
  remainingMs = Math.max(0, endsAt - Date.now());
  window.clearInterval(timerInterval);
  timerInterval = null;
  timerPaused = true;
  updateTimerState("paused");
  renderTimer();
}

function completeSession() {
  if (timerInterval) window.clearInterval(timerInterval);
  timerInterval = null;
  timerPaused = false;
  remainingMs = 0;
  renderTimer();
  const session = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    subject: sessionSubject,
    notes: sessionNotes,
    mode: selectedMode,
    duration: MODES[selectedMode].minutes
  };
  sessions.unshift(session);
  const saved = saveSessions();
  updateTimerState("complete");
  renderDashboard();
  showToast(saved
    ? `${MODES[selectedMode].label} complete — nice work!`
    : `${MODES[selectedMode].label} complete, but browser storage could not save it.`);
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification("FocusPulse", { body: `${MODES[selectedMode].label} session complete. Nice work!` });
  }
}

function resetTimer() {
  if (timerInterval) window.clearInterval(timerInterval);
  timerInterval = null;
  timerPaused = false;
  remainingMs = MODES[selectedMode].minutes * 60_000;
  sessionSubject = "";
  sessionNotes = "";
  updateTimerState("ready");
  renderTimer();
}

function getTodayFocusSessions() {
  const today = localDateKey(new Date());
  return focusSessions().filter((session) => localDateKey(sessionDate(session)) === today);
}

function calculateStreak() {
  const dates = new Set(focusSessions().map((session) => localDateKey(sessionDate(session))));
  const cursor = new Date();
  if (!dates.has(localDateKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  if (!dates.has(localDateKey(cursor))) return 0;
  let streak = 0;
  while (dates.has(localDateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function renderMetrics() {
  const todaySessions = getTodayFocusSessions();
  const todayMinutes = todaySessions.reduce((sum, session) => sum + session.duration, 0);
  const today = localDateKey(new Date());
  const completedToday = sessions.filter((session) => localDateKey(sessionDate(session)) === today).length;
  elements.todayMinutes.textContent = String(todayMinutes);
  elements.streakDays.textContent = String(calculateStreak());
  elements.todaySessions.textContent = String(completedToday);
  elements.progressMinutes.textContent = String(todayMinutes);
  const percentage = Math.min(100, Math.round((todayMinutes / DAILY_GOAL_MINUTES) * 100));
  elements.progressFill.style.width = `${percentage}%`;
  elements.progressPercent.textContent = `${percentage}% complete`;
  elements.progressBar.setAttribute("aria-valuenow", String(Math.min(todayMinutes, DAILY_GOAL_MINUTES)));
  elements.insight.textContent = todayMinutes >= DAILY_GOAL_MINUTES
    ? "You reached your daily focus goal. Take a moment to celebrate your consistency."
    : todayMinutes > 0
      ? `${DAILY_GOAL_MINUTES - todayMinutes} more focused minutes to reach today's goal. You're making it count.`
      : "Every focused minute is a win. Start a session to build your rhythm.";
  elements.date.textContent = new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric" }).format(new Date());
}

function renderWeek() {
  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - 6);
  const totals = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    const key = localDateKey(day);
    const minutes = focusSessions()
      .filter((session) => localDateKey(sessionDate(session)) === key)
      .reduce((sum, session) => sum + session.duration, 0);
    return { day, key, minutes };
  });
  const maximum = Math.max(DAILY_GOAL_MINUTES, ...totals.map((entry) => entry.minutes));
  elements.weekChart.innerHTML = totals.map(({ day, key, minutes }) => {
    const isToday = key === localDateKey(today);
    const height = minutes ? Math.max(5, (minutes / maximum) * 100) : 0;
    return `<div class="week-day${isToday ? " today" : ""}" title="${escapeHtml(day.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" }))}: ${minutes} min">
      <div class="week-bar-track"><div class="week-bar" style="height:${height}%"></div></div>
      <span class="week-day-label">${new Intl.DateTimeFormat(undefined, { weekday: "narrow" }).format(day)}</span>
    </div>`;
  }).join("");
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
}

function renderChart() {
  const totals = new Map();
  focusSessions().forEach((session) => {
    totals.set(session.subject, (totals.get(session.subject) || 0) + session.duration);
  });
  const subjects = [...totals.entries()].sort((a, b) => b[1] - a[1]);
  const totalMinutes = subjects.reduce((sum, [, minutes]) => sum + minutes, 0);
  elements.totalFocus.textContent = String(totalMinutes);
  elements.chartLegend.innerHTML = subjects.map(([subject, minutes], index) => `
    <div class="legend-item" title="${escapeHtml(subject)}: ${minutes} min">
      <span class="legend-dot" style="background:${CHART_COLORS[index % CHART_COLORS.length]}"></span>
      <span class="legend-name">${escapeHtml(subject)}</span>
      <span class="legend-time">${formatDuration(minutes)} · ${totalMinutes ? Math.round(minutes / totalMinutes * 100) : 0}%</span>
    </div>`).join("");
  elements.emptyChart.classList.toggle("visible", totalMinutes === 0);
  if (chart) {
    chart.destroy();
    chart = null;
  }
  if (typeof Chart === "undefined") {
    console.error("Chart.js could not be loaded. Subject analytics are unavailable.");
    elements.emptyChart.textContent = "The chart could not load. Your saved sessions are still available below.";
    elements.emptyChart.classList.add("visible");
    return;
  }
  chart = new Chart(elements.chartCanvas, {
    type: "doughnut",
    data: {
      labels: subjects.map(([subject]) => subject),
      datasets: [{
        data: subjects.map(([, minutes]) => minutes),
        backgroundColor: subjects.map((_, index) => CHART_COLORS[index % CHART_COLORS.length]),
        borderWidth: 0,
        hoverOffset: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "76%",
      plugins: {
        legend: { display: false },
        tooltip: {
          enabled: totalMinutes > 0,
          callbacks: {
            label(context) {
              const minutes = Number(context.raw) || 0;
              const percentage = totalMinutes ? Math.round(minutes / totalMinutes * 100) : 0;
              return ` ${formatDuration(minutes)} (${percentage}%)`;
            }
          }
        }
      }
    }
  });
}

function renderActivity() {
  const count = sessions.length;
  elements.sessionCount.textContent = `${count} ${count === 1 ? "session" : "sessions"}`;
  elements.exportButton.disabled = count === 0;
  elements.clearButton.disabled = count === 0;
  elements.emptyActivity.classList.toggle("hidden", count > 0);
  const demoSessions = sessions.filter((session) => session.isDemo === true);
  const demoSubjects = new Set(demoSessions.map((session) => session.subject));
  elements.sampleNotice.hidden = demoSessions.length === 0;
  elements.sampleSubjectCount.textContent = String(demoSubjects.size);
  elements.activityList.innerHTML = sessions.slice(0, 6).map((session) => {
    const mode = MODES[session.mode];
    const date = sessionDate(session);
    const safeSubject = escapeHtml(session.subject);
    const note = session.notes ? ` · ${escapeHtml(session.notes)}` : "";
    const dateLabel = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(date);
    return `<article class="activity-item" title="${safeSubject}${note}">
      <span class="activity-badge${mode.type === "break" ? " break" : ""}" aria-hidden="true">${mode.type === "break" ? "☁" : "✦"}</span>
      <div class="activity-main">
        <div class="activity-subject">${safeSubject}${session.isDemo === true ? " · sample" : ""}</div>
        <div class="activity-meta">${mode.label}${note} · ${dateLabel}, ${formatTime(date)}</div>
      </div>
      <span class="activity-duration">${session.duration} min</span>
    </article>`;
  }).join("");
}

function renderDashboard() {
  renderMetrics();
  renderWeek();
  renderChart();
  renderActivity();
}

function showToast(message) {
  window.clearTimeout(toastTimeout);
  elements.toast.textContent = message;
  elements.toast.classList.add("visible");
  toastTimeout = window.setTimeout(() => elements.toast.classList.remove("visible"), 3500);
}

function csvCell(value) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

function exportCsv() {
  if (sessions.length === 0) {
    showToast("There are no sessions to export yet.");
    return;
  }
  const rows = [
    ["timestamp", "subject", "topic_notes", "mode", "duration_minutes"],
    ...[...sessions].reverse().map((session) => [
      session.timestamp, session.subject, session.notes, MODES[session.mode].label, session.duration
    ])
  ];
  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
  const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `focuspulse-sessions-${localDateKey(new Date())}.csv`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  renderDashboard();
  showToast("Your session history has been exported.");
}

function clearData() {
  if (sessions.length === 0) return;
  if (!window.confirm("Clear all saved FocusPulse sessions? This cannot be undone.")) return;
  sessions = [];
  try {
    localStorage.setItem(STORAGE_KEY, "[]");
  } catch (error) {
    console.error("Unable to clear FocusPulse sessions from browser storage.", error);
    showToast("Could not clear saved data. Check your browser storage.");
    sessions = loadSessions();
    renderDashboard();
    return;
  }
  renderDashboard();
  showToast("Your session history has been cleared.");
}

function removeSampleData() {
  const demoCount = sessions.filter((session) => session.isDemo === true).length;
  if (demoCount === 0) return;
  sessions = sessions.filter((session) => session.isDemo !== true);
  if (!saveSessions()) {
    sessions = loadSessions();
    renderDashboard();
    return;
  }
  showingDemoData = false;
  renderDashboard();
  showToast(`${demoCount} sample sessions removed. Your real sessions are unchanged.`);
}

document.querySelectorAll(".mode-tab").forEach((button) => {
  button.setAttribute("aria-pressed", String(button.dataset.mode === selectedMode));
  button.addEventListener("click", () => setMode(button.dataset.mode));
});
elements.startButton.addEventListener("click", () => {
  if (timerInterval) pauseTimer();
  else startTimer();
});
elements.resetButton.addEventListener("click", resetTimer);
elements.exportButton.addEventListener("click", exportCsv);
elements.clearButton.addEventListener("click", clearData);
elements.removeSampleButton.addEventListener("click", removeSampleData);

renderTimer();
renderDashboard();
updateTimerState("ready");
