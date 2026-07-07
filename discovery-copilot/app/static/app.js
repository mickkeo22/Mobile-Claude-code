/* MK Discovery Copilot — sidebar app (vanilla JS, three states). */
"use strict";

const $ = (id) => document.getElementById(id);
const states = { intake: $("state-intake"), live: $("state-live"), report: $("state-report") };

const S = {
  sessionId: null,
  businessName: "",
  areas: [],            // [{id,label,why,questions}]
  coverage: { areas: {}, notable: [] },
  suggestions: [],      // newest first, max 3
  startedAt: null,
  timerHandle: null,
  clientPath: "",
  followupUrl: null,
  consultantSpeaker: 0, // which diarized speaker is Mick
  ws: null,
  state: "intake",
};

function show(name) {
  S.state = name;
  for (const [k, el] of Object.entries(states)) el.classList.toggle("hidden", k !== name);
}

/* ── bootstrap ─────────────────────────────────────────────────── */

async function api(path, opts = {}) {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `${res.status} ${res.statusText}`);
  return data;
}

async function boot() {
  connectWS();
  let b;
  try {
    b = await api("/api/bootstrap");
  } catch (e) {
    $("audio-hint").textContent = "Could not reach the local server: " + e.message;
    return;
  }
  fillIndustries(b.industries || []);
  fillDevices(b.devices || { devices: [] });
  renderSessionsList(b.sessions || []);
  renderFramework(b.areas || []);
  if (b.live) restoreLive(b.live);
}

function fillIndustries(overlays) {
  const sel = $("f-industry");
  for (const o of overlays) {
    const opt = document.createElement("option");
    opt.value = o.id;
    opt.textContent = o.label;
    sel.insertBefore(opt, sel.lastElementChild);
  }
}

function fillDevices(info) {
  const sel = $("f-audio");
  sel.innerHTML = "";
  const add = (value, label) => {
    const o = document.createElement("option");
    o.value = value; o.textContent = label;
    sel.appendChild(o);
    return o;
  };
  for (const d of info.devices) {
    const o = add("dev:" + d.index, "🎙 " + d.name);
    if (d.default) o.selected = true;
  }
  add("upload", "⬆ Upload a recording (transcribe + report)");
  add("none", "∅ No audio (demo / replay mode)");
  if (!info.devices.length) {
    $("audio-hint").textContent = info.error
      ? "No audio devices available (" + info.error + "). Upload and demo modes still work."
      : "No input devices found — check the README for BlackHole (macOS) / VB-Cable (Windows) setup.";
  } else {
    $("audio-hint").textContent =
      "In-person: pick the laptop mic. Zoom: pick your loopback device (BlackHole / VB-Cable) — " +
      "or just use the mic with speakers on (zero-setup fallback).";
  }
}

function renderSessionsList(sessions) {
  const wrap = $("sessions-list");
  wrap.innerHTML = "";
  if (!sessions.length) { wrap.innerHTML = '<p class="hint">None yet.</p>'; return; }
  for (const s of sessions) {
    const div = document.createElement("div");
    div.className = "sess";
    const acts = [];
    if (s.has_report) {
      acts.push(`<a href="/api/sessions/${s.id}/files/report_client.html" target="_blank">Report</a>`);
      acts.push(`<a href="/api/sessions/${s.id}/files/report_internal.md" target="_blank">Notes</a>`);
    }
    if (s.has_transcript) {
      acts.push(`<button data-gen="${s.id}" data-name="${escapeHtml(s.business_name)}">${s.has_report ? "Re-gen" : "Generate"}</button>`);
    }
    if (s.has_audio) {
      acts.push(`<button data-rescue="${s.id}" data-name="${escapeHtml(s.business_name)}" title="Re-transcribe audio.wav (rescues the call after a transcription outage), then generate">Rescue</button>`);
    }
    div.innerHTML = `
      <div><div class="nm">${escapeHtml(s.business_name)} ${s.is_sample ? '<span class="sample-tag">SAMPLE</span>' : ""}</div>
      <div class="dt">${escapeHtml(s.created_at || s.id)}</div></div>
      <div class="acts">${acts.join("")}</div>`;
    wrap.appendChild(div);
  }
  wrap.querySelectorAll("button[data-gen]").forEach((btn) => {
    btn.addEventListener("click", () => {
      S.sessionId = btn.dataset.gen;
      S.businessName = btn.dataset.name || btn.dataset.gen;
      startGeneration();
    });
  });
  wrap.querySelectorAll("button[data-rescue]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!confirm("Re-transcribe this session's saved audio and regenerate the report?\n(The current transcript is kept as transcript.jsonl.bak.)")) return;
      S.sessionId = btn.dataset.rescue;
      S.businessName = btn.dataset.name || btn.dataset.rescue;
      show("report");
      $("report-title").textContent = "Rescuing session…";
      $("report-progress").classList.remove("hidden");
      $("report-links").classList.add("hidden");
      $("report-error").classList.add("hidden");
      $("retry-report").classList.add("hidden");
      $("report-phase").textContent = "Re-transcribing saved audio…";
      try {
        const r = await api(`/api/sessions/${S.sessionId}/retranscribe`, { method: "POST" });
        $("report-phase").textContent = `Transcribed ${r.words} words — generating…`;
        startGeneration();
      } catch (e) {
        onReportError({ detail: "Rescue failed: " + e.message });
      }
    });
  });
}

