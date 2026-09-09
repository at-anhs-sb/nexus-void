const CONFIG = {
  clubUrl: "https://www.chess.com/club/the-nexus-void",
  clubSlug: "the-nexus-void",

  calendarApi: "",
  matchApi: "",

  refreshInterval: 60000,

  timeRanges: {
    morning: {
      start: 5,
      end: 12
    },

    afternoon: {
      start: 12,
      end: 18
    },

    night: {
      start: 18,
      end: 5
    }
  }
};

const state = {
  manualTheme: false,
  currentTheme: "night",
  memberCount: null,
  matches: [],
  calendar: []
};

const elements = {
  body: document.body,

  connectionStatus: document.getElementById("connectionStatus"),

  calendarContainer: document.getElementById("calendarContainer"),
  calendarStatus: document.getElementById("calendarStatus"),

  matchList: document.getElementById("matchList"),
  matchCount: document.getElementById("matchCount"),

  memberCount: document.getElementById("memberCount"),
  memberUpdate: document.getElementById("memberUpdate"),

  currentTimeMode: document.getElementById("currentTimeMode"),
  currentTime: document.getElementById("currentTime"),
  systemClock: document.getElementById("systemClock"),
  themeAutoStatus: document.getElementById("themeAutoStatus"),

  themeButtons: [...document.querySelectorAll(".theme-switch")]
};

function pad(value) {
  return String(value).padStart(2, "0");
}

function getCurrentDate() {
  return new Date();
}

function getTimeTheme() {
  const hour = getCurrentDate().getHours();

  if (hour >= 5 && hour < 12) {
    return "morning";
  }

  if (hour >= 12 && hour < 18) {
    return "afternoon";
  }

  return "night";
}

function formatThemeName(theme) {
  return theme.toUpperCase();
}

function updateClock() {
  const now = getCurrentDate();

  const hours = pad(now.getHours());
  const minutes = pad(now.getMinutes());
  const seconds = pad(now.getSeconds());

  const time = `${hours}:${minutes}`;
  const fullTime = `${hours}:${minutes}:${seconds}`;

  elements.currentTime.textContent = time;
  elements.systemClock.textContent = fullTime;

  if (!state.manualTheme) {
    const detectedTheme = getTimeTheme();

    if (detectedTheme !== state.currentTheme) {
      setTheme(detectedTheme, false);
    }
  }
}

function setTheme(theme, manual = false) {
  state.currentTheme = theme;
  state.manualTheme = manual;

  elements.body.dataset.timeTheme = theme;

  elements.currentTimeMode.textContent = formatThemeName(theme);

  elements.themeButtons.forEach(button => {
    button.classList.toggle(
      "active",
      button.dataset.themeMode === theme
    );
  });

  elements.themeAutoStatus.textContent = manual
    ? "MANUAL THEME MODE"
    : "AUTO TIME DETECTION";
}

function initializeThemeSwitches() {
  elements.themeButtons.forEach(button => {
    button.addEventListener("click", () => {
      const theme = button.dataset.themeMode;

      setTheme(theme, true);
    });
  });

  const initialTheme = getTimeTheme();

  setTheme(initialTheme, false);
}

function formatMemberCount(count) {
  if (!Number.isFinite(count)) {
    return "---";
  }

  return new Intl.NumberFormat().format(count);
}

