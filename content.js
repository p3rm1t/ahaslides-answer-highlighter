(() => {
  "use strict";
  let code = AhaQuiz.codeFromUrl(location.href);

  const OPTION = '[data-testid="audience-quiz-option"], .options-pick-answer .option-item';
  const host = document.createElement("div");
  host.id = "aha-answer-helper";
  host.style.cssText = "position:fixed!important;right:16px!important;bottom:16px!important;z-index:2147483647!important;";
  const ui = host.attachShadow({ mode: "open" });
  // Static markup only; all response data is inserted with textContent.
  ui.innerHTML = `<style>
    :host{all:initial;color-scheme:light;font-family:"PingFang SC","Microsoft YaHei",Arial,sans-serif;color:#16324f}
    *{box-sizing:border-box}button{font:inherit;cursor:pointer}button:focus-visible{outline:2px solid #2663c7;outline-offset:3px}
    section{width:300px;max-width:calc(100vw - 32px);background:#fff;border:1px solid #c6d5e4;border-radius:12px;box-shadow:0 6px 24px #16324f26;overflow:hidden}
    header{display:flex;align-items:center;gap:8px;padding:12px 14px;border-bottom:1px solid #e5edf4;font-size:13px;font-weight:650}
    .mark{display:grid;place-items:center;width:24px;height:24px;border-radius:7px;background:#d7fff0;color:#00634e;font-weight:800;font-size:17px}
    .collapse{margin-left:auto;border:0;background:transparent;color:#526b81;padding:3px 8px;font-size:18px}
    .body{padding:14px}#status{font-size:14px;font-weight:650;line-height:1.5;margin:0 0 6px}#detail{font-size:12px;color:#526b81;line-height:1.6;margin:0;overflow-wrap:anywhere}
    #answers{padding:0;margin:10px 0 0;list-style:none;max-height:160px;overflow:auto;font-size:14px;line-height:1.6}
    #answers:empty{display:none}#answers li{border-left:3px solid #00856c;padding:4px 0 4px 9px;margin-top:5px;color:#00634e}
    footer{display:flex;align-items:center;gap:8px;margin-top:14px}footer button{border:1px solid #bfd0df;background:#f5f9fd;color:#244c72;border-radius:6px;padding:6px 11px;font-size:12px}
    #meta{margin-left:auto;font-size:11px;color:#627b90}.collapsed .body{display:none}.collapsed header{border-bottom:0}
  </style><section aria-label="AhaSlides 答案提示"><header><span class="mark" aria-hidden="true">✓</span><span>答案提示</span><button class="collapse" aria-label="收起提示" title="收起提示">−</button></header><div class="body"><p id="status" role="status">正在读取当前题目</p><p id="detail">正确选项会标出青绿色边框。</p><ul id="answers"></ul><footer><button id="pause">暂停</button><button id="refresh">刷新</button><span id="meta"></span></footer></div></section>`;
  document.documentElement.append(host);
  const status = ui.getElementById("status");
  const detail = ui.getElementById("detail");
  const answers = ui.getElementById("answers");
  const meta = ui.getElementById("meta");
  const pauseButton = ui.getElementById("pause");
  let enabled = true;
  let stopped = false;
  let slide = null;
  let timer;
  let generation = 0;
  let renderQueued = false;
  let marked = new Set();

  const clean = value => AhaQuiz.text(new DOMParser().parseFromString(String(value || ""), "text/html").body.textContent);
  const visible = element => element.getClientRects().length > 0 && getComputedStyle(element).visibility !== "hidden";

  function setText(element, value) {
    if (element.textContent !== value) element.textContent = value;
  }
  function clearHighlights() {
    for (const element of marked) element.removeAttribute("data-aha-answer");
    marked.clear();
  }
  function setAnswers(values) {
    const current = Array.from(answers.children, element => element.textContent);
    if (JSON.stringify(current) === JSON.stringify(values)) return;
    answers.replaceChildren(...values.map(value => {
      const li = document.createElement("li");
      li.textContent = value;
      return li;
    }));
  }
  function message(title, description) {
    setText(status, title);
    setText(detail, description);
  }
  function render() {
    if (!enabled || !slide || stopped) { clearHighlights(); return; }
    if (slide.type === "leaderboard") {
      clearHighlights();
      setAnswers([]);
      message("排行榜，正在等待下一题", "立即继续查询，切题后自动标注。");
      return;
    }
    const correct = slide.choice ? slide.options.filter(option => option.correct) : [];
    const heading = Array.from(document.querySelectorAll("h1.slide-title-style, h2.slide-title-style, [data-testid='audience-question-title']")).find(visible);
    if (heading && clean(heading.textContent) !== clean(slide.title)) {
      clearHighlights();
      setAnswers([]);
      message("正在同步新题目", "等待当前题目的答案，旧标记已清除。");
      return;
    }
    setAnswers(correct.length ? correct.map(option => clean(option.title) || "图片选项") : slide.answers.map(clean));
    if (!correct.length) {
      clearHighlights();
      if (slide.answers.length) message("已读取文字答案", "答案列在下方，可手动填写。");
      else message("当前页面未提供答案", "等待下一题，或点击刷新重新读取。");
      return;
    }
    const elements = Array.from(document.querySelectorAll(OPTION)).filter(visible);
    const descriptors = elements.map(element => ({
      id: element.getAttribute("data-option-id") || element.getAttribute("data-id") || element.id || "",
      title: AhaQuiz.text((element.querySelector(".aha-option__label, .option-title") || element).textContent),
      image: element.querySelector(".aha-option__image, img[alt='option']")?.getAttribute("src") || "",
    }));
    const normalized = slide.options.map(option => ({ ...option, title: clean(option.title) }));
    const matches = AhaQuiz.matchOptions(normalized, descriptors);
    const next = new Set(matches ? elements.filter((_, index) => matches[index]) : []);
    for (const element of marked) if (!next.has(element)) element.removeAttribute("data-aha-answer");
    for (const element of next) if (element.getAttribute("data-aha-answer") !== "correct") element.setAttribute("data-aha-answer", "correct");
    marked = next;
    message(next.size ? `已高亮 ${next.size} 个正确选项` : "已读取答案，等待页面同步", next.size ? "青绿色边框与 ✓ 标记表示正确选项。" : "页面题目和选项匹配后才会标注，答案列在下方。");
  }

  async function poll() {
    if (!enabled || stopped) return;
    const currentCode = AhaQuiz.codeFromUrl(location.href);
    if (currentCode !== code) { navigate(currentCode); return; }
    const turn = generation;
    let failed = false;
    try {
      const result = await chrome.runtime.sendMessage({ type: "AHA_FETCH_SLIDE", code });
      if (turn !== generation || !enabled) return;
      if (AhaQuiz.codeFromUrl(location.href) !== code) { navigate(AhaQuiz.codeFromUrl(location.href)); return; }
      if (!result || result.error) throw new Error(result?.error || "扩展连接已断开，请刷新网页");
      slide = result.slide;
      setText(meta, slide.question && slide.type !== "leaderboard" ? `${slide.question} / ${slide.total || "?"}` : "");
      if (slide.presenting === false) {
        stopped = true;
        clearHighlights();
        setAnswers([]);
        message("演示已停止", "如主持人重新开始，请点击刷新。");
        return;
      }
      render();
    } catch (error) {
      if (turn !== generation || !enabled) return;
      failed = true;
      slide = null;
      clearHighlights();
      setAnswers([]);
      message("暂时无法读取，正在重试", error.message);
    }
    if (turn === generation && enabled && !stopped) timer = setTimeout(poll, AhaQuiz.pollDelay(slide, failed));
  }

  function refresh() {
    generation++;
    clearTimeout(timer);
    stopped = false;
    slide = null;
    clearHighlights();
    setAnswers([]);
    if (!enabled) { enabled = true; setText(pauseButton, "暂停"); }
    message("正在读取当前题目", "正确选项会标出青绿色边框。");
    if (code) poll();
  }
  function navigate(nextCode) {
    code = nextCode;
    if (enabled) {
      refresh();
      if (!code) message("等待打开测验", "进入 AhaSlides 参与者页面后自动开始。");
    }
  }
  pauseButton.addEventListener("click", () => {
    enabled = !enabled;
    generation++;
    clearTimeout(timer);
    clearHighlights();
    setText(pauseButton, enabled ? "暂停" : "继续");
    if (enabled) refresh();
    else { slide = null; setAnswers([]); message("已暂停", "点击继续以恢复答案提示。"); }
  });
  ui.getElementById("refresh").addEventListener("click", refresh);
  function togglePanel() {
    const collapsed = ui.querySelector("section").classList.toggle("collapsed");
    const button = ui.querySelector(".collapse");
    setText(button, collapsed ? "+" : "−");
    button.setAttribute("aria-label", collapsed ? "展开提示" : "收起提示");
    button.title = collapsed ? "展开提示" : "收起提示";
  }
  ui.querySelector(".collapse").addEventListener("click", togglePanel);
  chrome.runtime.onMessage.addListener(message => {
    if (message?.type === "AHA_TOGGLE_PANEL") togglePanel();
  });
  const observer = new MutationObserver(records => {
    const currentCode = AhaQuiz.codeFromUrl(location.href);
    if (currentCode !== code) { navigate(currentCode); return; }
    // Ignore our own attributes/panel to avoid feeding the observer with its changes.
    if (renderQueued || !records.some(record => record.target !== host && !host.contains(record.target))) return;
    renderQueued = true;
    requestAnimationFrame(() => { renderQueued = false; render(); });
  });
  observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["class", "style", "src", "data-option-id", "data-id"] });
  window.addEventListener("pagehide", () => { generation++; clearTimeout(timer); clearHighlights(); });
  window.addEventListener("pageshow", event => { if (event.persisted && enabled) refresh(); });
  if (code) poll();
  else message("等待打开测验", "进入 AhaSlides 参与者页面后自动开始。");
})();
