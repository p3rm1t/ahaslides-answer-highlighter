<img src="icons/icon128.png" width="64" height="64" alt="AhaSlides Answer Highlighter icon">

# AhaSlides Answer Highlighter

English · [简体中文](README.zh-CN.md)

A Chrome / Edge extension that highlights correct options on AhaSlides audience pages using the answer key returned by the participant API. No build step, backend, or AI API key required.

## Features

- Teal outlines and checkmarks for correct options, including multiple correct choices.
- Matches the displayed options by text, ID, or image URL, so shuffled options are supported.
- A compact panel displays answers, including accepted alternatives for typed questions.
- Updates as slides change and clears old highlights. Pause, resume, refresh, or collapse the panel at any time.

## Install

1. Download this repository as a ZIP and extract it, or clone it.
2. Open `chrome://extensions` in Chrome or `edge://extensions` in Edge.
3. Enable **Developer mode**, then click **Load unpacked**.
4. Select the folder containing `manifest.json`.
5. Open or reload your AhaSlides audience page at `https://audience.ahaslides.com/…`.

After updating the files, reload the extension on the extensions page and refresh the audience page.

## Use

Correct options are marked automatically when the question appears. Answers also appear in the bottom-right panel. The extension does not select options, fill inputs, or submit answers.

The panel currently uses Simplified Chinese labels:

| Control | Action |
| --- | --- |
| 暂停 / 继续 | Pause or resume polling and highlighting. |
| 刷新 | Fetch the current slide again. Also resumes after a presentation restarts. |
| − / + | Collapse or expand the panel while keeping it active. |
| Toolbar icon | Collapse or expand the panel. |

Polling waits 1.5 seconds after ordinary responses or failed requests. Leaderboard responses trigger the next request immediately. Polling stops when the presentation ends.

## Supported pages and limits

- Supports `.com` audience pages. Short join links work after redirecting to the audience site.
- Choice questions are highlighted; typed answers appear in the panel. Image options require a matching option ID or image URL.
- Match-pairs and ordering highlights, `.eu` pages, presenter/editor pages, and encrypted API responses are not supported.
- Answers reflect the author's configured key. If the API does not provide an answer, the extension leaves it unknown.
- Browser throttling can delay polling in background tabs.