function renderFramework(areas) {
  const wrap = $("framework-list");
  wrap.innerHTML = "";
  for (const a of areas) {
    const d = document.createElement("div");
    d.className = "fw-area";
    d.innerHTML = `<div class="fw-label">${escapeHtml(a.label)}</div>
      <div class="fw-why">${escapeHtml(a.why)}</div>
      <ul>${a.questions.slice(0, 6).map((q) => `<li>${escapeHtml(q)}</li>`).join("")}</ul>`;
    wrap.appendChild(d);
  }
}

/* ── websocket ─────────────────────────────────────────────────── */

function connectWS() {
  const url = (location.protocol === "https:" ? "wss://" : "ws://") + location.host + "/ws";
  const ws = new WebSocket(url);
  S.ws = ws;
  ws.onmessage = (ev) => {
    let msg;
    try { msg = JSON.parse(ev.data); } catch { return; }
    handleMessage(msg);
  };
  ws.onclose = () => setTimeout(connectWS, 2000);
  ws.onerror = () => ws.close();
  setInterval(() => { if (ws.readyState === 1) ws.send("ping"); }, 20000);
}

function handleMessage(msg) {
  switch (msg.type) {
    case "live_state": restoreLive(msg); break;
    case "transcript_final": addTranscriptLine(msg.seg); break;
    case "transcript_interim": $("interim").textContent = msg.text; break;
    case "analysis": applyAnalysis(msg); break;
    case "coverage": S.coverage = msg.coverage; renderPills(); renderNotable([]); break;
    case "level": $("level-bar").style.width = Math.min(100, msg.peak * 130) + "%"; break;
    case "status": showStatus(msg); break;
    case "report_progress": onReportProgress(msg); break;
    case "report_done": onReportDone(msg); break;
    case "report_error": onReportError(msg); break;
  }
}

function showStatus(msg) {
  const el = $("status-line");
  if (msg.phase === "live") { el.classList.add("hidden"); return; }
  el.textContent = msg.detail || msg.phase;
  el.classList.remove("hidden");
}

/* ── intake → start ────────────────────────────────────────────── */

$("intake-form").addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const business = $("f-business").value.trim();
  if (!business) return;
  const audioChoice = $("f-audio").value;
  $("start-btn").disabled = true;
  try {
    const created = await api("/api/sessions", {
      method: "POST",
      body: JSON.stringify({
        business_name: business,
        contact_name: $("f-contact").value.trim(),
        industry: $("f-industry").value,
        industry_detail: $("f-industry-detail").value.trim(),
        meeting_source: $("f-source").value,
        notes: $("f-notes").value.trim(),
        audio_source: audioChoice.startsWith("dev:") ? "mic" : audioChoice,
      }),
    });
    S.sessionId = created.id;
    S.businessName = business;

    if (audioChoice === "upload") { $("upload-input").click(); return; }

    const body = audioChoice === "none"
      ? { with_audio: false }
      : { with_audio: true, device_index: parseInt(audioChoice.slice(4), 10) };
    const snap = await api(`/api/sessions/${S.sessionId}/start`, {
      method: "POST", body: JSON.stringify(body),
    });
    restoreLive(snap);
  } catch (e) {
    alert("Could not start: " + e.message);
  } finally {
    $("start-btn").disabled = false;
  }
});

