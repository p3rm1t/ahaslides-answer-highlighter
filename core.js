(function (root) {
  "use strict";

  const text = value => String(value ?? "").replace(/\s+/g, " ").trim();

  function codeFromUrl(raw) {
    const url = new URL(raw);
    if (url.hostname !== "audience.ahaslides.com") return null;
    const parts = url.pathname.split("/").filter(Boolean);
    return parts.length === 1 && /^[a-z0-9]+$/i.test(parts[0]) ? parts[0] : null;
  }

  function normalizeSlide(payload) {
    if (!payload || typeof payload !== "object" || payload.id == null) {
      throw new Error(payload?.encrypted ? "接口返回了加密数据，当前版本尚未支持。" : "接口未返回当前题目。");
    }
    const options = (payload.SlideOptions || []).filter(option => !option.deleted).map(option => ({
      id: String(option.id ?? ""),
      title: text(option.title),
      image: typeof option.imageCropped === "string" ? option.imageCropped : typeof option.image === "string" ? option.image : "",
      correct: option.correct === true,
    })).filter(option => option.title || option.image);
    let alternatives = payload.otherCorrectQuiz || [];
    if (typeof alternatives === "string") {
      try { alternatives = JSON.parse(alternatives); } catch { alternatives = [alternatives]; }
    }
    if (!Array.isArray(alternatives)) alternatives = [alternatives];
    const answers = [...new Set([payload.correctQuizTypeAnswer, ...alternatives].map(text).filter(Boolean))];
    return {
      id: String(payload.id),
      title: text(payload.title),
      type: payload.type,
      choice: ["pickAnswer", "multipleChoice", "imageChoice"].includes(payload.type),
      presenting: payload.presentation?.presenting,
      question: payload.questionIndex,
      total: payload.questionCount,
      options,
      answers,
    };
  }

  // No index matching: the host can shuffle each participant's options.
  function matchOptions(options, visible) {
    if (!visible.length || visible.length !== options.length) return null;
    const used = new Set();
    const result = [];
    for (const item of visible) {
      let candidates = item.id ? options.filter(option => option.id === item.id) : [];
      if (!candidates.length && item.title) candidates = options.filter(option => text(option.title) === text(item.title));
      if (!candidates.length && item.image) candidates = options.filter(option => option.image === item.image);
      if (!candidates.length || candidates.some(option => option.correct !== candidates[0].correct)) return null;
      const option = candidates.find(candidate => !used.has(candidate));
      if (!option) return null;
      used.add(option);
      result.push(option.correct);
    }
    return result;
  }

  function pollDelay(slide, failed = false) {
    return !failed && slide?.type === "leaderboard" ? 0 : 1500;
  }

  const api = { text, codeFromUrl, normalizeSlide, matchOptions, pollDelay };
  root.AhaQuiz = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(globalThis);
