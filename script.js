// State & persistence ----------------------------------
const STORAGE_KEY_TASKS = "questLog_tasks";
const STORAGE_KEY_XP = "questLog_xp";
const STORAGE_KEY_LEVEL = "questLog_level";
const STORAGE_KEY_HISTORY = "questDay_completionHistory";
const STORAGE_KEY_RECURRENCE_RULES = "questDay_recurrenceRules";

let recurrenceRules = loadRecurrenceRules();

let level = loadLevel();
function xpForLevel(lvl) {
  return 100 + (lvl - 1) * 20;
}
let MAX_XP = xpForLevel(level);

let tasks = loadTasks();
let xp = loadXP(); // current xp within current level
let completionHistory = loadCompletionHistory();
let currentFilter = "today"; // "today" | "upcoming" | "overdue" | "all" | "history"

// Elements -------------------------------------------
const form = document.getElementById("questForm");
const questInput = document.getElementById("questInput");
const plannedInput = document.getElementById("plannedInput");
const dueInput = document.getElementById("dueInput");
const clearDatesBtn = document.getElementById("clearDatesBtn");
const repeatSelect = document.getElementById("repeatSelect");
const listEl = document.getElementById("questList");
const xpFill = document.getElementById("xpFill");
const xpValue = document.getElementById("xpValue");
const xpRemaining = document.getElementById("xpRemaining");

const currentStreakEl = document.getElementById("currentStreak");
const bestStreakEl = document.getElementById("bestStreak");
const todayCompletedCountEl = document.getElementById("todayCompletedCount");

const template = document.getElementById("questItemTemplate");
const binding = document.querySelector(".binding");
const filterTabs = document.querySelector(".filter-tabs");

const badgeToday = document.getElementById("badgeToday");
const badgeUpcoming = document.getElementById("badgeUpcoming");
const badgeOverdue = document.getElementById("badgeOverdue");
const badgeAll = document.getElementById("badgeAll");
const badgeHistory = document.getElementById("badgeHistory");

// Retro SVG Icon Helpers
function createIconSvg(iconId, className = "") {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", `retro-icon ${className}`.trim());
  svg.setAttribute("aria-hidden", "true");
  const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
  use.setAttribute("href", `#${iconId}`);
  use.setAttributeNS("http://www.w3.org/1999/xlink", "xlink:href", `#${iconId}`);
  svg.appendChild(use);
  return svg;
}

function createMetaBadge(className, iconId, text, title = "") {
  const span = document.createElement("span");
  span.className = `meta-tag ${className}`;
  if (title) span.title = title;
  if (iconId) {
    span.appendChild(createIconSvg(iconId, "badge-icon"));
    span.appendChild(document.createTextNode(" " + text));
  } else {
    span.textContent = text;
  }
  return span;
}

// Recurrence Rules Storage --------------------------
function loadRecurrenceRules() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_RECURRENCE_RULES);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((r) => r && typeof r === "object" && r.id && r.frequency);
  } catch {
    return [];
  }
}

function saveRecurrenceRules() {
  try {
    localStorage.setItem(STORAGE_KEY_RECURRENCE_RULES, JSON.stringify(recurrenceRules));
  } catch (e) {
    console.error("Failed to save recurrence rules:", e);
  }
}

// Date utilities (Local timezone semantics) ----------
function getDayOfWeek(dateStr) {
  if (!isValidDateString(dateStr)) return -1;
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).getDay();
}

function addDaysToDateString(dateStr, days) {
  if (!isValidDateString(dateStr) || typeof days !== "number") return null;
  const [y, m, d] = dateStr.split("-").map(Number);
  const target = new Date(y, m - 1, d);
  target.setDate(target.getDate() + days);
  return getLocalDateString(target);
}

function calcDateDiffDays(dateStr1, dateStr2) {
  if (!isValidDateString(dateStr1) || !isValidDateString(dateStr2)) return null;
  const [y1, m1, d1] = dateStr1.split("-").map(Number);
  const [y2, m2, d2] = dateStr2.split("-").map(Number);
  const dt1 = new Date(y1, m1 - 1, d1);
  const dt2 = new Date(y2, m2 - 1, d2);
  const diffMs = dt2.getTime() - dt1.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

// Lazy Recurrence Occurrence Generator --------------
function processRecurrenceRules(todayStr) {
  if (!Array.isArray(recurrenceRules) || recurrenceRules.length === 0) return false;
  let changed = false;

  for (const rule of recurrenceRules) {
    // 1. Inactive check
    if (!rule.active) continue;

    // 2. Start date check
    if (rule.startDate && todayStr < rule.startDate) continue;

    // 3. Frequency day check
    if (rule.frequency === "weekly") {
      const ruleDay = getDayOfWeek(rule.startDate);
      const currentDay = getDayOfWeek(todayStr);
      if (ruleDay !== currentDay) continue;
    } else if (rule.frequency !== "daily") {
      continue;
    }

    // 4. Duplicate checks
    // a) Check if already generated for today
    if (rule.lastGeneratedDate === todayStr) continue;

    // b) Check if an occurrence exists with plannedDate === todayStr or occurrenceDate === todayStr
    const existsForToday = tasks.some(
      (t) => t.ruleId === rule.id && (t.plannedDate === todayStr || t.occurrenceDate === todayStr)
    );
    if (existsForToday) {
      rule.lastGeneratedDate = todayStr;
      continue;
    }

    // c) Max 1 pending occurrence per rule: keep existing incomplete occurrence as carry-over!
    const hasPending = tasks.some((t) => t.ruleId === rule.id && !t.completed);
    if (hasPending) continue;

    // d) Has an occurrence for this rule already been completed today?
    const completedTodayInTasks = tasks.some(
      (t) => t.ruleId === rule.id && t.completed && t.completedAt && t.completedAt.startsWith(todayStr)
    );
    const completedTodayInHistory = completionHistory.some(
      (h) => h.ruleId === rule.id && h.completedAt && h.completedAt.startsWith(todayStr)
    );
    if (completedTodayInTasks || completedTodayInHistory) continue;

    // 5. Generate new occurrence
    const newDueDate =
      rule.dueDateOffsetDays !== null && rule.dueDateOffsetDays !== undefined
        ? addDaysToDateString(todayStr, rule.dueDateOffsetDays)
        : null;

    const newOccurrence = {
      id: uid(),
      text: rule.text,
      completed: false,
      completedAt: null,
      favorite: false,
      xpCompleted: false,
      plannedDate: todayStr,
      dueDate: newDueDate,
      ruleId: rule.id,
      occurrenceDate: todayStr,
    };

    tasks.push(newOccurrence);
    rule.lastGeneratedDate = todayStr;
    changed = true;
    // NOTE: addXP(5) is NOT called for automatic recurrence generation!
  }

  if (changed) {
    saveTasks();
    saveRecurrenceRules();
  }
  return changed;
}
function getLocalDateString(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getTodayString() {
  return getLocalDateString(new Date());
}

function getPreviousDateString(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const prev = new Date(y, m - 1, d);
  prev.setDate(prev.getDate() - 1);
  return getLocalDateString(prev);
}

function getNextDateString(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const next = new Date(y, m - 1, d);
  next.setDate(next.getDate() + 1);
  return getLocalDateString(next);
}

function isValidDateString(str) {
  return typeof str === "string" && /^\d{4}-\d{2}-\d{2}$/.test(str);
}

function formatDateLabel(dateStr) {
  if (!isValidDateString(dateStr)) return "";
  const today = getTodayString();
  if (dateStr === today) return "Today";

  const tomorrowD = new Date();
  tomorrowD.setDate(tomorrowD.getDate() + 1);
  if (dateStr === getLocalDateString(tomorrowD)) return "Tomorrow";

  const yesterdayD = new Date();
  yesterdayD.setDate(yesterdayD.getDate() - 1);
  if (dateStr === getLocalDateString(yesterdayD)) return "Yesterday";

  const [y, m, d] = dateStr.split("-").map(Number);
  const dateObj = new Date(y, m - 1, d);
  return dateObj.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatTimeOnly(isoStr) {
  if (!isoStr) return "";
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return "";
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  } catch {
    return "";
  }
}

// Persistence Utility --------------------------------
function saveTasks() {
  localStorage.setItem(STORAGE_KEY_TASKS, JSON.stringify(tasks));
}
function saveXP() {
  localStorage.setItem(STORAGE_KEY_XP, xp);
}
function saveLevel() {
  localStorage.setItem(STORAGE_KEY_LEVEL, level);
}
function saveCompletionHistory() {
  localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(completionHistory));
}

function loadTasks() {
  try {
    const loaded = JSON.parse(localStorage.getItem(STORAGE_KEY_TASKS)) || [];
    return loaded.map((t) => ({
      ...t,
      plannedDate: t.plannedDate !== undefined ? t.plannedDate : null,
      dueDate: t.dueDate !== undefined ? t.dueDate : null,
      completedAt: t.completedAt !== undefined ? t.completedAt : null,
    }));
  } catch {
    return [];
  }
}

function loadCompletionHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_HISTORY);
    if (!raw) return [];
    const loaded = JSON.parse(raw);
    return Array.isArray(loaded) ? loaded : [];
  } catch {
    return [];
  }
}

