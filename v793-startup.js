(function (root) {
  "use strict";

  function isMobileOrEcho() {
    const ua = String((root.navigator && root.navigator.userAgent) || "");
    const touchPoints = Number((root.navigator && root.navigator.maxTouchPoints) || 0);
    const html = root.document && root.document.documentElement;
    const body = root.document && root.document.body;

    const helper = root.AlainaXSenairaDashboardDetection;
    if (helper && typeof helper.isMobileOrEcho === "function") {
      return helper.isMobileOrEcho({
        userAgent: ua,
        maxTouchPoints: touchPoints,
        isSilkClass: Boolean(
          (html && html.classList.contains("alaina-x-senaira-silk")) ||
          (body && body.classList.contains("alaina-x-senaira-silk"))
        )
      });
    }

    const silkClass = Boolean(
      (html && html.classList.contains("alaina-x-senaira-silk")) ||
      (body && body.classList.contains("alaina-x-senaira-silk"))
    );

    const silkUa = /\bSilk\//i.test(ua) ||
      /AmazonWebAppPlatform/i.test(ua) ||
      /\bKF[A-Z0-9]{2,}\b/i.test(ua);

    const appleMobile = /iPhone|iPad|iPod/i.test(ua) ||
      (/Macintosh/i.test(ua) && touchPoints > 1);

    const androidMobile = /Android/i.test(ua);

    return silkClass || silkUa || appleMobile || androidMobile;
  }

  function selectFirstStation() {
    const stations = Array.from(root.document.querySelectorAll(".station-card"));
    if (!stations.length) return false;

    try {
      if (typeof root.updateSelectedStation === "function") {
        root.updateSelectedStation(0);
      } else {
        stations.forEach((card, index) => {
          card.classList.toggle("active", index === 0);
        });
      }
      return true;
    } catch (_) {
      return false;
    }
  }

  function attemptPlayback() {
    try {
      if (typeof root.playCurrentStation === "function") {
        Promise.resolve(root.playCurrentStation()).catch(() => {});
        return;
      }

      const first = root.document.querySelector(".station-card");
      if (first) first.click();
    } catch (_) {}
  }

  function start() {
    if (!root.document || !isMobileOrEcho()) return;

    const params = new URLSearchParams(root.location.search);
    const hasExplicitStation = Boolean(params.get("station"));

    // Opening the base URL on phone/tablet/Echo starts from station 1.
    // Explicit deep links remain respected.
    if (!hasExplicitStation) {
      selectFirstStation();
    }

    // Browsers still control whether audible autoplay is permitted.
    // This is the strongest standards-compliant attempt we can make.
    root.setTimeout(attemptPlayback, 220);
  }

  if (!root.document) return;

  if (root.document.readyState === "loading") {
    root.document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    root.setTimeout(start, 0);
  }
})(typeof window !== "undefined" ? window : globalThis);