async function fetchClubData() {
  try {
    elements.connectionStatus.textContent = "SYNCING";

    const response = await fetch(CONFIG.clubUrl, {
      method: "GET"
    });

    if (!response.ok) {
      throw new Error("Unable to retrieve club data");
    }

    const text = await response.text();

    const memberMatch =
      text.match(/([\d,]+)\s+Members/i) ||
      text.match(/membersCount["']?\s*[:=]\s*["']?(\d+)/i);

    if (memberMatch) {
      const memberValue = Number(
        memberMatch[1].replace(/,/g, "")
      );

      state.memberCount = memberValue;

      elements.memberCount.textContent =
        formatMemberCount(memberValue);

      elements.memberUpdate.textContent =
        "LIVE SYNC";
    } else {
      elements.memberUpdate.textContent =
        "CLUB DATA READY";
    }

    elements.connectionStatus.textContent = "ONLINE";
  } catch (error) {
    elements.connectionStatus.textContent = "ONLINE";

    elements.memberUpdate.textContent =
      "UPDATE UNAVAILABLE";
  }
}

function getRelativeTime(dateValue) {
  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const difference = Date.now() - date.getTime();

  const minutes = Math.floor(difference / 60000);
  const hours = Math.floor(difference / 3600000);
  const days = Math.floor(difference / 86400000);

  if (minutes < 1) {
    return "JUST NOW";
  }

  if (minutes < 60) {
    return `${minutes}M AGO`;
  }

  if (hours < 24) {
    return `${hours}H AGO`;
  }

  return `${days}D AGO`;
}

function clearMatches() {
  elements.matchList.innerHTML = "";
}

function createMatchElement(match, index) {
  const matchElement = document.createElement("article");

  matchElement.className = "match-item";

  const title =
    match.title ||
    match.name ||
    match.opponent ||
    "CLUB MATCH";

  const result =
    match.result ||
    match.status ||
    "RECENT ACTIVITY";

  const date =
    match.end_time ||
    match.date ||
    match.timestamp ||
    match.created_at;

  const relativeTime =
    date
      ? getRelativeTime(
          typeof date === "number"
            ? date * 1000
            : date
        )
      : "RECENT";

  matchElement.innerHTML = `
    <span class="match-index">${pad(index + 1)}</span>

    <div class="match-info">
      <span class="match-title">${title}</span>
      <span class="match-meta">${relativeTime}</span>
    </div>

    <span class="match-result">${result}</span>
  `;

  return matchElement;
}

function renderMatches(matches) {
  clearMatches();

  if (!matches.length) {
    elements.matchList.innerHTML = `
      <div class="match-empty">
        NO RECENT MATCH DATA
      </div>
    `;

    elements.matchCount.textContent = "00";

    return;
  }

  const recentMatches = matches.slice(0, 10);

  recentMatches.forEach((match, index) => {
    const matchElement =
      createMatchElement(match, index);

    elements.matchList.appendChild(matchElement);
  });

  elements.matchCount.textContent =
    pad(recentMatches.length);
}

async function fetchMatches() {
  if (!CONFIG.matchApi) {
    renderMatches([]);

    return;
  }

  try {
    const response = await fetch(CONFIG.matchApi);

    if (!response.ok) {
      throw new Error("Unable to retrieve match data");
    }

    const data = await response.json();

    const matches =
      Array.isArray(data)
        ? data
        : data.matches ||
          data.results ||
          data.items ||
          [];

    state.matches = matches;

    renderMatches(matches);
  } catch (error) {
    renderMatches([]);
  }
}

function formatEventDate(dateValue) {
  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "DATE TBD";
  }

  return new Intl.DateTimeFormat(
    "en-US",
    {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit"
    }
  ).format(date).toUpperCase();
}

function clearCalendar() {
  elements.calendarContainer.innerHTML = "";
}

function createCalendarEvent(event, index) {
  const eventElement = document.createElement("article");

  eventElement.className = "calendar-event";

  const title =
    event.title ||
    event.name ||
    event.event_name ||
    "NEXUS VOID EVENT";

  const date =
    event.start ||
    event.start_time ||
    event.date ||
    event.timestamp;

  eventElement.innerHTML = `
    <span class="event-index">${pad(index + 1)}</span>

    <div class="event-info">
      <span class="event-title">${title}</span>
      <span class="event-date">
        ${date ? formatEventDate(date) : "DATE TBD"}
      </span>
    </div>
  `;

  return eventElement;
}

function renderCalendar(events) {
  clearCalendar();

  if (!events.length) {
    elements.calendarContainer.innerHTML = `
      <div class="calendar-empty">
        NO UPCOMING EVENTS
      </div>
    `;

    elements.calendarStatus.textContent = "READY";

    return;
  }

  events.slice(0, 3).forEach((event, index) => {
    const eventElement =
      createCalendarEvent(event, index);

    elements.calendarContainer.appendChild(eventElement);
  });

  elements.calendarStatus.textContent = "LIVE";
}

async function fetchCalendar() {
  if (!CONFIG.calendarApi) {
    renderCalendar([]);

    return;
  }

  try {
    elements.calendarStatus.textContent = "SYNCING";

    const response = await fetch(CONFIG.calendarApi);

    if (!response.ok) {
      throw new Error("Unable to retrieve calendar");
    }

    const data = await response.json();

    const events =
      Array.isArray(data)
        ? data
        : data.events ||
          data.results ||
          data.items ||
          [];

    state.calendar = events;

    renderCalendar(events);
  } catch (error) {
    elements.calendarStatus.textContent =
      "OFFLINE";

    renderCalendar([]);
  }
}

async function refreshSystem() {
  await Promise.all([
    fetchClubData(),
    fetchMatches(),
    fetchCalendar()
  ]);
}

function initializeSystem() {
  initializeThemeSwitches();

  updateClock();

  setInterval(
    updateClock,
    1000
  );

  refreshSystem();

  setInterval(
    refreshSystem,
    CONFIG.refreshInterval
  );
}

document.addEventListener(
  "DOMContentLoaded",
  initializeSystem
);