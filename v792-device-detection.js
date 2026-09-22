(function (root) {
  "use strict";

  function isSilkLike(info) {
    const ua = String((info && info.userAgent) || "");
    return Boolean(
      (info && (info.isSilk || info.isSilkClass)) ||
      /\bSilk\//i.test(ua) ||
      /AmazonWebAppPlatform/i.test(ua) ||
      /\bKF[A-Z0-9]{2,}\b/i.test(ua)
    );
  }

  function isMobileOrEcho(info) {
    const ua = String((info && info.userAgent) || "");
    const touchPoints = Number(info && info.maxTouchPoints) || 0;

    if (isSilkLike(info)) return true;

    return /Android|iPhone|iPad|iPod/i.test(ua) ||
      (/Macintosh/i.test(ua) && touchPoints > 1);
  }

  function isDashboardDevice(info) {
    const width = Number(info && info.width) || 0;
    const height = Number(info && info.height) || 0;
    const landscape = width > height;

    if (!landscape || width < 600) return false;

    if (info && info.forceDashboard) return true;
    if (isSilkLike(info)) return true;

    // Avoid large phones while allowing normal landscape tablets,
    // including DeX/desktop-style tablet browsers.
    if (height < 480) return false;

    const ua = String((info && info.userAgent) || "");
    const touchPoints = Number(info && info.maxTouchPoints) || 0;
    const coarse = Boolean(info && info.coarsePointer);

    const tabletUa = /iPad|Android|Tablet|Kindle|KF[A-Z0-9]+/i.test(ua);
    const ipadDesktopUa = /Macintosh/i.test(ua) && touchPoints > 1;
    const touchTablet = touchPoints > 0 && coarse;

    return width >= 700 && width <= 1800 &&
      (tabletUa || ipadDesktopUa || touchTablet);
  }

  const api = { isDashboardDevice, isMobileOrEcho, isSilkLike };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  if (root) {
    root.AlainaXSenairaDashboardDetection = api;
  }
})(typeof window !== "undefined" ? window : (typeof globalThis !== "undefined" ? globalThis : this));
