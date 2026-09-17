(function (root) {
  "use strict";

  function isDashboardDevice(info) {
    const width = Number(info && info.width) || 0;
    const height = Number(info && info.height) || 0;
    const landscape = width > height;

    if (!landscape || width < 600) return false;

    if (info && info.forceDashboard) return true;
    if (info && info.isSilk) return true;

    // Keep phones out of the tablet dashboard even when their landscape
    // width is large. Tablets/Echo-style displays have a substantially
    // taller landscape viewport.
    if (height < 500) return false;

    const ua = String((info && info.userAgent) || "");
    const touchPoints = Number(info && info.maxTouchPoints) || 0;
    const coarse = Boolean(info && info.coarsePointer);

    const tabletUa = /iPad|Android|Tablet|Kindle|KF[A-Z0-9]+/i.test(ua);
    const ipadDesktopUa = /Macintosh/i.test(ua) && touchPoints > 1;
    const touchTablet = touchPoints > 0 && coarse;

    return width >= 700 && width <= 1600 && (tabletUa || ipadDesktopUa || touchTablet);
  }

  const api = { isDashboardDevice };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  if (root) {
    root.SenaishaDashboardDetection = api;
  }
})(typeof window !== "undefined" ? window : (typeof globalThis !== "undefined" ? globalThis : this));