function loadXP() {
  const v = parseInt(localStorage.getItem(STORAGE_KEY_XP), 10);
  return isNaN(v) || v < 0 ? 0 : v;
}
function loadLevel() {
  const v = parseInt(localStorage.getItem(STORAGE_KEY_LEVEL), 10);
  return isNaN(v) || v < 1 ? 1 : v;
}
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function sortTasks() {
  tasks.sort((a, b) => {
    // favorites first
    if (a.favorite !== b.favorite) return b.favorite - a.favorite;
    // incomplete before complete
    if (a.completed !== b.completed) return a.completed - b.completed;
    // newest first
    return b.createdAt - a.createdAt;
  });
}

// Daily Task Classification & Filter Logic -----------
function isCarryOver(task, today) {
  return !task.completed && Boolean(task.plannedDate) && task.plannedDate < today;
}

function isOverdue(task, today) {
  return !task.completed && Boolean(task.dueDate) && task.dueDate < today;
}

function matchesToday(task, today) {
  // 1. Planned for today (including completed tasks planned today)
  if (task.plannedDate === today) return true;
  // 2. Carry-over: incomplete and planned before today
  if (isCarryOver(task, today)) return true;
  // 3. Unscheduled but deadline is today or overdue
  if (!task.completed && !task.plannedDate && task.dueDate && task.dueDate <= today) return true;
  return false;
}

function matchesUpcoming(task, today) {
  if (task.completed) return false;
  if (task.plannedDate && task.plannedDate > today) return true;
  if (!task.plannedDate && task.dueDate && task.dueDate > today) return true;
  return false;
}

function matchesOverdue(task, today) {
  return isOverdue(task, today);
}

function matchesFilter(task, filter, today) {
  if (filter === "today") return matchesToday(task, today);
  if (filter === "upcoming") return matchesUpcoming(task, today);
  if (filter === "overdue") return matchesOverdue(task, today);
  return true; // "all"
}

// Daily Streak Algorithm -----------------------------
function calculateStreakStats(history, today = getTodayString()) {
  const validDatesSet = new Set();
  let todayDoneCount = 0;

  for (const entry of history) {
    if (entry.status === "completed" && isValidDateString(entry.completedDate)) {
      validDatesSet.add(entry.completedDate);
      if (entry.completedDate === today) {
        todayDoneCount++;
      }
    }
  }

  const yesterday = getPreviousDateString(today);
  let currentStreak = 0;

  if (validDatesSet.has(today)) {
    currentStreak = 1;
    let checkDate = yesterday;
    while (validDatesSet.has(checkDate)) {
      currentStreak++;
      checkDate = getPreviousDateString(checkDate);
    }
  } else if (validDatesSet.has(yesterday)) {
    currentStreak = 1;
    let checkDate = getPreviousDateString(yesterday);
    while (validDatesSet.has(checkDate)) {
      currentStreak++;
      checkDate = getPreviousDateString(checkDate);
    }
  } else {
    currentStreak = 0;
  }

  // Best Streak calculation
  const sortedDates = Array.from(validDatesSet).sort();
  let bestStreak = 0;
  if (sortedDates.length > 0) {
    bestStreak = 1;
    let currentRun = 1;
    for (let i = 1; i < sortedDates.length; i++) {
      const expectedNext = getNextDateString(sortedDates[i - 1]);
      if (sortedDates[i] === expectedNext) {
        currentRun++;
        if (currentRun > bestStreak) bestStreak = currentRun;
      } else {
        currentRun = 1;
      }
    }
  }
  bestStreak = Math.max(bestStreak, currentStreak);

  return { currentStreak, bestStreak, todayDoneCount };
}

function updateStreakUI(today = getTodayString()) {
  const stats = calculateStreakStats(completionHistory, today);
  if (currentStreakEl) {
    currentStreakEl.textContent = `${stats.currentStreak} day${stats.currentStreak === 1 ? "" : "s"}`;
  }
  if (bestStreakEl) {
    bestStreakEl.textContent = `${stats.bestStreak} day${stats.bestStreak === 1 ? "" : "s"}`;
  }
  if (todayCompletedCountEl) {
    todayCompletedCountEl.textContent = `${stats.todayDoneCount} done`;
  }
}