$("upload-input").addEventListener("change", async () => {
  const file = $("upload-input").files[0];
  if (!file || !S.sessionId) return;
  show("report");
  $("report-title").textContent = "Processing recording…";
  $("report-phase").textContent = "Uploading + transcribing " + file.name + "…";
  $("report-progress").classList.remove("hidden");
  try {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(`/api/sessions/${S.sessionId}/upload`, { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || res.statusText);
    startGeneration();
  } catch (e) {
    onReportError({ detail: "Upload failed: " + e.message });
  }
  $("upload-input").value = "";
});

/* ── mic test ──────────────────────────────────────────────────── */

$("mic-test-btn").addEventListener("click", async () => {
  const choice = $("f-audio").value;
  const out = $("mic-test-result");
  out.className = "";
  if (!choice.startsWith("dev:")) { out.textContent = "Pick a real input device first."; return; }
  $("mic-test-btn").disabled = true;
  out.textContent = "Recording 5 seconds — say something…";
  try {
    const r = await api("/api/mictest", {
      method: "POST",
      body: JSON.stringify({ device_index: parseInt(choice.slice(4), 10) }),
    });
    out.className = "ok";
    out.textContent = r.text ? `Heard: “${r.text}”` : `Recorded (peak ${r.peak}) but heard no words.`;
    if (r.hint) { out.className = "bad"; out.textContent += " — " + r.hint; }
  } catch (e) {
    out.className = "bad";
    out.textContent = e.message;
  } finally {
    $("mic-test-btn").disabled = false;
  }
});

/* ── live state ────────────────────────────────────────────────── */

function restoreLive(snap) {
  S.sessionId = snap.session_id;
  S.businessName = snap.business_name;
  S.areas = snap.areas || [];
  S.coverage = snap.coverage || { areas: {}, notable: [] };
  S.consultantSpeaker = snap.consultant_speaker ?? 0;
  renderMeToggle();
  S.startedAt = snap.started_at ? snap.started_at * 1000 : Date.now();
  $("live-biz").textContent = S.businessName;
  $("live-overlay").textContent = snap.overlay ? snap.overlay : "core only";
  renderPills();
  renderNotable([]);
  show("live");
  if (S.timerHandle) clearInterval(S.timerHandle);
  S.timerHandle = setInterval(tickTimer, 1000);
  tickTimer();
}

function tickTimer() {
  const secs = Math.max(0, Math.floor((Date.now() - S.startedAt) / 1000));
  const m = String(Math.floor(secs / 60)).padStart(2, "0");
  const s = String(secs % 60).padStart(2, "0");
  $("live-timer").textContent = `${m}:${s}`;
}

function renderPills() {
  const wrap = $("coverage-pills");
  wrap.innerHTML = "";
  for (const a of S.areas) {
    const st = (S.coverage.areas[a.id] || {}).status || "untouched";
    const pill = document.createElement("button");
    pill.type = "button";
    pill.className = "pill " + st;
    pill.textContent = a.label;
    pill.title = a.why + "  (click to cycle status)";
    pill.addEventListener("click", () => cyclePill(a.id, st));
    wrap.appendChild(pill);
  }
}

async function cyclePill(areaId, current) {
  const next = { untouched: "touched", touched: "covered", covered: "untouched" }[current];
  S.coverage.areas[areaId] = { ...(S.coverage.areas[areaId] || {}), status: next, manual: true };
  renderPills();
  try {
    await api(`/api/sessions/${S.sessionId}/coverage`, {
      method: "POST", body: JSON.stringify({ area: areaId, status: next }),
    });
  } catch { /* pill will re-sync on next coverage broadcast */ }
}

function speakerChip(speaker) {
  return speaker === S.consultantSpeaker ? "You" : "S" + speaker;
}

function addTranscriptLine(seg) {
  const wrap = $("transcript");
  const div = document.createElement("div");
  div.className = "tr-line spk" + (seg.speaker % 2);
  div.dataset.speaker = seg.speaker;
  div.innerHTML = `<span class="spk">${speakerChip(seg.speaker)}</span>${escapeHtml(seg.text)}`;
  wrap.appendChild(div);
  wrap.scrollTop = wrap.scrollHeight;
  $("interim").textContent = "";
}

function renderMeToggle() {
  document.querySelectorAll(".me-toggle button").forEach((b) => {
    b.classList.toggle("active", parseInt(b.dataset.me, 10) === S.consultantSpeaker);
  });
  document.querySelectorAll("#transcript .tr-line").forEach((line) => {
    const sp = parseInt(line.dataset.speaker, 10);
    const chip = line.querySelector(".spk");
    if (chip && !Number.isNaN(sp)) chip.textContent = speakerChip(sp);
  });
}

document.querySelectorAll(".me-toggle button").forEach((btn) => {
  btn.addEventListener("click", async () => {
    S.consultantSpeaker = parseInt(btn.dataset.me, 10);
    renderMeToggle();
    if (S.sessionId) {
      api(`/api/sessions/${S.sessionId}/speaker`, {
        method: "POST", body: JSON.stringify({ speaker: S.consultantSpeaker }),
      }).catch(() => {});
    }
  });
});

function applyAnalysis(msg) {
  S.coverage = msg.coverage || S.coverage;
  renderPills();
  // suggestions: newest first, dedupe by question text, cap at 3
  for (const sug of (msg.suggestions || []).reverse()) {
    if (!S.suggestions.some((x) => x.question === sug.question)) S.suggestions.unshift(sug);
  }
  S.suggestions = S.suggestions.slice(0, 3);
  renderSuggestions();
  if (msg.move_on && msg.move_on.length) showMoveOn(msg.move_on[0]);
  renderNotable(msg.notable_new || []);
}

function renderSuggestions() {
  const wrap = $("suggestions");
  wrap.innerHTML = "";
  if (!S.suggestions.length) {
    wrap.innerHTML = '<div class="waiting" id="suggestions-waiting">Listening… suggestions appear as the conversation develops.</div>';
    return;
  }
  S.suggestions.forEach((sug, i) => {
    const areaLabel = (S.areas.find((a) => a.id === sug.area) || {}).label || sug.area;
    const card = document.createElement("div");
    card.className = "card" + (i === 0 ? " top" : "");
    card.innerHTML = `
      <div class="q">${escapeHtml(sug.question)}</div>
      <div class="why">${escapeHtml(sug.why || "")}</div>
      <div class="meta">
        <div class="tags">
          <span class="tag">${escapeHtml(areaLabel)}</span>
          <span class="tag pri-${sug.priority}">${(sug.priority || "").replace("_", " ")}</span>
        </div>
        <button class="used" data-i="${i}">Used it ✓</button>
      </div>`;
    wrap.appendChild(card);
  });
  wrap.querySelectorAll(".used").forEach((btn) =>
    btn.addEventListener("click", () => dismissSuggestion(parseInt(btn.dataset.i, 10))));
}

function dismissSuggestion(i) {
  const [sug] = S.suggestions.splice(i, 1);
  renderSuggestions();
  if (sug && S.sessionId) {
    api(`/api/sessions/${S.sessionId}/dismiss`, {
      method: "POST", body: JSON.stringify({ question: sug.question }),
    }).catch(() => {});
  }
}

let moveOnTimer = null;
function showMoveOn(text) {
  const el = $("move-on");
  el.textContent = "➜ " + text;
  el.classList.remove("hidden");
  el.onclick = () => el.classList.add("hidden");
  if (moveOnTimer) clearTimeout(moveOnTimer);
  moveOnTimer = setTimeout(() => el.classList.add("hidden"), 25000);
}

function renderNotable(newItems) {
  const all = (S.coverage.notable || []);
  for (const n of newItems) if (!all.includes(n)) all.push(n);
  S.coverage.notable = all;
  $("notable-count").textContent = all.length;
  const ul = $("notable-list");
  ul.innerHTML = all.map((n) => `<li>${escapeHtml(n)}</li>`).join("");
}

/* stop & generate */
$("stop-btn").addEventListener("click", stopAndGenerate);
async function stopAndGenerate() {
  if (!S.sessionId || S.state !== "live") return;
  $("stop-btn").disabled = true;
  try {
    await api(`/api/sessions/${S.sessionId}/stop`, { method: "POST" });
    if (S.timerHandle) clearInterval(S.timerHandle);
    show("report");
    $("report-title").textContent = "Generating report…";
    $("report-progress").classList.remove("hidden");
    $("report-links").classList.add("hidden");
    $("report-error").classList.add("hidden");
    $("retry-report").classList.add("hidden");
    $("report-phase").textContent = "Analyzing conversation…";
  } catch (e) {
    alert(e.message);
  } finally {
    $("stop-btn").disabled = false;
  }
}

/* ── report state ──────────────────────────────────────────────── */

function startGeneration() {
  show("report");
  $("report-title").textContent = "Generating report…";
  $("report-progress").classList.remove("hidden");
  $("report-links").classList.add("hidden");
  $("report-error").classList.add("hidden");
  $("retry-report").classList.add("hidden");
  $("report-phase").textContent = "Starting…";
  api(`/api/sessions/${S.sessionId}/generate`, { method: "POST" })
    .catch((e) => onReportError({ detail: e.message }));
}

function onReportProgress(msg) {
  if (msg.session_id !== S.sessionId) return;
  if (S.state !== "report") show("report");
  $("report-phase").textContent = msg.detail;
}

function onReportDone(msg) {
  if (msg.session_id !== S.sessionId) return;
  show("report");
  $("report-title").textContent = `Report ready (${msg.seconds}s)`;
  $("report-progress").classList.add("hidden");
  $("report-error").classList.add("hidden");
  $("retry-report").classList.add("hidden");
  $("report-links").classList.remove("hidden");
  $("open-client").href = msg.links.client;
  $("open-internal").href = msg.links.internal;
  $("saved-path").textContent = "sessions/" + msg.session_id;
  S.clientPath = msg.links.client_path;
  S.followupUrl = msg.links.followup || null;
  $("copy-followup").classList.toggle("hidden", !S.followupUrl);
  renderCostLine(msg.usage, msg.backend);
}

function renderCostLine(usage, backend) {
  const el = $("report-cost");
  if (!usage || !usage.input_tokens) { el.classList.add("hidden"); return; }
  const tok = (n) => (n >= 1000 ? Math.round(n / 1000) + "k" : String(n || 0));
  const money = backend === "claude_code"
    ? "$0 extra (subscription plan)"
    : "~$" + (usage.est_cost_usd || 0).toFixed(2) + " API usage";
  el.textContent = `Session usage: ${tok(usage.input_tokens)} in / ${tok(usage.output_tokens)} out tokens · ${money}`;
  el.classList.remove("hidden");
}

function onReportError(msg) {
  if (msg.session_id && msg.session_id !== S.sessionId) return;
  show("report");
  $("report-title").textContent = "Report failed";
  $("report-progress").classList.add("hidden");
  const err = $("report-error");
  err.textContent = msg.detail || "Unknown error";
  err.classList.remove("hidden");
  $("retry-report").classList.remove("hidden");
}

$("retry-report").addEventListener("click", startGeneration);

$("print-report").addEventListener("click", () => {
  const w = window.open($("open-client").href, "_blank");
  if (w) w.addEventListener("load", () => setTimeout(() => w.print(), 300));
});

$("copy-path").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(S.clientPath);
    $("copy-done").classList.remove("hidden");
    setTimeout(() => $("copy-done").classList.add("hidden"), 2500);
  } catch {
    prompt("Copy the path:", S.clientPath);
  }
});

