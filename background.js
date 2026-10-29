"use strict";
importScripts("core.js");

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== "AHA_FETCH_SLIDE") return false;
  if (!sender.tab || new URL(sender.url).hostname !== "audience.ahaslides.com" || !/^[a-z0-9]+$/i.test(message.code)) {
    sendResponse({ error: "请在 AhaSlides 答题页面使用。" });
    return false;
  }
  (async () => {
    try {
      const response = await fetch(`https://audience.ahaslides.com/api/presentation/audience/${encodeURIComponent(message.code)}`, {
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
        headers: { Accept: "application/json" },
      });
      if (!response.ok) throw new Error(`请求失败（HTTP ${response.status}）`);
      sendResponse({ slide: AhaQuiz.normalizeSlide(await response.json()) });
    } catch (error) {
      sendResponse({ error: error.name === "TimeoutError" ? "接口请求超时" : error.message });
    }
  })();
  return true;
});

chrome.action.onClicked.addListener(tab => {
  if (tab.id) chrome.tabs.sendMessage(tab.id, { type: "AHA_TOGGLE_PANEL" }).catch(() => {});
});