function getFilterCounts(today) {
  let todayCount = 0;
  let upcomingCount = 0;
  let overdueCount = 0;
  let allCount = tasks.length;

  for (const t of tasks) {
    if (matchesToday(t, today)) todayCount++;
    if (matchesUpcoming(t, today)) upcomingCount++;
    if (matchesOverdue(t, today)) overdueCount++;
  }

  const validHistoryCount = completionHistory.filter((h) => h.status === "completed").length;

  return {
    today: todayCount,
    upcoming: upcomingCount,
    overdue: overdueCount,
    all: allCount,
    history: validHistoryCount,
  };
}

const EMPTY_MESSAGES = {
  today: "No quests planned for today. Enjoy your day or write a new quest!",
  upcoming: "No upcoming quests. Plan ahead by scheduling a future date!",
  overdue: "No overdue quests. You are all caught up!",
  all: "No quests in your journal yet. Write an adventure above!",
  history: "No completed quests recorded yet. Complete a quest to start your journey!",
};

function updateFilterBadges(today) {
  const counts = getFilterCounts(today);
  if (badgeToday) badgeToday.textContent = counts.today;
  if (badgeUpcoming) badgeUpcoming.textContent = counts.upcoming;
  if (badgeOverdue) {
    badgeOverdue.textContent = counts.overdue;
    if (counts.overdue > 0) {
      badgeOverdue.classList.add("has-overdue");
    } else {
      badgeOverdue.classList.remove("has-overdue");
    }
  }
  if (badgeAll) badgeAll.textContent = counts.all;
  if (badgeHistory) badgeHistory.textContent = counts.history;
}

// XP system ------------------------------------------
function addXP(amount) {
  xp += amount;
  let leveled = false;
  while (xp >= MAX_XP) {
    xp -= MAX_XP;
    level++;
    MAX_XP = xpForLevel(level);
    leveled = true;
  }
  saveXP();
  saveLevel();
  updateXPUI();
  if (leveled) showLevelUp();
}

function updateXPUI() {
  const pct = Math.min(100, (xp / MAX_XP) * 100);
  xpFill.style.width = pct + "%";
  xpValue.textContent = `Lv ${level} • ${xp}/${MAX_XP} XP`;
  if (xpRemaining) {
    const needed = Math.max(0, MAX_XP - xp);
    xpRemaining.textContent = `${needed} XP to Level ${level + 1}`;
  }
}

// Render ---------------------------------------------
function render() {
  const today = getTodayString();
  updateFilterBadges(today);
  updateStreakUI(today);
  listEl.innerHTML = "";

  if (currentFilter === "history") {
    renderHistoryView(today);
  } else {
    renderTasksView(today);
  }

  updateBindingHoles();
}

function renderTasksView(today) {
  sortTasks();
  const visibleTasks = tasks.filter((t) => matchesFilter(t, currentFilter, today));

  if (visibleTasks.length === 0) {
    const emptyLi = document.createElement("li");
    emptyLi.className = "empty-state";
    emptyLi.innerHTML = `<p class="empty-message">${EMPTY_MESSAGES[currentFilter] || EMPTY_MESSAGES.all}</p>`;
    listEl.appendChild(emptyLi);
  } else {
    visibleTasks.forEach((t) => listEl.appendChild(renderItem(t, today)));
  }
}

function renderHistoryView(today) {
  const validEvents = completionHistory.filter((e) => e.status === "completed");

  // Include any legacy completed tasks not yet recorded in history
  const legacyCompletedWithoutHistory = tasks.filter(
    (t) => t.completed && !completionHistory.some((h) => h.taskId === t.id)
  );

  if (validEvents.length === 0 && legacyCompletedWithoutHistory.length === 0) {
    const emptyLi = document.createElement("li");
    emptyLi.className = "empty-state";
    emptyLi.innerHTML = `<p class="empty-message">${EMPTY_MESSAGES.history}</p>`;
    listEl.appendChild(emptyLi);
    return;
  }

  // Group events by completedDate
  const groups = new Map();
  for (const entry of validEvents) {
    const dateKey = entry.completedDate || "unknown";
    if (!groups.has(dateKey)) groups.set(dateKey, []);
    groups.get(dateKey).push(entry);
  }

  if (legacyCompletedWithoutHistory.length > 0) {
    if (!groups.has("unknown")) groups.set("unknown", []);
    for (const lt of legacyCompletedWithoutHistory) {
      groups.get("unknown").push({
        id: lt.id,
        taskId: lt.id,
        text: lt.text,
        completedAt: null,
        completedDate: null,
        plannedDate: lt.plannedDate || null,
        dueDate: lt.dueDate || null,
        status: "completed",
        isLegacy: true,
      });
    }
  }

  // Sort group dates descending (newest first, 'unknown' at bottom)
  const sortedDateKeys = Array.from(groups.keys()).sort((a, b) => {
    if (a === "unknown") return 1;
    if (b === "unknown") return -1;
    return b.localeCompare(a);
  });

  for (const dKey of sortedDateKeys) {
    const entriesInGroup = groups.get(dKey);
    // Sort entries in group: newest completion first
    entriesInGroup.sort((a, b) => {
      if (!a.completedAt) return 1;
      if (!b.completedAt) return -1;
      return b.completedAt.localeCompare(a.completedAt);
    });

    const groupLi = document.createElement("li");
    groupLi.className = "history-group";

    const dateHeader = document.createElement("div");
    dateHeader.className = "history-date-header";

    const titleSpan = document.createElement("span");
    titleSpan.className = "history-date-title";
    if (dKey !== "unknown") {
      titleSpan.appendChild(createIconSvg("icon-calendar", "badge-icon"));
      titleSpan.appendChild(document.createTextNode(` ${formatDateLabel(dKey)} — ${dKey}`));
    } else {
      titleSpan.textContent = "Completed — Date Unknown";
    }

    const countSpan = document.createElement("span");
    countSpan.className = "history-badge-count";
    countSpan.textContent = `${entriesInGroup.length} completed`;

    dateHeader.appendChild(titleSpan);
    dateHeader.appendChild(countSpan);
    groupLi.appendChild(dateHeader);

    for (const entry of entriesInGroup) {
      const itemEl = document.createElement("div");
      itemEl.className = "history-item";

      const checkIconDiv = document.createElement("div");
      checkIconDiv.className = "history-check-icon";
      checkIconDiv.setAttribute("aria-hidden", "true");
      checkIconDiv.appendChild(createIconSvg("icon-check", "history-check-svg"));

      const textBlock = document.createElement("div");
      textBlock.className = "history-text-block";

      const textP = document.createElement("p");
      textP.className = "history-text";
      textP.textContent = entry.text;

      const metaDiv = document.createElement("div");
      metaDiv.className = "history-meta";

      const timeStr = formatTimeOnly(entry.completedAt);
      if (timeStr) {
        metaDiv.appendChild(createMetaBadge("meta-completed-time", "icon-clock", timeStr));
      }
      if (entry.ruleId) {
        const rule = recurrenceRules.find((r) => r.id === entry.ruleId);
        const freqLabel = rule ? (rule.frequency === "daily" ? "Daily" : "Weekly") : "Recurring";
        metaDiv.appendChild(createMetaBadge("badge-recurrence", "icon-repeat", freqLabel));
      }
      if (entry.plannedDate) {
        metaDiv.appendChild(createMetaBadge("meta-planned", "icon-calendar", `Plan: ${formatDateLabel(entry.plannedDate)}`));
      }
      if (entry.dueDate) {
        metaDiv.appendChild(createMetaBadge("meta-due", "icon-clock", `Due: ${formatDateLabel(entry.dueDate)}`));
      }
      if (entry.deletedAt) {
        metaDiv.appendChild(createMetaBadge("badge-deleted", "icon-archive", "Archived"));
      }
      if (entry.isLegacy) {
        metaDiv.appendChild(createMetaBadge("meta-unscheduled", null, "Legacy Record"));
      }

      textBlock.appendChild(textP);
      textBlock.appendChild(metaDiv);

      itemEl.appendChild(checkIconDiv);
      itemEl.appendChild(textBlock);
      groupLi.appendChild(itemEl);
    }

    listEl.appendChild(groupLi);
  }
}