$("copy-followup").addEventListener("click", async () => {
  if (!S.followupUrl) return;
  try {
    const text = await (await fetch(S.followupUrl)).text();
    await navigator.clipboard.writeText(text.trim());
    $("copy-done").classList.remove("hidden");
    setTimeout(() => $("copy-done").classList.add("hidden"), 2500);
  } catch (e) {
    window.open(S.followupUrl, "_blank");
  }
});

$("new-session").addEventListener("click", () => location.reload());

/* ── keyboard shortcuts (spec §6) ──────────────────────────────── */

document.addEventListener("keydown", (ev) => {
  const t = ev.target;
  if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT")) return;
  if (S.state !== "live") return;
  if (ev.code === "Space") {
    ev.preventDefault();
    if (S.suggestions.length) dismissSuggestion(0);
  } else if (ev.key === "s" || ev.key === "S") {
    ev.preventDefault();
    stopAndGenerate();
  } else if (ev.key === "n" || ev.key === "N") {
    ev.preventDefault();
    $("capture-bar").classList.remove("hidden");
    $("capture-input").focus();
  }
});

/* quick-capture nugget (N) */
$("capture-input").addEventListener("keydown", async (ev) => {
  if (ev.key === "Escape") {
    $("capture-input").value = "";
    $("capture-bar").classList.add("hidden");
    return;
  }
  if (ev.key !== "Enter") return;
  const text = $("capture-input").value.trim();
  $("capture-input").value = "";
  $("capture-bar").classList.add("hidden");
  if (!text || !S.sessionId) return;
  try {
    await api(`/api/sessions/${S.sessionId}/notable`, {
      method: "POST", body: JSON.stringify({ text }),
    });
    $("notable-wrap").open = true;  // show where it landed
  } catch (e) { /* non-fatal — the note is only lost if the session isn't live */ }
});

/* ── util ──────────────────────────────────────────────────────── */

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

boot();
