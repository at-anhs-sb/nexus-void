const CONFIG = {
  clubUrl: "https://api.chess.com/pub/club/the-nexus-void",
  clubMembersUrl: "https://api.chess.com/pub/club/the-nexus-void/members",
  matchApi: "https://api.chess.com/pub/club/the-nexus-void/matches",

  calendarApi: "",

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
  newestMembers: [],
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

  newestMembersList:
    document.getElementById("newestMembersList"),

  newestMembersCount:
    document.getElementById("newestMembersCount"),

  currentTimeMode:
    document.getElementById("currentTimeMode"),

  currentTime:
    document.getElementById("currentTime"),

  systemClock:
    document.getElementById("systemClock"),

  themeAutoStatus:
    document.getElementById("themeAutoStatus"),

  themeButtons:
    [...document.querySelectorAll(".theme-switch")]
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

  elements.currentTimeMode.textContent =
    formatThemeName(theme);

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

function escapeHTML(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatTimestamp(timestamp) {
  if (!Number.isFinite(Number(timestamp))) {
    return "";
  }

  const date = new Date(Number(timestamp) * 1000);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(date).toUpperCase();
}

async function fetchClubData() {
  try {
    elements.connectionStatus.textContent = "SYNCING";

    const response = await fetch(CONFIG.clubUrl, {
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error("Unable to retrieve club data");
    }

    const data = await response.json();

    const memberValue = Number(data.members_count);

    if (Number.isFinite(memberValue)) {
      state.memberCount = memberValue;

      elements.memberCount.textContent =
        formatMemberCount(memberValue);

      elements.memberUpdate.textContent =
        "LIVE SYNC";
    } else {
      elements.memberCount.textContent = "---";
      elements.memberUpdate.textContent =
        "COUNT UNAVAILABLE";
    }

    elements.connectionStatus.textContent = "ONLINE";
  } catch (error) {
    console.error("Club data error:", error);

    elements.connectionStatus.textContent = "OFFLINE";

    elements.memberUpdate.textContent =
      "UPDATE UNAVAILABLE";
  }
}

function createMemberElement(member, index) {
  const memberElement = document.createElement("div");

  memberElement.className = "newest-member";

  const username =
    member.username ||
    "UNKNOWN MEMBER";

  const joined =
    formatTimestamp(member.joined);

  memberElement.innerHTML = `
    <span class="newest-member-number">
      ${pad(index + 1)}
    </span>

    <span
      class="newest-member-name"
      title="${escapeHTML(username)}"
    >
      ${escapeHTML(username)}
    </span>

    ${
      joined
        ? `<span class="newest-member-date">${joined}</span>`
        : ""
    }
  `;

  return memberElement;
}

function renderNewestMembers(members) {
  if (!elements.newestMembersList) {
    return;
  }

  elements.newestMembersList.innerHTML = "";

  if (!members.length) {
    elements.newestMembersList.innerHTML = `
      <div class="member-empty">
        NO MEMBER DATA AVAILABLE
      </div>
    `;

    if (elements.newestMembersCount) {
      elements.newestMembersCount.textContent = "00";
    }

    return;
  }

  const newestMembers =
    members
      .filter(member =>
        member &&
        member.username
      )
      .sort(
        (a, b) =>
          Number(b.joined || 0) -
          Number(a.joined || 0)
      )
      .slice(0, 10);

  state.newestMembers = newestMembers;

  newestMembers.forEach((member, index) => {
    elements.newestMembersList.appendChild(
      createMemberElement(member, index)
    );
  });

  if (elements.newestMembersCount) {
    elements.newestMembersCount.textContent =
      pad(newestMembers.length);
  }
}

async function fetchNewestMembers() {
  if (!CONFIG.clubMembersUrl) {
    renderNewestMembers([]);

    return;
  }

  try {
    const response = await fetch(
      CONFIG.clubMembersUrl,
      {
        cache: "no-store"
      }
    );

    if (!response.ok) {
      throw new Error(
        "Unable to retrieve club members"
      );
    }

    const data = await response.json();

    const members = [
      ...(Array.isArray(data.weekly)
        ? data.weekly
        : []),

      ...(Array.isArray(data.monthly)
        ? data.monthly
        : []),

      ...(Array.isArray(data.all_time)
        ? data.all_time
        : [])
    ];

    const uniqueMembers = new Map();

    members.forEach(member => {
      if (!member || !member.username) {
        return;
      }

      const username =
        member.username.toLowerCase();

      const existing =
        uniqueMembers.get(username);

      if (
        !existing ||
        Number(member.joined || 0) >
          Number(existing.joined || 0)
      ) {
        uniqueMembers.set(
          username,
          member
        );
      }
    });

    renderNewestMembers(
      [...uniqueMembers.values()]
    );
  } catch (error) {
    console.error(
      "Member data error:",
      error
    );

    if (elements.newestMembersList) {
      elements.newestMembersList.innerHTML = `
        <div class="member-empty">
          MEMBER DATA UNAVAILABLE
        </div>
      `;
    }

    if (elements.newestMembersCount) {
      elements.newestMembersCount.textContent = "00";
    }
  }
}

function getRelativeTime(dateValue) {
  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const difference =
    Date.now() - date.getTime();

  const minutes =
    Math.floor(difference / 60000);

  const hours =
    Math.floor(difference / 3600000);

  const days =
    Math.floor(difference / 86400000);

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

function getMatchTimestamp(match) {
  const timestamp =
    Number(match.start_time);

  if (
    Number.isFinite(timestamp) &&
    timestamp > 0
  ) {
    return timestamp;
  }

  return 0;
}

function getMatchStatus(match) {
  if (match.status) {
    return match.status;
  }

  return "";
}

function flattenMatches(data) {
  if (!data || typeof data !== "object") {
    return [];
  }

  const finished =
    Array.isArray(data.finished)
      ? data.finished
      : [];

  const inProgress =
    Array.isArray(data.in_progress)
      ? data.in_progress
      : [];

  const registered =
    Array.isArray(data.registered)
      ? data.registered
      : [];

  const matches = [
    ...finished.map(match => ({
      ...match,
      status: "FINISHED"
    })),

    ...inProgress.map(match => ({
      ...match,
      status: "IN PROGRESS"
    })),

    ...registered.map(match => ({
      ...match,
      status: "REGISTERED"
    }))
  ];

  const uniqueMatches = new Map();

  matches.forEach(match => {
    const id =
      match["@id"] ||
      match.url ||
      `${match.name}-${match.start_time || ""}`;

    if (!uniqueMatches.has(id)) {
      uniqueMatches.set(id, match);
    }
  });

  return [...uniqueMatches.values()]
    .sort(
      (a, b) =>
        getMatchTimestamp(b) -
        getMatchTimestamp(a)
    );
}

function clearMatches() {
  elements.matchList.innerHTML = "";
}

function createMatchElement(match, index) {
  const matchElement =
    document.createElement("article");

  matchElement.className = "match-item";

  const title =
    match.name ||
    match.title ||
    "CLUB MATCH";

  const opponent =
    typeof match.opponent === "string"
      ? match.opponent
          .split("/")
          .filter(Boolean)
          .pop()
      : "";

  const status =
    getMatchStatus(match);

  const timestamp =
    getMatchTimestamp(match);

  const relativeTime =
    timestamp
      ? getRelativeTime(
          timestamp * 1000
        )
      : status;

  const result =
    match.result
      ? String(match.result).toUpperCase()
      : status;

  const opponentText =
    opponent
      ? `VS ${opponent}`
      : "NEXUS VOID";

  matchElement.innerHTML = `
    <span class="match-index">
      ${pad(index + 1)}
    </span>

    <div class="match-info">
      <span
        class="match-title"
        title="${escapeHTML(title)}"
      >
        ${escapeHTML(title)}
      </span>

      <span class="match-meta">
        ${escapeHTML(opponentText)}
        ${relativeTime ? ` · ${escapeHTML(relativeTime)}` : ""}
      </span>
    </div>

    <span class="match-result">
      ${escapeHTML(result)}
    </span>
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

  const recentMatches =
    matches.slice(0, 10);

  recentMatches.forEach(
    (match, index) => {
      const matchElement =
        createMatchElement(
          match,
          index
        );

      elements.matchList.appendChild(
        matchElement
      );
    }
  );

  elements.matchCount.textContent =
    pad(recentMatches.length);
}

async function fetchMatches() {
  try {
    const response = await fetch(
      CONFIG.matchApi,
      {
        cache: "no-store"
      }
    );

    if (!response.ok) {
      throw new Error(
        "Unable to retrieve match data"
      );
    }

    const data =
      await response.json();

    const matches =
      flattenMatches(data);

    state.matches = matches;

    renderMatches(matches);

    if (
      elements.calendarStatus &&
      matches.length
    ) {
      const upcoming =
        matches.filter(
          match =>
            match.status === "REGISTERED" ||
            (
              getMatchTimestamp(match) * 1000 >
              Date.now()
            )
        );

      renderCalendar(upcoming);
    }
  } catch (error) {
    console.error(
      "Match data error:",
      error
    );

    state.matches = [];

    renderMatches([]);

    if (elements.calendarStatus) {
      elements.calendarStatus.textContent =
        "OFFLINE";
    }
  }
}

function formatEventDate(dateValue) {
  const timestamp =
    Number(dateValue);

  let date;

  if (
    Number.isFinite(timestamp) &&
    timestamp > 100000000
  ) {
    date =
      new Date(timestamp * 1000);
  } else {
    date =
      new Date(dateValue);
  }

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
  )
    .format(date)
    .toUpperCase();
}

function clearCalendar() {
  elements.calendarContainer.innerHTML = "";
}

function createCalendarEvent(event, index) {
  const eventElement =
    document.createElement("article");

  eventElement.className =
    "calendar-event";

  const title =
    event.name ||
    event.title ||
    "NEXUS VOID MATCH";

  const timestamp =
    getMatchTimestamp(event);

  const date =
    timestamp
      ? timestamp
      : event.start ||
        event.start_time ||
        event.date ||
        event.timestamp;

  eventElement.innerHTML = `
    <span class="event-index">
      ${pad(index + 1)}
    </span>

    <div class="event-info">
      <span
        class="event-title"
        title="${escapeHTML(title)}"
      >
        ${escapeHTML(title)}
      </span>

      <span class="event-date">
        ${
          date
            ? formatEventDate(date)
            : "DATE TBD"
        }
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

    elements.calendarStatus.textContent =
      "READY";

    return;
  }

  events
    .slice(0, 3)
    .forEach((event, index) => {
      const eventElement =
        createCalendarEvent(
          event,
          index
        );

      elements.calendarContainer.appendChild(
        eventElement
      );
    });

  elements.calendarStatus.textContent =
    "LIVE";
}

async function fetchCalendar() {
  if (!CONFIG.calendarApi) {
    elements.calendarStatus.textContent =
      "MATCH SYNC";

    return;
  }

  try {
    elements.calendarStatus.textContent =
      "SYNCING";

    const response =
      await fetch(
        CONFIG.calendarApi,
        {
          cache: "no-store"
        }
      );

    if (!response.ok) {
      throw new Error(
        "Unable to retrieve calendar"
      );
    }

    const data =
      await response.json();

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
    fetchNewestMembers(),
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