function renderItem(task, today) {
  const node = template.content.firstElementChild.cloneNode(true);
  node.dataset.id = task.id;
  if (task.completed) node.classList.add("completed");
  if (task.favorite) node.classList.add("important");

  const cb = node.querySelector(".checkbox");
  if (task.completed) cb.classList.add("checked");

  const textP = node.querySelector(".quest-text");
  textP.textContent = task.text;

  // Build meta badges (Carry-over, Overdue, Planned, Due)
  const metaContainer = node.querySelector(".quest-meta");
  metaContainer.innerHTML = "";

  const carryOver = isCarryOver(task, today);
  const overdue = isOverdue(task, today);

  if (carryOver) {
    metaContainer.appendChild(
      createMetaBadge("badge-carryover", null, "Carry-over", `Rollover from ${formatDateLabel(task.plannedDate)}`)
    );
  }

  if (overdue) {
    metaContainer.appendChild(
      createMetaBadge("badge-overdue", null, "Overdue", `Deadline passed on ${formatDateLabel(task.dueDate)}`)
    );
  }

  if (task.plannedDate) {
    metaContainer.appendChild(
      createMetaBadge("meta-planned", "icon-calendar", `Plan: ${formatDateLabel(task.plannedDate)}`)
    );
  }

  if (task.dueDate) {
    metaContainer.appendChild(
      createMetaBadge("meta-due", "icon-clock", `Due: ${formatDateLabel(task.dueDate)}`)
    );
  }

  if (!task.plannedDate && !task.dueDate) {
    metaContainer.appendChild(
      createMetaBadge("meta-unscheduled", null, "Unscheduled")
    );
  }

  if (task.ruleId) {
    const rule = recurrenceRules.find((r) => r.id === task.ruleId);
    if (rule) {
      const freqLabel = rule.frequency === "daily" ? "Daily" : "Weekly";
      const badgeText = rule.active ? freqLabel : `${freqLabel} (Stopped)`;
      const badgeClass = rule.active ? "badge-recurrence" : "badge-recurrence stopped";
      metaContainer.appendChild(
        createMetaBadge(badgeClass, "icon-repeat", badgeText, rule.active ? `Recurring ${freqLabel}` : "Recurrence stopped")
      );
    }
  }

  const stopRepeatBtn = node.querySelector(".stop-repeat-btn");
  if (stopRepeatBtn) {
    if (task.ruleId) {
      const rule = recurrenceRules.find((r) => r.id === task.ruleId);
      if (rule && rule.active) {
        stopRepeatBtn.style.display = "inline-flex";
      } else {
        stopRepeatBtn.style.display = "none";
      }
    } else {
      stopRepeatBtn.style.display = "none";
    }
  }

  const starBtn = node.querySelector(".star-btn");
  if (task.favorite) starBtn.classList.add("active");
  starBtn.dataset.favorite = task.favorite;

  return node;
}

// Add Task ------------------------------------------
form.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = questInput.value.trim();
  if (!text) return;

  const today = getTodayString();
  const planned = plannedInput && plannedInput.value ? plannedInput.value : null;
  const due = dueInput && dueInput.value ? dueInput.value : null;

  const repeatFreq = repeatSelect ? repeatSelect.value : "none";
  let ruleId = null;

  if (repeatFreq === "daily" || repeatFreq === "weekly") {
    ruleId = "rule_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);
    const startDate = planned || today;
    const offsetDays = planned && due ? calcDateDiffDays(planned, due) : null;
    const rule = {
      id: ruleId,
      text: text,
      frequency: repeatFreq,
      startDate: startDate,
      dueDateOffsetDays: offsetDays,
      active: true,
      createdAt: new Date().toISOString(),
      lastGeneratedDate: startDate,
    };
    recurrenceRules.push(rule);
    saveRecurrenceRules();
  }

  const task = {
    id: uid(),
    text,
    plannedDate: planned,
    dueDate: due,
    completed: false,
    completedAt: null,
    favorite: false,
    xpCompleted: false,
    createdAt: Date.now(),
    ruleId: ruleId,
    occurrenceDate: planned || today,
  };

  tasks.push(task);
  saveTasks();
  addXP(5);

  // Form cleanup
  questInput.value = "";
  if (dueInput) dueInput.value = "";
  if (plannedInput) plannedInput.value = today;
  if (repeatSelect) repeatSelect.value = "none";

  // Auto-switch filter view if newly created quest wouldn't be visible in current filter
  if (currentFilter === "history" || !matchesFilter(task, currentFilter, today)) {
    if (matchesToday(task, today)) {
      currentFilter = "today";
    } else if (matchesUpcoming(task, today)) {
      currentFilter = "upcoming";
    } else {
      currentFilter = "all";
    }
    updateActiveTabUI();
  }

  render();
});

