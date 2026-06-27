/* Aether embeddable chat widget — self-contained, no dependencies.
   Usage: <script src="https://app.example.com/widget.js" data-client="your-slug" async></script> */
(function () {
  "use strict";

  var script =
    document.currentScript ||
    (function () {
      var s = document.getElementsByTagName("script");
      return s[s.length - 1];
    })();

  var CLIENT = (script && script.getAttribute("data-client")) || "";
  var API =
    (script && script.getAttribute("data-api")) ||
    (function () {
      try {
        return new URL(script.src).origin;
      } catch (e) {
        return "";
      }
    })();

  if (window.__aetherWidgetLoaded) return;
  window.__aetherWidgetLoaded = true;

  var cfg = {
    name: "AI Assistant",
    brandColor: "#6366f1",
    greeting: "Hi! How can I help you today?",
  };
  var messages = []; // {role, content}
  var open = false;
  var sending = false;

  // Scoped container with shadow DOM for style isolation.
  var host = document.createElement("div");
  host.setAttribute("aria-live", "polite");
  document.body.appendChild(host);
  var root = host.attachShadow ? host.attachShadow({ mode: "open" }) : host;

  function styleEl() {
    var c = cfg.brandColor;
    var css =
      ":host,*{box-sizing:border-box;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif}" +
      ".bubble{position:fixed;bottom:20px;right:20px;width:60px;height:60px;border-radius:50%;background:" +
      c +
      ";color:#fff;border:none;cursor:pointer;box-shadow:0 6px 24px rgba(0,0,0,.25);z-index:2147483000;display:flex;align-items:center;justify-content:center;font-size:26px}" +
      ".bubble:focus{outline:3px solid rgba(0,0,0,.2)}" +
      ".panel{position:fixed;bottom:90px;right:20px;width:370px;max-width:calc(100vw - 32px);height:540px;max-height:calc(100vh - 120px);background:#fff;border-radius:16px;box-shadow:0 12px 48px rgba(0,0,0,.28);z-index:2147483000;display:flex;flex-direction:column;overflow:hidden}" +
      ".hdr{background:" +
      c +
      ";color:#fff;padding:14px 16px;display:flex;align-items:center;justify-content:space-between}" +
      ".hdr b{font-size:15px}" +
      ".x{background:transparent;border:none;color:#fff;font-size:22px;cursor:pointer;line-height:1;padding:0 4px}" +
      ".body{flex:1;overflow-y:auto;padding:14px;background:#f7f7f9}" +
      ".msg{max-width:85%;padding:9px 12px;border-radius:14px;margin-bottom:10px;font-size:14px;line-height:1.45;white-space:pre-wrap;word-wrap:break-word}" +
      ".user{margin-left:auto;background:" +
      c +
      ";color:#fff;border-bottom-right-radius:4px}" +
      ".bot{background:#fff;color:#111;border:1px solid #eee;border-bottom-left-radius:4px}" +
      ".foot{border-top:1px solid #eee;padding:8px;display:flex;gap:8px;background:#fff}" +
      ".foot input{flex:1;border:1px solid #ddd;border-radius:10px;padding:10px;font-size:14px;outline:none}" +
      ".foot input:focus{border-color:" +
      c +
      "}" +
      ".send{background:" +
      c +
      ";color:#fff;border:none;border-radius:10px;padding:0 14px;cursor:pointer;font-size:14px}" +
      ".send:disabled{opacity:.5;cursor:default}" +
      ".pw{text-align:center;font-size:11px;color:#999;padding:6px}" +
      ".pw a{color:#999;text-decoration:none}" +
      "@media(max-width:480px){.panel{width:100vw;height:100vh;max-height:100vh;bottom:0;right:0;border-radius:0}.bubble{bottom:16px;right:16px}}";
    var el = document.createElement("style");
    el.textContent = css;
    return el;
  }

  var els = {};

  function render() {
    root.innerHTML = "";
    root.appendChild(styleEl());

    var bubble = document.createElement("button");
    bubble.className = "bubble";
    bubble.setAttribute("aria-label", open ? "Close chat" : "Open chat");
    bubble.innerHTML = open ? "&times;" : "&#128172;";
    bubble.onclick = toggle;
    root.appendChild(bubble);

    if (!open) return;

    var panel = document.createElement("div");
    panel.className = "panel";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", cfg.name + " chat");

    var hdr = document.createElement("div");
    hdr.className = "hdr";
    var title = document.createElement("b");
    title.textContent = cfg.name;
    var x = document.createElement("button");
    x.className = "x";
    x.setAttribute("aria-label", "Close chat");
    x.innerHTML = "&times;";
    x.onclick = toggle;
    hdr.appendChild(title);
    hdr.appendChild(x);

    var body = document.createElement("div");
    body.className = "body";
    els.body = body;

    var foot = document.createElement("form");
    foot.className = "foot";
    var input = document.createElement("input");
    input.type = "text";
    input.placeholder = "Type your message…";
    input.setAttribute("aria-label", "Message");
    els.input = input;
    var send = document.createElement("button");
    send.className = "send";
    send.type = "submit";
    send.textContent = "Send";
    els.send = send;
    foot.appendChild(input);
    foot.appendChild(send);
    foot.onsubmit = function (e) {
      e.preventDefault();
      submit();
    };

    var pw = document.createElement("div");
    pw.className = "pw";
    pw.innerHTML =
      'Powered by <a href="' +
      (API || "#") +
      '" target="_blank" rel="noopener">Aether</a>';

    panel.appendChild(hdr);
    panel.appendChild(body);
    panel.appendChild(foot);
    panel.appendChild(pw);
    root.appendChild(panel);

    paintMessages();
    setTimeout(function () {
      input.focus();
    }, 50);
  }

  function paintMessages() {
    if (!els.body) return;
    els.body.innerHTML = "";
    messages.forEach(function (m) {
      var d = document.createElement("div");
      d.className = "msg " + (m.role === "user" ? "user" : "bot");
      d.textContent = m.content;
      els.body.appendChild(d);
    });
    els.body.scrollTop = els.body.scrollHeight;
  }

  function toggle() {
    open = !open;
    render();
    if (open && messages.length === 0) {
      messages.push({ role: "assistant", content: cfg.greeting });
      paintMessages();
    }
  }

  function submit() {
    if (sending) return;
    var text = (els.input.value || "").trim();
    if (!text) return;
    els.input.value = "";
    messages.push({ role: "user", content: text });
    paintMessages();
    stream();
  }

  function stream() {
    sending = true;
    if (els.send) els.send.disabled = true;
    // History excludes the local greeting (assistant-first) for a clean turn.
    var history = messages.filter(function (m, i) {
      return !(i === 0 && m.role === "assistant");
    });
    var botIdx = messages.push({ role: "assistant", content: "" }) - 1;
    paintMessages();

    fetch(API + "/api/widget/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId: CLIENT, messages: history }),
    })
      .then(function (res) {
        if (!res.ok || !res.body) throw new Error("bad response");
        var reader = res.body.getReader();
        var decoder = new TextDecoder();
        function pump() {
          return reader.read().then(function (r) {
            if (r.done) return;
            messages[botIdx].content += decoder.decode(r.value, {
              stream: true,
            });
            paintMessages();
            return pump();
          });
        }
        return pump();
      })
      .catch(function () {
        messages[botIdx].content =
          "Sorry, I couldn't connect right now. Please try again in a moment.";
        paintMessages();
      })
      .then(function () {
        sending = false;
        if (els.send) els.send.disabled = false;
        if (els.input) els.input.focus();
      });
  }

  function loadConfig() {
    if (!API) {
      render();
      return;
    }
    fetch(API + "/api/widget/config?client=" + encodeURIComponent(CLIENT))
      .then(function (r) {
        return r.ok ? r.json() : null;
      })
      .then(function (data) {
        if (data) {
          cfg.name = data.name || cfg.name;
          cfg.brandColor = data.brandColor || cfg.brandColor;
          cfg.greeting = data.greeting || cfg.greeting;
        }
      })
      .catch(function () {})
      .then(function () {
        render();
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", loadConfig);
  } else {
    loadConfig();
  }
})();
