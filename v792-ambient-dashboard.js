(function (root) {
  "use strict";

  const BAHRAIN_TZ = "Asia/Bahrain";
  const IDLE_MS = 12000;

  function isDashboardDevice(info) {
    if (root && root.SenaishaDashboardDetection &&
        typeof root.SenaishaDashboardDetection.isDashboardDevice === "function") {
      return root.SenaishaDashboardDetection.isDashboardDevice(info);
    }
    const width = Number(info && info.width) || 0;
    const height = Number(info && info.height) || 0;
    const landscape = width > height;
    if (!landscape) return false;

    if (info && info.isSilk) {
      return width >= 600;
    }

    const touch = Number(info && info.maxTouchPoints) >= 2;
    const coarse = Boolean(info && info.coarsePointer);
    return width >= 700 && width <= 1400 && touch && coarse;
  }

  function ordinal(day) {
    const value = Number(day);
    const mod100 = value % 100;
    if (mod100 >= 11 && mod100 <= 13) return value + "th";
    switch (value % 10) {
      case 1: return value + "st";
      case 2: return value + "nd";
      case 3: return value + "rd";
      default: return value + "th";
    }
  }

  function formatClock(date) {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: BAHRAIN_TZ,
      hour: "numeric",
      minute: "2-digit",
      hour12: true
    }).format(date);
  }

  function formatCompactDate(date) {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: BAHRAIN_TZ,
      weekday: "short",
      day: "numeric",
      month: "short"
    }).format(date);
  }

  function formatDateLabel(date) {
    const weekday = new Intl.DateTimeFormat("en-GB", {
      timeZone: BAHRAIN_TZ,
      weekday: "long"
    }).format(date);
    const day = Number(new Intl.DateTimeFormat("en-GB", {
      timeZone: BAHRAIN_TZ,
      day: "numeric"
    }).format(date));
    const month = new Intl.DateTimeFormat("en-GB", {
      timeZone: BAHRAIN_TZ,
      month: "long"
    }).format(date);
    return weekday + ", " + ordinal(day) + " " + month;
  }

  function weatherIconForCode(code) {
    if (code === 0) return "\u2600\uFE0F";
    if (code === 1 || code === 2) return "\uD83C\uDF24\uFE0F";
    if (code === 3) return "\u2601\uFE0F";
    if (code === 45 || code === 48) return "\uD83C\uDF2B\uFE0F";
    if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return "\uD83C\uDF27\uFE0F";
    if ([95, 96, 99].includes(code)) return "\u26C8\uFE0F";
    return "\uD83C\uDF24\uFE0F";
  }

  function readWeatherSnapshot(options) {
    const chipTemp = String((options && options.chipTemp) || "").trim();
    const chipIcon = String((options && options.chipIcon) || "").trim();
    const now = Number(options && options.now) || Date.now();

    if (/\d/.test(chipTemp)) {
      return {
        temp: chipTemp,
        icon: chipIcon || "\uD83C\uDF24\uFE0F",
        location: "Bahrain"
      };
    }

    try {
      const cached = JSON.parse((options && options.storageValue) || "null");
      const age = now - Number(cached && cached.savedAt);
      const current = cached && cached.data && cached.data.current;
      if (current && Number.isFinite(Number(current.temperature_2m)) && age >= 0 && age <= 90 * 60 * 1000) {
        return {
          temp: Math.round(Number(current.temperature_2m)) + "\u00B0",
          icon: weatherIconForCode(Number(current.weather_code)),
          location: "Bahrain"
        };
      }
    } catch (_) {}

    return {
      temp: "--\u00B0",
      icon: chipIcon || "\uD83C\uDF24\uFE0F",
      location: "Bahrain"
    };
  }

  function createIdleController(options) {
    const delayMs = Number(options && options.delayMs) || IDLE_MS;
    const onActive = (options && options.onActive) || function () {};
    const onIdle = (options && options.onIdle) || function () {};
    const scheduler = (options && options.scheduler) || {
      set: function (fn, delay) { return setTimeout(fn, delay); },
      clear: function (id) { clearTimeout(id); }
    };

    let timer = null;
    let engaged = false;

    function clearTimer() {
      if (timer !== null) scheduler.clear(timer);
      timer = null;
    }

    function arm() {
      clearTimer();
      timer = scheduler.set(function () {
        timer = null;
        if (!engaged) return;
        onIdle();
      }, delayMs);
    }

    return {
      activate: function () {
        engaged = true;
        onActive();
        arm();
      },
      interact: function () {
        if (!engaged) return;
        onActive();
        arm();
      },
      cancel: function () {
        engaged = false;
        clearTimer();
      },
      isEngaged: function () { return engaged; }
    };
  }

  const api = {
    isDashboardDevice,
    formatClock,
    formatDateLabel,
    createIdleController,
    readWeatherSnapshot
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  if (!root || !root.document) return;

  const document = root.document;
  const html = document.documentElement;
  const topbar = document.querySelector(".topbar");
  const topbarActions = document.querySelector(".topbar-actions");
  const playerCard = document.getElementById("playerCard") || document.querySelector(".player-card");
  const playerTop = document.querySelector(".player-top");
  const coverWrap = document.querySelector(".cover-wrap");
  const coverArt = document.getElementById("coverArt");
  const stationsSection = document.querySelector(".stations-section");
  const stations = Array.from(document.querySelectorAll(".station-card"));
  const prevButton = document.getElementById("prevButton");
  const nextButton = document.getElementById("nextButton");
  const playButton = document.getElementById("playPauseButton");
  const showStationsButton = document.getElementById("showStationsButton");
  const weatherChipTemp = document.getElementById("weatherChipTemp");
  const weatherChipIcon = document.getElementById("weatherChipIcon");
  const primaryAudio = document.getElementById("radioPlayer");
  const standbyAudio = document.getElementById("radioPlayerStandby");

  if (!topbar || !playerCard || !playerTop || !coverWrap || !coverArt || !stationsSection) return;

  function detectDevice() {
    const ua = String((root.navigator && root.navigator.userAgent) || "");
    return isDashboardDevice({
      isSilk: /Silk\//i.test(ua),
      userAgent: ua,
      forceDashboard: new URLSearchParams(root.location.search).get("dashboard") === "1",
      width: root.innerWidth,
      height: root.innerHeight,
      maxTouchPoints: Number((root.navigator && root.navigator.maxTouchPoints) || 0),
      coarsePointer: Boolean(root.matchMedia && root.matchMedia("(pointer: coarse)").matches)
    });
  }

  function makeElement(tag, className, id) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (id) el.id = id;
    return el;
  }

  const topStatus = makeElement("div", "sl-dashboard-top-status", "slDashboardTopStatus");
  topStatus.setAttribute("aria-hidden", "true");
  topStatus.innerHTML = [
    '<span id="slTopClock" class="sl-top-clock"></span>',
    '<span class="sl-top-separator">|</span>',
    '<span id="slTopDate" class="sl-top-date"></span>',
    '<span class="sl-top-separator">|</span>',
    '<span id="slTopWeather" class="sl-top-weather"></span>'
  ].join("");
  topbar.insertBefore(topStatus, topbarActions || null);

  const ambientPanel = makeElement("div", "sl-ambient-clock-panel", "slAmbientClockPanel");
  ambientPanel.setAttribute("aria-hidden", "true");
  ambientPanel.innerHTML = [
    '<div id="slAmbientTime" class="sl-ambient-time"></div>',
    '<div class="sl-ambient-weather-row">',
      '<span id="slAmbientWeatherIcon" class="sl-ambient-weather-icon"></span>',
      '<span id="slAmbientTemperature" class="sl-ambient-temperature"></span>',
    '</div>',
    '<div id="slAmbientLocation" class="sl-ambient-location">Bahrain</div>',
    '<div id="slAmbientDate" class="sl-ambient-date"></div>'
  ].join("");
  playerCard.insertBefore(ambientPanel, coverWrap);

  const miniArtWrap = makeElement("div", "sl-mini-station-art", "slMiniStationArtWrap");
  miniArtWrap.setAttribute("aria-hidden", "true");
  const miniArt = makeElement("img", "", "slMiniStationArt");
  miniArt.alt = "";
  miniArtWrap.appendChild(miniArt);
  playerTop.insertBefore(miniArtWrap, playerTop.firstChild);

  const topClock = document.getElementById("slTopClock");
  const topDate = document.getElementById("slTopDate");
  const topWeather = document.getElementById("slTopWeather");
  const ambientTime = document.getElementById("slAmbientTime");
  const ambientWeatherIcon = document.getElementById("slAmbientWeatherIcon");
  const ambientTemperature = document.getElementById("slAmbientTemperature");
  const ambientLocation = document.getElementById("slAmbientLocation");
  const ambientDate = document.getElementById("slAmbientDate");

  function currentWeather() {
    let storageValue = null;
    try { storageValue = root.localStorage.getItem("alainaWeather"); } catch (_) {}
    return readWeatherSnapshot({
      chipTemp: weatherChipTemp ? weatherChipTemp.textContent : "",
      chipIcon: weatherChipIcon ? weatherChipIcon.textContent : "",
      storageValue,
      now: Date.now()
    });
  }

  function syncStationArt() {
    const src = coverArt.currentSrc || coverArt.getAttribute("src") || "";
    if (src && miniArt.getAttribute("src") !== src) miniArt.setAttribute("src", src);
  }

  function updateDashboardText() {
    const now = new Date();
    const weather = currentWeather();
    const clock = formatClock(now);
    const compactDate = formatCompactDate(now);
    const longDate = formatDateLabel(now);

    topClock.textContent = clock;
    topDate.textContent = compactDate;
    topWeather.textContent = (weather.icon ? weather.icon + " " : "") + weather.temp;

    ambientTime.textContent = clock;
    ambientWeatherIcon.textContent = weather.icon;
    ambientTemperature.textContent = weather.temp;
    ambientLocation.textContent = weather.location;
    ambientDate.textContent = longDate;
    syncStationArt();
  }

  function setActiveView() {
    if (!detectDevice()) return;
    html.classList.add("sl-dashboard-device", "sl-dashboard-focus");
    html.classList.remove("sl-dashboard-ambient");
    ambientPanel.setAttribute("aria-hidden", "true");
    topStatus.setAttribute("aria-hidden", "false");
    updateDashboardText();
  }

  function setAmbientView() {
    if (!detectDevice()) return;
    html.classList.add("sl-dashboard-device", "sl-dashboard-focus", "sl-dashboard-ambient");
    ambientPanel.setAttribute("aria-hidden", "false");
    topStatus.setAttribute("aria-hidden", "true");
    updateDashboardText();
  }

  function leaveDashboardFocus() {
    controller.cancel();
    html.classList.remove("sl-dashboard-focus", "sl-dashboard-ambient");
    ambientPanel.setAttribute("aria-hidden", "true");
    topStatus.setAttribute("aria-hidden", "true");
  }

  const controller = createIdleController({
    delayMs: IDLE_MS,
    onActive: setActiveView,
    onIdle: setAmbientView
  });

  function activateSoon() {
    if (!detectDevice()) return;
    root.setTimeout(function () { controller.activate(); }, 0);
  }

  function interaction() {
    if (!detectDevice()) return;
    controller.interact();
  }

  stations.forEach(function (card) {
    card.addEventListener("click", activateSoon);
  });

  [prevButton, nextButton, playButton].forEach(function (button) {
    if (button) button.addEventListener("click", function () {
      if (controller.isEngaged()) interaction();
      else activateSoon();
    });
  });

  playerCard.addEventListener("pointerdown", function (event) {
    if (showStationsButton && showStationsButton.contains(event.target)) return;
    if (controller.isEngaged()) interaction();
  }, { passive: true });

  if (showStationsButton) {
    showStationsButton.addEventListener("click", function () {
      leaveDashboardFocus();
    });
  }

  [primaryAudio, standbyAudio].forEach(function (audio) {
    if (!audio) return;
    audio.addEventListener("playing", function () {
      if (!controller.isEngaged()) activateSoon();
    });
  });

  const artObserver = new MutationObserver(syncStationArt);
  artObserver.observe(coverArt, { attributes: true, attributeFilter: ["src"] });

  function reevaluateDevice() {
    const capable = detectDevice();
    html.classList.toggle("sl-dashboard-device", capable);
    if (!capable) leaveDashboardFocus();
    updateDashboardText();
  }

  root.addEventListener("resize", reevaluateDevice, { passive: true });
  root.addEventListener("orientationchange", reevaluateDevice, { passive: true });

  updateDashboardText();
  reevaluateDevice();
  root.setInterval(updateDashboardText, 1000);
})(typeof window !== "undefined" ? window : (typeof globalThis !== "undefined" ? globalThis : this));