if (clearDatesBtn) {
  clearDatesBtn.addEventListener("click", () => {
    if (plannedInput) plannedInput.value = "";
    if (dueInput) dueInput.value = "";
    if (repeatSelect) repeatSelect.value = "none";
  });
}

function updateActiveTabUI() {
  if (!filterTabs) return;
  filterTabs.querySelectorAll(".tab-btn").forEach((btn) => {
    if (btn.dataset.filter === currentFilter) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });
}

// Filter tabs interaction ----------------------------
if (filterTabs) {
  filterTabs.addEventListener("click", (e) => {
    const btn = e.target.closest(".tab-btn");
    if (!btn) return;
    const filter = btn.dataset.filter;
    if (filter && filter !== currentFilter) {
      currentFilter = filter;
      updateActiveTabUI();
      render();
    }
  });
}

// List interactions (delegation) ---------------------
listEl.addEventListener("click", (e) => {
  // Safety guard: History view is strictly read-only
  if (currentFilter === "history") return;

  const li = e.target.closest(".quest-item");
  if (!li) return;
  const id = li.dataset.id;
  const task = tasks.find((t) => t.id === id);
  if (!task) return;

  // 1. Complete / Uncomplete toggle
  if (e.target.closest(".checkbox")) {
    const nowIso = new Date().toISOString();
    const todayStr = getTodayString();

    if (!task.completed) {
      // Transition: Incomplete -> Completed
      task.completed = true;
      task.completedAt = nowIso;

      // Create completion history entry
      const historyEntry = {
        id: uid(),
        taskId: task.id,
        ruleId: task.ruleId || null,
        text: task.text,
        completedAt: nowIso,
        completedDate: todayStr,
        plannedDate: task.plannedDate || null,
        dueDate: task.dueDate || null,
        status: "completed",
        undoneAt: null,
        deletedAt: null,
      };
      completionHistory.push(historyEntry);
      saveCompletionHistory();

      // XP reward: only granted on first time completion
      if (!task.xpCompleted) {
        task.xpCompleted = true;
        addXP(10);
        li.classList.add("flash-on");
        spawnFloatingStar(li);
        setTimeout(() => li.classList.remove("flash-on"), 900);
      }
    } else {
      // Transition: Completed -> Uncomplete (Undo)
      // Safety guard: prevent undoing older occurrence if newer occurrence exists
      if (task.ruleId) {
        const newerExists = tasks.some(
          (t) =>
            t.ruleId === task.ruleId &&
            t.id !== task.id &&
            ((t.occurrenceDate || "") > (task.occurrenceDate || "") ||
              (t.plannedDate || "") > (task.plannedDate || ""))
        );
        if (newerExists) {
          alert("Cannot undo a completed quest when a newer recurring occurrence already exists.");
          return;
        }
      }

      task.completed = false;
      task.completedAt = null;

      // Mark the active completion entry as undone
      const activeEntry = completionHistory
        .slice()
        .reverse()
        .find((entry) => entry.taskId === task.id && entry.status === "completed");

      if (activeEntry) {
        activeEntry.status = "undone";
        activeEntry.undoneAt = nowIso;
        saveCompletionHistory();
      }
      // XP is NOT revoked; xpCompleted remains true
    }

    saveTasks();
    render();
    return;
  }

  // Stop Repeating toggle
  if (e.target.closest(".stop-repeat-btn")) {
    const rule = recurrenceRules.find((r) => r.id === task.ruleId);
    if (rule) {
      rule.active = false;
      saveRecurrenceRules();
      render();
    }
    return;
  }

  // 2. Favorite toggle
  if (e.target.closest(".star-btn")) {
    task.favorite = !task.favorite;
    saveTasks();
    render();
    return;
  }

  // 3. Delete task (Preserves completion history)
  if (e.target.closest(".delete-btn")) {
    if (task.completed) {
      let marked = false;
      for (const entry of completionHistory) {
        if (entry.taskId === id && entry.status === "completed") {
          entry.deletedAt = new Date().toISOString();
          marked = true;
        }
      }
      // If legacy completed task without prior history, preserve snapshot with null date
      if (!marked) {
        completionHistory.push({
          id: uid(),
          taskId: task.id,
          text: task.text,
          completedAt: null,
          completedDate: null,
          plannedDate: task.plannedDate || null,
          dueDate: task.dueDate || null,
          status: "completed",
          undoneAt: null,
          deletedAt: new Date().toISOString(),
        });
      }
      saveCompletionHistory();
    }

    tasks = tasks.filter((t) => t.id !== id);
    saveTasks();
    render();
    return;
  }

  // 4. Reschedule toggle
  if (e.target.closest(".reschedule-btn")) {
    const container = li.querySelector(".date-editor-container");
    if (!container) return;
    const existingEditor = container.querySelector(".date-editor");
    if (existingEditor) {
      existingEditor.remove();
      return;
    }

    // Close any other open date editors
    listEl.querySelectorAll(".date-editor").forEach((el) => el.remove());

    const editor = document.createElement("div");
    editor.className = "date-editor";
    editor.setAttribute("aria-label", "Reschedule quest");
    editor.innerHTML = `
      <div class="date-editor-fields">
        <label class="editor-field">
          <span class="editor-label"><svg class="retro-icon chip-icon" aria-hidden="true"><use href="#icon-calendar" xlink:href="#icon-calendar"></use></svg>Plan:</span>
          <input type="date" class="editor-input edit-planned-input" value="${task.plannedDate || ""}" aria-label="Planned date" />
        </label>
        <label class="editor-field">
          <span class="editor-label"><svg class="retro-icon chip-icon" aria-hidden="true"><use href="#icon-clock" xlink:href="#icon-clock"></use></svg>Due:</span>
          <input type="date" class="editor-input edit-due-input" value="${task.dueDate || ""}" aria-label="Deadline" />
        </label>
      </div>
      <div class="date-editor-actions">
        <button type="button" class="editor-btn editor-clear-btn" title="Clear both dates">Clear</button>
        <button type="button" class="editor-btn editor-cancel-btn">Cancel</button>
        <button type="button" class="editor-btn editor-save-btn">Save</button>
      </div>
    `;
    container.appendChild(editor);
    updateBindingHoles();
    return;
  }

  // 5. Date editor actions
  if (e.target.closest(".editor-clear-btn")) {
    const editor = e.target.closest(".date-editor");
    if (editor) {
      const planIn = editor.querySelector(".edit-planned-input");
      const dueIn = editor.querySelector(".edit-due-input");
      if (planIn) planIn.value = "";
      if (dueIn) dueIn.value = "";
    }
    return;
  }

  if (e.target.closest(".editor-cancel-btn")) {
    const editor = e.target.closest(".date-editor");
    if (editor) {
      editor.remove();
      updateBindingHoles();
    }
    return;
  }

  if (e.target.closest(".editor-save-btn")) {
    const editor = e.target.closest(".date-editor");
    if (editor) {
      const planIn = editor.querySelector(".edit-planned-input");
      const dueIn = editor.querySelector(".edit-due-input");
      const newPlan = planIn && planIn.value ? planIn.value : null;
      const newDue = dueIn && dueIn.value ? dueIn.value : null;

      task.plannedDate = newPlan;
      task.dueDate = newDue;
      saveTasks();
      render();
    }
    return;
  }
});

// Inline edit (double click text)
listEl.addEventListener("dblclick", (e) => {
  // Safety guard: History view is strictly read-only
  if (currentFilter === "history") return;

  const p = e.target.closest(".quest-text");
  if (!p) return;
  const li = p.closest(".quest-item");
  const id = li.dataset.id;
  const task = tasks.find((t) => t.id === id);
  if (!task) return;
  if (li.querySelector(".edit-input")) return;

  const input = document.createElement("input");
  input.type = "text";
  input.value = task.text;
  input.className = "edit-input";
  p.classList.add("editing");
  p.after(input);
  input.focus();
  input.select();

  const finish = (commit) => {
    if (commit) {
      const val = input.value.trim();
      if (val) {
        task.text = val;
        saveTasks();
      }
    }
    input.remove();
    p.classList.remove("editing");
    render();
  };

  input.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter") finish(true);
    else if (ev.key === "Escape") finish(false);
  });
  input.addEventListener("blur", () => finish(true));
});

function spawnFloatingStar(parent) {
  const star = document.createElement("div");
  star.className = "floating-star";
  star.appendChild(createIconSvg("icon-star", "floating-star-svg"));
  parent.appendChild(star);
  setTimeout(() => star.remove(), 1100);
}

function showLevelUp() {
  const div = document.createElement("div");
  div.className = "level-up";
  div.textContent = "LEVEL UP!";
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 1800);
}

// Dynamic spiral holes
function updateBindingHoles() {
  if (!binding) return;
  const appEl = document.querySelector(".quest-app");
  if (!appEl) return;
  const h = appEl.offsetHeight;
  const holeSize = 38;
  const count = Math.max(6, Math.floor(h / holeSize));
  const current = binding.children.length;
  if (current === count) return;
  binding.innerHTML = "";
  for (let i = 0; i < count; i++) {
    const s = document.createElement("span");
    binding.appendChild(s);
  }
}
window.addEventListener("resize", () => updateBindingHoles());

// Midnight rollover & window focus check
let lastDateString = getTodayString();
function checkDateRollOver() {
  const currentToday = getTodayString();
  if (currentToday !== lastDateString) {
    lastDateString = currentToday;
    if (plannedInput && !plannedInput.value) {
      plannedInput.value = currentToday;
    }
    processRecurrenceRules(currentToday);
    render();
  }
}
window.addEventListener("focus", checkDateRollOver);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") checkDateRollOver();
});

// Accessibility: Enter submits form from text input
questInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    form.dispatchEvent(new Event("submit", { cancelable: true }));
  }
});

// ========================================================
// M04 — Backup & Restore Module
// ========================================================

const exportBackupBtn = document.getElementById("exportBackupBtn");
const importBackupTriggerBtn = document.getElementById("importBackupTriggerBtn");
const importFileInput = document.getElementById("importFileInput");
const backupFeedback = document.getElementById("backupFeedback");
const restoreModal = document.getElementById("restoreModal");
const restoreSummaryBox = document.getElementById("restoreSummaryBox");
const safetyBackupBtn = document.getElementById("safetyBackupBtn");
const cancelRestoreBtn = document.getElementById("cancelRestoreBtn");
const confirmRestoreBtn = document.getElementById("confirmRestoreBtn");

let stagedBackupPayload = null;
let feedbackTimeoutId = null;

function showBackupFeedback(msg, type = "info") {
  if (!backupFeedback) return;
  backupFeedback.textContent = msg;
  backupFeedback.className = `backup-feedback ${type}`.trim();
  if (feedbackTimeoutId) clearTimeout(feedbackTimeoutId);
  feedbackTimeoutId = setTimeout(() => {
    backupFeedback.textContent = "";
    backupFeedback.className = "backup-feedback";
  }, 4500);
}

function exportBackupData() {
  try {
    const currentTasks = loadTasks();
    const currentXP = loadXP();
    const currentLevel = loadLevel();
    const currentHistory = loadCompletionHistory();
    const currentRules = loadRecurrenceRules();

    const payload = {
      appName: "QuestDay Todo List",
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      data: {
        tasks: currentTasks,
        xp: currentXP,
        level: currentLevel,
        completionHistory: currentHistory,
        recurrenceRules: currentRules,
      },
    };

    const jsonStr = JSON.stringify(payload, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const today = getTodayString();
    const fileName = `questday-backup-${today}.json`;

    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 150);

    showBackupFeedback(`Backup exported successfully (${fileName})`, "success");
    return true;
  } catch (err) {
    console.error("Export backup failed:", err);
    showBackupFeedback("Export failed: Unable to generate backup file.", "error");
    return false;
  }
}

function parseBoolean(val, fallback = false) {
  if (typeof val === "boolean") return val;
  if (typeof val === "string") {
    const lower = val.trim().toLowerCase();
    if (lower === "true" || lower === "1") return true;
    if (lower === "false" || lower === "0") return false;
  }
  if (typeof val === "number") return val !== 0;
  return fallback;
}

function validateBackupPayload(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { valid: false, error: "Backup file is empty or not a valid JSON object." };
  }

  if (payload.schemaVersion !== 1) {
    return {
      valid: false,
      error: `Unsupported schema version (${payload.schemaVersion || "none"}). Only version 1 is supported.`,
    };
  }

  if (!payload.data || typeof payload.data !== "object" || Array.isArray(payload.data)) {
    return { valid: false, error: "Backup file is missing the 'data' payload section." };
  }

  const { tasks: rawTasks, xp: rawXP, level: rawLevel, completionHistory: rawHistory, recurrenceRules: rawRules } = payload.data;

  // Validate XP
  if (rawXP !== undefined && (!Number.isFinite(rawXP) || rawXP < 0 || rawXP > 1000000)) {
    return { valid: false, error: "Invalid XP: must be a finite non-negative number between 0 and 1,000,000." };
  }

  // Validate Level
  if (rawLevel !== undefined && (!Number.isFinite(rawLevel) || rawLevel < 1 || rawLevel > 10000)) {
    return { valid: false, error: "Invalid Level: must be a finite integer between 1 and 10,000." };
  }

  // Validate Tasks
  if (!Array.isArray(rawTasks)) {
    return { valid: false, error: "Invalid tasks: expected an array of quest items." };
  }

  const seenTaskIds = new Set();
  for (let i = 0; i < rawTasks.length; i++) {
    const t = rawTasks[i];
    if (!t || typeof t !== "object" || typeof t.id !== "string" || !t.id.trim() || typeof t.text !== "string") {
      return { valid: false, error: `Invalid task format at index ${i}. Each task must have a non-empty string 'id' and string 'text'.` };
    }
    const trimmedId = t.id.trim();
    if (seenTaskIds.has(trimmedId)) {
      return { valid: false, error: `Duplicate task ID "${trimmedId}" detected at index ${i}. Each task must have a unique ID.` };
    }
    seenTaskIds.add(trimmedId);
  }

  // Validate Completion History
  if (rawHistory !== undefined) {
    if (!Array.isArray(rawHistory)) {
      return { valid: false, error: "Invalid completion history: expected an array." };
    }
    const seenHistoryIds = new Set();
    for (let i = 0; i < rawHistory.length; i++) {
      const h = rawHistory[i];
      if (!h || typeof h !== "object" || typeof h.id !== "string" || !h.id.trim()) {
        return { valid: false, error: `Invalid completion history item at index ${i}. Must have a non-empty string 'id'.` };
      }
      const trimmedId = h.id.trim();
      if (seenHistoryIds.has(trimmedId)) {
        return { valid: false, error: `Duplicate history ID "${trimmedId}" detected at index ${i}.` };
      }
      seenHistoryIds.add(trimmedId);
      if (h.status !== undefined && h.status !== "completed" && h.status !== "undone") {
        return { valid: false, error: `Invalid status "${h.status}" in history item "${trimmedId}". Must be "completed" or "undone".` };
      }
    }
  }

  // Validate Recurrence Rules
  if (rawRules !== undefined) {
    if (!Array.isArray(rawRules)) {
      return { valid: false, error: "Invalid recurrence rules: expected an array." };
    }
    const seenRuleIds = new Set();
    for (let i = 0; i < rawRules.length; i++) {
      const r = rawRules[i];
      if (!r || typeof r !== "object" || typeof r.id !== "string" || !r.id.trim()) {
        return { valid: false, error: `Invalid recurrence rule at index ${i}. Must have a non-empty string 'id'.` };
      }
      const trimmedId = r.id.trim();
      if (seenRuleIds.has(trimmedId)) {
        return { valid: false, error: `Duplicate recurrence rule ID "${trimmedId}" detected at index ${i}.` };
      }
      seenRuleIds.add(trimmedId);
      if (r.frequency !== "daily" && r.frequency !== "weekly") {
        return { valid: false, error: `Invalid frequency "${r.frequency}" for rule "${trimmedId}". Must be "daily" or "weekly".` };
      }
    }
  }

  // Normalization / Sanitization
  const normalizedTasks = rawTasks.map((t) => ({
    id: String(t.id).trim(),
    text: String(t.text),
    plannedDate: isValidDateString(t.plannedDate) ? t.plannedDate : null,
    dueDate: isValidDateString(t.dueDate) ? t.dueDate : null,
    completed: parseBoolean(t.completed, false),
    completedAt: typeof t.completedAt === "string" ? t.completedAt : null,
    favorite: parseBoolean(t.favorite, false),
    xpCompleted: parseBoolean(t.xpCompleted !== undefined ? t.xpCompleted : t.completed, false),
    createdAt: typeof t.createdAt === "number" && Number.isFinite(t.createdAt) ? t.createdAt : Date.now(),
    ruleId: typeof t.ruleId === "string" && t.ruleId.trim() ? t.ruleId.trim() : null,
    occurrenceDate: isValidDateString(t.occurrenceDate) ? t.occurrenceDate : (isValidDateString(t.plannedDate) ? t.plannedDate : null),
  }));

  const normalizedXP = typeof rawXP === "number" && Number.isFinite(rawXP) && rawXP >= 0 && rawXP <= 1000000 ? Math.floor(rawXP) : 0;
  const normalizedLevel = typeof rawLevel === "number" && Number.isFinite(rawLevel) && rawLevel >= 1 && rawLevel <= 10000 ? Math.floor(rawLevel) : 1;

  const normalizedHistory = Array.isArray(rawHistory)
    ? rawHistory
        .filter((h) => h && typeof h === "object" && typeof h.id === "string" && h.id.trim())
        .map((h) => ({
          id: String(h.id).trim(),
          taskId: String(h.taskId || "").trim(),
          ruleId: typeof h.ruleId === "string" && h.ruleId.trim() ? h.ruleId.trim() : null,
          text: String(h.text || ""),
          completedAt: typeof h.completedAt === "string" ? h.completedAt : null,
          completedDate: isValidDateString(h.completedDate) ? h.completedDate : null,
          plannedDate: isValidDateString(h.plannedDate) ? h.plannedDate : null,
          dueDate: isValidDateString(h.dueDate) ? h.dueDate : null,
          status: h.status === "undone" ? "undone" : "completed",
          undoneAt: typeof h.undoneAt === "string" ? h.undoneAt : null,
          deletedAt: typeof h.deletedAt === "string" ? h.deletedAt : null,
        }))
    : [];

  const normalizedRules = Array.isArray(rawRules)
    ? rawRules
        .filter((r) => r && typeof r === "object" && typeof r.id === "string" && r.id.trim() && (r.frequency === "daily" || r.frequency === "weekly"))
        .map((r) => ({
          id: String(r.id).trim(),
          text: String(r.text || ""),
          frequency: r.frequency,
          startDate: isValidDateString(r.startDate) ? r.startDate : getTodayString(),
          dueDateOffsetDays: typeof r.dueDateOffsetDays === "number" && Number.isFinite(r.dueDateOffsetDays) ? r.dueDateOffsetDays : null,
          active: parseBoolean(r.active, true),
          createdAt: typeof r.createdAt === "string" ? r.createdAt : new Date().toISOString(),
          lastGeneratedDate: isValidDateString(r.lastGeneratedDate) ? r.lastGeneratedDate : null,
        }))
    : [];

  return {
    valid: true,
    normalized: {
      tasks: normalizedTasks,
      xp: normalizedXP,
      level: normalizedLevel,
      completionHistory: normalizedHistory,
      recurrenceRules: normalizedRules,
      exportedAt: payload.exportedAt || null,
    },
  };
}

function openRestoreModal(normalizedData) {
  if (!restoreModal || !restoreSummaryBox) return;

  stagedBackupPayload = normalizedData;
  restoreSummaryBox.innerHTML = "";

  const createSummaryRow = (label, value) => {
    const row = document.createElement("div");
    row.className = "summary-row";
    const lblSpan = document.createElement("span");
    lblSpan.className = "summary-label";
    lblSpan.textContent = label;
    const valSpan = document.createElement("span");
    valSpan.className = "summary-value";
    valSpan.textContent = String(value);
    row.appendChild(lblSpan);
    row.appendChild(valSpan);
    return row;
  };

  const expDateStr = normalizedData.exportedAt
    ? new Date(normalizedData.exportedAt).toLocaleString()
    : "Not specified";

  restoreSummaryBox.appendChild(createSummaryRow("Backup Date:", expDateStr));
  restoreSummaryBox.appendChild(createSummaryRow("Quests to restore:", `${normalizedData.tasks.length} quests`));
  restoreSummaryBox.appendChild(createSummaryRow("Character Level & XP:", `Lv ${normalizedData.level} • ${normalizedData.xp} XP`));
  restoreSummaryBox.appendChild(createSummaryRow("Completion Records:", `${normalizedData.completionHistory.length} records`));
  restoreSummaryBox.appendChild(createSummaryRow("Recurrence Rules:", `${normalizedData.recurrenceRules.length} rules`));

  restoreModal.classList.add("active");
  restoreModal.setAttribute("aria-hidden", "false");
}

function closeRestoreModal(feedbackMsg = "") {
  if (!restoreModal) return;
  restoreModal.classList.remove("active");
  restoreModal.setAttribute("aria-hidden", "true");
  stagedBackupPayload = null;
  if (importFileInput) importFileInput.value = "";
  if (feedbackMsg) showBackupFeedback(feedbackMsg);
}

function executeRestore() {
  if (!stagedBackupPayload) {
    closeRestoreModal();
    return;
  }

  // 1. Take safety snapshot for rollback
  let rollbackSnapshot = null;
  try {
    rollbackSnapshot = {
      tasks: localStorage.getItem(STORAGE_KEY_TASKS),
      xp: localStorage.getItem(STORAGE_KEY_XP),
      level: localStorage.getItem(STORAGE_KEY_LEVEL),
      history: localStorage.getItem(STORAGE_KEY_HISTORY),
      rules: localStorage.getItem(STORAGE_KEY_RECURRENCE_RULES),
    };
  } catch (e) {
    console.warn("Could not read rollback snapshot:", e);
  }

  // 2. Attempt writing to LocalStorage
  try {
    localStorage.setItem(STORAGE_KEY_TASKS, JSON.stringify(stagedBackupPayload.tasks));
    localStorage.setItem(STORAGE_KEY_XP, String(stagedBackupPayload.xp));
    localStorage.setItem(STORAGE_KEY_LEVEL, String(stagedBackupPayload.level));
    localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(stagedBackupPayload.completionHistory));
    localStorage.setItem(STORAGE_KEY_RECURRENCE_RULES, JSON.stringify(stagedBackupPayload.recurrenceRules));
  } catch (writeErr) {
    console.error("LocalStorage write failed during restore:", writeErr);
    // Rollback
    let rollbackSucceeded = true;
    if (rollbackSnapshot) {
      try {
        for (const [k, v] of Object.entries(rollbackSnapshot)) {
          if (v !== null) localStorage.setItem(k, v);
          else localStorage.removeItem(k);
        }
      } catch (rollbackErr) {
        console.error("Rollback failed:", rollbackErr);
        rollbackSucceeded = false;
      }
    }
    closeRestoreModal();
    if (rollbackSucceeded) {
      showBackupFeedback("Restore failed: Storage quota exceeded. Original data was preserved.", "error");
    } else {
      showBackupFeedback("Critical: Restore failed and rollback could not be fully completed. Please check your storage quota.", "error");
    }
    return;
  }

  // 3. Re-hydrate in-memory state
  tasks = loadTasks();
  xp = loadXP();
  level = loadLevel();
  MAX_XP = xpForLevel(level);
  completionHistory = loadCompletionHistory();
  recurrenceRules = loadRecurrenceRules();
  currentFilter = "today";

  // 4. Update UI
  updateActiveTabUI();
  updateXPUI();
  render();
  updateBindingHoles();

  const restoredCount = stagedBackupPayload.tasks.length;
  closeRestoreModal();
  showBackupFeedback(`Data restored successfully! (${restoredCount} quests restored)`, "success");
}

// Event Listeners for Backup/Restore
if (exportBackupBtn) {
  exportBackupBtn.addEventListener("click", () => exportBackupData());
}

if (importBackupTriggerBtn && importFileInput) {
  importBackupTriggerBtn.addEventListener("click", () => {
    importFileInput.value = "";
    importFileInput.click();
  });
}

if (importFileInput) {
  importFileInput.addEventListener("change", (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showBackupFeedback("File is too large (maximum allowed: 5MB).", "error");
      importFileInput.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const rawJson = ev.target.result;
        const parsed = JSON.parse(rawJson);
        const validation = validateBackupPayload(parsed);
        if (!validation.valid) {
          showBackupFeedback(`Validation failed: ${validation.error}`, "error");
          importFileInput.value = "";
          return;
        }
        openRestoreModal(validation.normalized);
      } catch (parseErr) {
        showBackupFeedback("Invalid file: File must be valid JSON format.", "error");
        importFileInput.value = "";
      }
    };
    reader.onerror = () => {
      showBackupFeedback("Failed to read the selected file.", "error");
      importFileInput.value = "";
    };
    reader.readAsText(file);
  });
}

if (safetyBackupBtn) {
  safetyBackupBtn.addEventListener("click", () => {
    exportBackupData();
    showBackupFeedback("Current safety backup downloaded.", "success");
  });
}

if (cancelRestoreBtn) {
  cancelRestoreBtn.addEventListener("click", () => closeRestoreModal("Restore cancelled."));
}

if (confirmRestoreBtn) {
  confirmRestoreBtn.addEventListener("click", () => executeRestore());
}

if (restoreModal) {
  restoreModal.addEventListener("click", (e) => {
    if (e.target === restoreModal) closeRestoreModal("Restore cancelled.");
  });
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && restoreModal && restoreModal.classList.contains("active")) {
    closeRestoreModal("Restore cancelled.");
  }
});

// Init ----------------------------------------------
const todayInit = getTodayString();
if (plannedInput) {
  plannedInput.value = todayInit;
}
processRecurrenceRules(todayInit);
updateXPUI();
render();
updateBindingHoles();
