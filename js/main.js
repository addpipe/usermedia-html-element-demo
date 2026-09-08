/*
 * <usermedia> HTML element demo — addpipe.com
 *
 * Everything here is plain DOM. The point of the demo is that the element does
 * the work: we never call getUserMedia() ourselves except in the explicit
 * fallback path for browsers that don't know the tag.
 */

(function () {
  "use strict";

  var PAGE_START = performance.now();

  /* =====================================================================
     Event & error log
     ===================================================================== */

  var logPanel = document.getElementById("logPanel");
  var logRows = [];

  function elapsed() {
    var ms = performance.now() - PAGE_START;
    var s = Math.floor(ms / 1000);
    var mm = String(Math.floor(s / 60)).padStart(2, "0");
    var ss = String(s % 60).padStart(2, "0");
    var mss = String(Math.floor(ms % 1000)).padStart(3, "0");
    return mm + ":" + ss + "." + mss;
  }

  function log(level, message, detail) {
    var time = elapsed();
    logRows.push({ time: time, level: level, message: message, detail: detail });

    var empty = logPanel.querySelector(".log-empty");
    if (empty) empty.remove();

    var row = document.createElement("div");
    row.className = "log-row level-" + level;

    var t = document.createElement("span");
    t.className = "log-time";
    t.textContent = time;

    var l = document.createElement("span");
    l.className = "log-level";
    l.textContent = level;

    var m = document.createElement("span");
    m.className = "log-message";
    m.textContent = message;

    row.appendChild(t);
    row.appendChild(l);
    row.appendChild(m);

    if (detail !== undefined && detail !== null && detail !== "") {
      var d = document.createElement("p");
      d.className = "log-detail";
      d.textContent = typeof detail === "string" ? detail : safeJson(detail);
      row.appendChild(d);
    }

    var pinned = logPanel.scrollTop + logPanel.clientHeight >= logPanel.scrollHeight - 24;
    logPanel.appendChild(row);
    if (pinned) logPanel.scrollTop = logPanel.scrollHeight;
  }

  function safeJson(value) {
    try {
      return JSON.stringify(value, null, 2);
    } catch (err) {
      return String(value);
    }
  }

  document.querySelectorAll(".log-filters input[data-level]").forEach(function (input) {
    var apply = function () {
      logPanel.classList.toggle("hide-" + input.dataset.level, !input.checked);
    };
    input.addEventListener("change", apply);
    apply();
  });

  document.getElementById("clearLog").addEventListener("click", function () {
    logRows.length = 0;
    logPanel.innerHTML = '<p class="log-empty">No events yet.</p>';
  });

  document.getElementById("copyLog").addEventListener("click", function (event) {
    var text = logRows
      .map(function (r) {
        return r.time + "  " + r.level.toUpperCase() + "  " + r.message + (r.detail ? "\n    " + (typeof r.detail === "string" ? r.detail : safeJson(r.detail)).replace(/\n/g, "\n    ") : "");
      })
      .join("\n");
    copyToClipboard(text, event.target, "Copy log");
  });

  function copyToClipboard(text, button, restoreLabel) {
    var done = function (ok) {
      if (!button) return;
      button.textContent = ok ? "Copied" : "Copy failed";
      setTimeout(function () {
        button.textContent = restoreLabel;
      }, 1400);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        function () {
          done(true);
        },
        function () {
          done(false);
        }
      );
    } else {
      done(false);
    }
  }

  window.addEventListener("error", function (event) {
    log("error", "Uncaught page error: " + event.message, event.filename + ":" + event.lineno);
  });
  window.addEventListener("unhandledrejection", function (event) {
    log("error", "Unhandled promise rejection", String(event.reason));
  });

  /* =====================================================================
     Feature detection & environment
     ===================================================================== */

  var HAS_USERMEDIA = "HTMLUserMediaElement" in window;
  var HAS_CAMERA = "HTMLCameraElement" in window;
  var HAS_MICROPHONE = "HTMLMicrophoneElement" in window;
  var HAS_GUM = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  var HAS_LEGACY =
    HAS_USERMEDIA &&
    typeof window.HTMLUserMediaElement.isTypeSupported === "function";

  function cssSupportsSelector(selector) {
    try {
      return !!(window.CSS && CSS.supports && CSS.supports("selector(" + selector + ")"));
    } catch (err) {
      return false;
    }
  }

  var HAS_GRANTED_PSEUDO = cssSupportsSelector("usermedia:granted");

  function chromeVersion() {
    var m = navigator.userAgent.match(/Chrome\/(\d+)/);
    if (!m) return null;
    if (/Edg\//.test(navigator.userAgent)) return null;
    return parseInt(m[1], 10);
  }

  function permissionsPolicyAllows(feature) {
    var policy = document.permissionsPolicy || document.featurePolicy;
    if (!policy || typeof policy.allowsFeature !== "function") return null;
    try {
      return policy.allowsFeature(feature);
    } catch (err) {
      return null;
    }
  }

  function renderSupportTable() {
    var table = document.getElementById("supportTable");
    var rows = [
      ["<usermedia> element", HAS_USERMEDIA ? ["Supported", "yes"] : ["Not supported", "no"]],
      ["<camera> element", HAS_CAMERA ? ["Supported", "yes"] : ["Not supported", "no"]],
      ["<microphone> element", HAS_MICROPHONE ? ["Supported", "yes"] : ["Not supported", "no"]],
      [
        "setConstraints()",
        HAS_USERMEDIA && "setConstraints" in window.HTMLUserMediaElement.prototype
          ? ["Available", "yes"]
          : ["Missing", "no"]
      ],
      [
        "stream property",
        HAS_USERMEDIA && "stream" in window.HTMLUserMediaElement.prototype
          ? ["Available", "yes"]
          : ["Missing", "no"]
      ],
      [":granted pseudo-class", HAS_GRANTED_PSEUDO ? ["Supported", "yes"] : ["Not supported", "no"]],
      [
        "Legacy type mode",
        HAS_LEGACY ? ["Available (deprecated)", "partial"] : ["Not available", ""]
      ],
      ["getUserMedia()", HAS_GUM ? ["Available", "yes"] : ["Missing", "no"]],
      [
        "Secure context",
        window.isSecureContext ? ["Yes", "yes"] : ["No — element will not work", "no"]
      ],
      [
        "Camera permissions policy",
        formatPolicy(permissionsPolicyAllows("camera"))
      ],
      [
        "Microphone permissions policy",
        formatPolicy(permissionsPolicyAllows("microphone"))
      ],
      ["Camera permission", ["querying…", "partial"]],
      ["Microphone permission", ["querying…", "partial"]],
      ["Chrome version", chromeVersion() ? [String(chromeVersion()), chromeVersion() >= 151 ? "yes" : "no"] : ["Not Chrome", "partial"]],
      ["Top-level document", window.top === window.self ? ["Yes", "yes"] : ["No — inside a frame", "partial"]],
      ["Origin", [location.origin, ""]]
    ];

    table.innerHTML = "";
    rows.forEach(function (row) {
      table.appendChild(supportRow(row[0], row[1][0], row[1][1]));
    });

    var hint = document.getElementById("supportHint");
    if (!HAS_USERMEDIA) {
      hint.textContent =
        "This browser parses <usermedia> as an unknown element, so every element on this page falls back to its nested button and getUserMedia(). Open the page in Chrome 151+ to see the real thing.";
    } else if (!window.isSecureContext) {
      hint.textContent =
        "Not a secure context. The element renders its fallback content and will never produce a stream. Serve the page over HTTPS or from localhost.";
    } else {
      hint.textContent =
        "Permission rows update live as the Permissions API reports changes. " +
        (HAS_CAMERA
          ? "The <camera> and <microphone> elements are available."
          : "The <camera> and <microphone> elements are missing — enable chrome://flags/#enable-experimental-web-platform-features or update to Chrome 153.");
    }
  }

  function formatPolicy(value) {
    if (value === null) return ["Unknown", "partial"];
    return value ? ["Allowed", "yes"] : ["Blocked", "no"];
  }

  function supportRow(term, value, cls) {
    var wrap = document.createElement("div");
    var dt = document.createElement("dt");
    dt.textContent = term;
    var dd = document.createElement("dd");
    dd.textContent = value;
    if (cls) dd.className = cls;
    wrap.appendChild(dt);
    wrap.appendChild(dd);
    return wrap;
  }

  function fillDl(node, entries) {
    node.innerHTML = "";
    entries.forEach(function (entry) {
      node.appendChild(supportRow(entry[0], entry[1], entry[2] || ""));
    });
  }

  renderSupportTable();

  /* Permissions API — keep the two permission rows honest. */
  var permissionStatuses = {};
  ["camera", "microphone"].forEach(function (name) {
    if (!navigator.permissions || !navigator.permissions.query) return;
    navigator.permissions
      .query({ name: name })
      .then(function (status) {
        permissionStatuses[name] = status;
        var update = function (initial) {
          var table = document.getElementById("supportTable");
          var label = name === "camera" ? "Camera permission" : "Microphone permission";
          Array.prototype.forEach.call(table.children, function (div) {
            if (div.firstChild.textContent === label) {
              div.lastChild.textContent = status.state;
              div.lastChild.className =
                status.state === "granted" ? "yes" : status.state === "denied" ? "no" : "partial";
            }
          });
          log(
            status.state === "denied" ? "warn" : "info",
            (initial ? "Permissions API: " : "Permissions API changed: ") + name + " = " + status.state
          );
          refreshGrantedState();
        };
        update(true);
        status.addEventListener("change", function () {
          update(false);
        });
      })
      .catch(function (err) {
        log("debug", "Permissions.query('" + name + "') failed", String(err));
      });
  });

  /* Page-level notice for blocking problems. */
  (function pageNotice() {
    var notice = document.getElementById("pageNotice");
    var messages = [];
    if (!window.isSecureContext) {
      messages.push(
        "<strong>Insecure context.</strong> The &lt;usermedia&gt; element and getUserMedia() both require HTTPS or localhost. Nothing on this page will acquire a stream here."
      );
    }
    if (!HAS_USERMEDIA) {
      messages.push(
        "<strong>No &lt;usermedia&gt; support.</strong> This browser does not implement HTMLUserMediaElement, so the nested fallback buttons are shown and wired to getUserMedia() instead. The element shipped in Chrome 151."
      );
    }
    if (!HAS_GUM) {
      messages.push(
        "<strong>No getUserMedia().</strong> navigator.mediaDevices is unavailable, so even the fallback path cannot run."
      );
    }
    if (!messages.length) return;
    notice.classList.remove("is-hidden");
    notice.classList.add(HAS_USERMEDIA && window.isSecureContext ? "" : "notice--error");
    notice.innerHTML = messages.map(function (m) { return "<p>" + m + "</p>"; }).join("");
  })();

  log("info", "Page loaded. <usermedia> support: " + (HAS_USERMEDIA ? "yes" : "no"), navigator.userAgent);

  /* =====================================================================
     Shared helpers for capability elements
     ===================================================================== */

  /* The element renders its children only when the tag is unknown. When it IS
     known we still want the nested button to exist for copy-paste fidelity, so
     we wire the fallback path only where it can actually be reached. */
  function wireFallbackButton(button, name, onStream) {
    if (!button) return;
    if (HAS_USERMEDIA) {
      button.addEventListener("click", function () {
        log("debug", "Fallback button clicked but <usermedia> is supported — ignoring (" + name + ")");
      });
      return;
    }
    button.addEventListener("click", function () {
      if (!HAS_GUM) {
        log("error", "Fallback for " + name + " cannot run: getUserMedia() is unavailable");
        return;
      }
      log("info", "Fallback path: calling getUserMedia() for " + name);
      navigator.mediaDevices
        .getUserMedia(fallbackConstraintsFor(name))
        .then(function (stream) {
          log("info", "Fallback getUserMedia() resolved for " + name, describeStream(stream));
          onStream(stream);
        })
        .catch(function (err) {
          log("error", "Fallback getUserMedia() rejected for " + name + ": " + err.name, err.message);
        });
    });
  }

  function fallbackConstraintsFor(name) {
    if (name === "camera") return { video: true };
    if (name === "microphone") return { audio: true };
    return { video: true, audio: true };
  }

  function describeStream(stream) {
    if (!stream) return "null";
    return stream
      .getTracks()
      .map(function (t) {
        return t.kind + ' "' + t.label + '" (' + t.readyState + ")";
      })
      .join("\n");
  }

  function trackFlags(track) {
    return [
      ["readyState", track.readyState, track.readyState === "live"],
      ["enabled", String(track.enabled), track.enabled],
      ["muted", String(track.muted), !track.muted]
    ];
  }

  function watchTrack(track, source) {
    ["mute", "unmute", "ended"].forEach(function (type) {
      track.addEventListener(type, function () {
        log(
          type === "ended" ? "warn" : "info",
          source + ": " + track.kind + " track fired '" + type + "'",
          'label="' + track.label + '" readyState=' + track.readyState
        );
        onAnyTrackChange();
      });
    });
  }

  var trackChangeHandlers = [];
  function onAnyTrackChange() {
    trackChangeHandlers.forEach(function (fn) {
      try {
        fn();
      } catch (err) {
        /* a broken panel must not take the rest down */
      }
    });
  }
  setInterval(onAnyTrackChange, 1000);

  /* =====================================================================
     Audio level meters
     ===================================================================== */

  var audioContext = null;

  function attachMeter(track, barElement) {
    if (!track) return function () {};
    try {
      audioContext = audioContext || new (window.AudioContext || window.webkitAudioContext)();
    } catch (err) {
      log("warn", "AudioContext unavailable — input level meter disabled", String(err));
      return function () {};
    }
    var source = audioContext.createMediaStreamSource(new MediaStream([track]));
    var analyser = audioContext.createAnalyser();
    analyser.fftSize = 1024;
    source.connect(analyser);
    var data = new Uint8Array(analyser.frequencyBinCount);
    var raf = 0;
    var stopped = false;

    function tick() {
      if (stopped) return;
      analyser.getByteTimeDomainData(data);
      var peak = 0;
      for (var i = 0; i < data.length; i++) {
        var v = Math.abs(data[i] - 128) / 128;
        if (v > peak) peak = v;
      }
      barElement.style.width = Math.min(100, Math.round(peak * 140)) + "%";
      raf = requestAnimationFrame(tick);
    }
    tick();

    return function () {
      stopped = true;
      cancelAnimationFrame(raf);
      barElement.style.width = "0%";
      try {
        source.disconnect();
      } catch (err) {
        /* already gone */
      }
    };
  }

  /* =====================================================================
     1. The main <usermedia> element
     ===================================================================== */

  var mainEl = document.getElementById("mainUserMedia");
  var video = document.getElementById("live");
  var videoContainer = document.getElementById("videoContainer");
  var levelBar = document.getElementById("levelBar");
  var recStatus = document.getElementById("recStatus");
  var recStatusText = document.getElementById("recStatusText");
  var stopMeter = function () {};
  var clickAt = 0;

  var counters = { stream: 0, cancel: 0, error: 0 };

  wireFallbackButton(document.getElementById("fallbackButton"), "usermedia", adoptStream);

  mainEl.addEventListener("pointerdown", function () {
    clickAt = performance.now();
    log("debug", "pointerdown on <usermedia> — the browser now owns the interaction");
  });

  mainEl.addEventListener("stream", function (event) {
    counters.stream++;
    var latency = clickAt ? Math.round(performance.now() - clickAt) : null;
    document.getElementById("statLatency").textContent = latency === null ? "—" : latency + " ms";
    log(
      "info",
      "<usermedia> fired 'stream' (isTrusted=" + event.isTrusted + ")",
      describeStream(mainEl.stream)
    );
    adoptStream(mainEl.stream);
    updateStats();
  });

  mainEl.addEventListener("error", function (event) {
    counters.error++;
    var err = mainEl.error;
    log(
      "error",
      "<usermedia> fired 'error'" + (err ? ": " + err.name : ""),
      err ? err.name + ": " + err.message : "element.error is null"
    );
    setStatus(false, err ? "Failed — " + err.name : "Failed");
    updateStats();
    updateProps();
  });

  mainEl.addEventListener("cancel", function () {
    counters.cancel++;
    log("warn", "<usermedia> fired 'cancel' — the user dismissed the prompt without choosing");
    setStatus(false, "Prompt dismissed");
    updateStats();
    updateProps();
  });

  function adoptStream(stream) {
    if (!stream) return;
    stopMeter();
    video.srcObject = stream;
    var videoTracks = stream.getVideoTracks();
    var audioTracks = stream.getAudioTracks();

    videoContainer.classList.toggle("is-audio-only", videoTracks.length === 0);
    stream.getTracks().forEach(function (t) {
      watchTrack(t, "<usermedia>");
    });
    if (audioTracks.length) stopMeter = attachMeter(audioTracks[0], levelBar);

    stream.addEventListener("removetrack", function (e) {
      log("warn", "<usermedia> stream fired 'removetrack' for the " + e.track.kind + " track");
      onAnyTrackChange();
    });
    stream.addEventListener("addtrack", function (e) {
      log("info", "<usermedia> stream fired 'addtrack' for the " + e.track.kind + " track");
      onAnyTrackChange();
    });

    setStatus(true, "Live — " + videoTracks.length + " video, " + audioTracks.length + " audio");
    document.getElementById("stopTracks").disabled = false;
    document.getElementById("toggleVideo").disabled = videoTracks.length === 0;
    document.getElementById("toggleAudio").disabled = audioTracks.length === 0;
    updateTrackList(stream);
    updateProps();
    refreshGrantedState();
    probeDeclarative();
  }

  function currentStream() {
    return (HAS_USERMEDIA && mainEl.stream) || video.srcObject || null;
  }

  function setStatus(live, text) {
    recStatus.classList.toggle("is-live", !!live);
    recStatusText.textContent = text;
  }

  function updateStats() {
    document.getElementById("statStream").textContent = counters.stream;
    document.getElementById("statCancel").textContent = counters.cancel;
    document.getElementById("statError").textContent = counters.error;
    var stream = currentStream();
    var tracks = stream ? stream.getTracks().filter(function (t) { return t.readyState === "live"; }) : [];
    document.getElementById("statTracks").textContent = tracks.length;
    document.getElementById("statState").textContent = tracks.length ? "control (stream set)" : "request";
  }

  function updateProps() {
    var stream = HAS_USERMEDIA ? mainEl.stream : null;
    fillDl(document.getElementById("propTable"), [
      ["element.stream", stream ? "MediaStream" : "null", stream ? "yes" : ""],
      ["stream.id", stream ? stream.id : "—", ""],
      ["stream.active", stream ? String(stream.active) : "—", stream && stream.active ? "yes" : ""],
      [
        "element.error",
        HAS_USERMEDIA && mainEl.error ? mainEl.error.name : "null",
        HAS_USERMEDIA && mainEl.error ? "no" : ""
      ],
      ["error.message", HAS_USERMEDIA && mainEl.error ? mainEl.error.message || "(empty)" : "—", ""],
      ["constructor", HAS_USERMEDIA ? mainEl.constructor.name : mainEl.constructor.name, HAS_USERMEDIA ? "yes" : "no"],
      ["matches(':granted')", safeMatches(mainEl, ":granted"), ""],
      ["tabIndex", String(mainEl.tabIndex), ""]
    ]);
  }

  function safeMatches(el, selector) {
    try {
      return String(el.matches(selector));
    } catch (err) {
      return "unsupported selector";
    }
  }

  function updateTrackList(stream) {
    var host = document.getElementById("trackList");
    if (!stream || !stream.getTracks().length) {
      host.innerHTML = '<p class="placeholder">No stream yet.</p>';
      document.getElementById("trackJson").textContent = "{}";
      return;
    }
    host.innerHTML = "";
    var json = {};
    stream.getTracks().forEach(function (track) {
      var wrap = document.createElement("div");
      wrap.className = "track";

      var head = document.createElement("div");
      head.className = "track-head";
      var kind = document.createElement("span");
      kind.className = "track-kind" + (track.kind === "audio" ? " is-audio" : "");
      kind.textContent = track.kind;
      var label = document.createElement("span");
      label.className = "track-label";
      label.textContent = track.label || "(no label)";
      head.appendChild(kind);
      head.appendChild(label);
      wrap.appendChild(head);

      var flags = document.createElement("div");
      flags.className = "track-flags";
      trackFlags(track).forEach(function (f) {
        var s = document.createElement("span");
        s.className = "flag " + (f[2] ? "is-on" : "is-off");
        s.textContent = f[0] + ": " + f[1];
        flags.appendChild(s);
      });
      var idFlag = document.createElement("span");
      idFlag.className = "flag";
      idFlag.textContent = "id: " + track.id.slice(0, 12) + "…";
      flags.appendChild(idFlag);
      wrap.appendChild(flags);

      var settings = track.getSettings ? track.getSettings() : {};
      var summary = document.createElement("div");
      summary.className = "track-settings";
      summary.textContent = Object.keys(settings)
        .map(function (k) {
          return k + ": " + JSON.stringify(settings[k]);
        })
        .join("  ·  ");
      wrap.appendChild(summary);

      host.appendChild(wrap);

      json[track.kind + ":" + track.id.slice(0, 8)] = {
        label: track.label,
        readyState: track.readyState,
        enabled: track.enabled,
        muted: track.muted,
        contentHint: track.contentHint,
        settings: settings,
        constraints: track.getConstraints ? track.getConstraints() : null,
        capabilities: track.getCapabilities ? track.getCapabilities() : null
      };
    });
    document.getElementById("trackJson").textContent = safeJson(json);
  }

  trackChangeHandlers.push(function () {
    var stream = currentStream();
    updateStats();
    if (stream) updateTrackList(stream);
  });

  document.getElementById("stopTracks").addEventListener("click", function () {
    var stream = currentStream();
    if (!stream) return;
    stream.getTracks().forEach(function (t) {
      t.stop();
      log("info", "Called stop() on the " + t.kind + " track", 'label="' + t.label + '"');
    });
    stopMeter();
    video.srcObject = null;
    setStatus(false, "Stopped — element back in request state");
    document.getElementById("stopTracks").disabled = true;
    document.getElementById("toggleVideo").disabled = true;
    document.getElementById("toggleAudio").disabled = true;
    log(
      "info",
      "All tracks stopped. The element resets to its request state; the next real click acquires a fresh stream."
    );
    setTimeout(function () {
      updateProps();
      updateStats();
      updateTrackList(HAS_USERMEDIA ? mainEl.stream : null);
      refreshGrantedState();
    }, 100);
  });

  function toggleKind(kind) {
    var stream = currentStream();
    if (!stream) return;
    var tracks = kind === "video" ? stream.getVideoTracks() : stream.getAudioTracks();
    tracks.forEach(function (t) {
      t.enabled = !t.enabled;
      log("info", "Set " + kind + " track enabled = " + t.enabled);
    });
    onAnyTrackChange();
  }
  document.getElementById("toggleVideo").addEventListener("click", function () {
    toggleKind("video");
  });
  document.getElementById("toggleAudio").addEventListener("click", function () {
    toggleKind("audio");
  });

  updateStats();
  updateProps();

  /* =====================================================================
     2. Constraint lab — a faithful port of Chromium's filter
     ===================================================================== */

  /* Mirrors SanitizeTrackConstraints() in
     third_party/blink/renderer/modules/mediastream/media_capture_element_constraints.cc
     The same allowlist is applied to both the audio and the video set. */
  var CONSTRAINT_ALLOWLIST = {
    width: { form: "long", media: "video" },
    height: { form: "long", media: "video" },
    aspectRatio: { form: "double", media: "video" },
    frameRate: { form: "double", media: "video" },
    facingMode: { form: "string", media: "video" },
    resizeMode: { form: "string", media: "video" },
    channelCount: { form: "long", media: "audio" },
    sampleSize: { form: "long", media: "audio" },
    sampleRate: { form: "long", media: "audio" },
    latency: { form: "double", media: "audio" },
    autoGainControl: { form: "boolean", media: "audio" },
    echoCancellation: { form: "boolean", media: "audio" },
    noiseSuppression: { form: "boolean", media: "audio" },
    voiceIsolation: { form: "boolean", media: "audio" },
    deviceId: { form: "string", media: "both" },
    groupId: { form: "string", media: "both" }
  };

  var FORM_LABEL = {
    long: "bare integer",
    double: "bare number",
    boolean: "bare true / false",
    string: "bare string or array of strings"
  };

  function matchesForm(value, form) {
    if (form === "long") return typeof value === "number" && isFinite(value);
    if (form === "double") return typeof value === "number" && isFinite(value);
    if (form === "boolean") return typeof value === "boolean";
    if (form === "string") {
      if (typeof value === "string") return true;
      return (
        Array.isArray(value) &&
        value.length > 0 &&
        value.every(function (v) {
          return typeof v === "string";
        })
      );
    }
    return false;
  }

  function sanitizeSet(input) {
    var kept = {};
    var report = [];
    if (input === null || typeof input !== "object" || Array.isArray(input)) {
      return {
        kept: kept,
        report: [
          {
            key: String(input),
            status: "dropped",
            why: "Not a constraint dictionary — the filter substitutes an empty set."
          }
        ]
      };
    }
    Object.keys(input).forEach(function (key) {
      var rule = CONSTRAINT_ALLOWLIST[key];
      var value = input[key];
      if (!rule) {
        report.push({
          key: key,
          value: value,
          status: "dropped",
          why: key === "advanced" ? "advanced constraints are never forwarded" : "not in the filter's allowlist"
        });
        return;
      }
      if (!matchesForm(value, rule.form)) {
        report.push({
          key: key,
          value: value,
          status: "dropped",
          why: "must be a " + FORM_LABEL[rule.form] + "; exact/ideal/min/max objects are discarded"
        });
        return;
      }
      kept[key] = value;
      report.push({ key: key, value: value, status: "kept", why: "kept as " + FORM_LABEL[rule.form] });
    });
    return { kept: kept, report: report };
  }

  var videoInput = document.getElementById("videoConstraints");
  var audioInput = document.getElementById("audioConstraints");
  var sanitizerOut = document.getElementById("sanitizerOut");
  var constraintStatus = document.getElementById("constraintStatus");
  var constraintsApplied = false;

  function parseSet(textarea) {
    var raw = textarea.value.trim();
    if (!raw) {
      textarea.classList.remove("is-invalid");
      return { ok: true, value: {} };
    }
    try {
      var parsed = JSON.parse(raw);
      textarea.classList.remove("is-invalid");
      return { ok: true, value: parsed };
    } catch (err) {
      textarea.classList.add("is-invalid");
      return { ok: false, error: err.message };
    }
  }

  function renderSanitizer() {
    var v = parseSet(videoInput);
    var a = parseSet(audioInput);

    sanitizerOut.innerHTML = "";
    var sanitized = { video: {}, audio: {} };

    [["video", v], ["audio", a]].forEach(function (pair) {
      var group = document.createElement("div");
      group.className = "sanitizer-group";
      var h = document.createElement("h4");
      h.textContent = pair[0];
      group.appendChild(h);

      if (!pair[1].ok) {
        var bad = document.createElement("p");
        bad.className = "sanitizer-empty";
        bad.textContent = "Invalid JSON: " + pair[1].error;
        group.appendChild(bad);
        sanitizerOut.appendChild(group);
        return;
      }

      var result = sanitizeSet(pair[1].value);
      sanitized[pair[0]] = result.kept;

      if (!result.report.length) {
        var empty = document.createElement("p");
        empty.className = "sanitizer-empty";
        empty.textContent = "Empty set — sent as {}.";
        group.appendChild(empty);
      }

      result.report.forEach(function (item) {
        var row = document.createElement("div");
        row.className = "sanitizer-row is-" + item.status;
        var mark = document.createElement("span");
        mark.className = "mark";
        mark.textContent = item.status === "kept" ? "✔" : "✕";
        var body = document.createElement("span");
        var code = document.createElement("span");
        code.textContent =
          item.key + (item.value === undefined ? "" : ": " + JSON.stringify(item.value));
        var why = document.createElement("div");
        why.className = "why";
        why.textContent = item.why;
        body.appendChild(code);
        body.appendChild(why);
        row.appendChild(mark);
        row.appendChild(body);
        group.appendChild(row);
      });

      sanitizerOut.appendChild(group);
    });

    document.getElementById("sanitizedJson").textContent = safeJson(sanitized);
    updateGeneratedCode();
    return sanitized;
  }

  videoInput.addEventListener("input", renderSanitizer);
  audioInput.addEventListener("input", renderSanitizer);

  document.getElementById("applyConstraints").addEventListener("click", function () {
    var v = parseSet(videoInput);
    var a = parseSet(audioInput);
    if (!v.ok || !a.ok) {
      log("error", "setConstraints() not called — the constraint JSON does not parse");
      constraintStatus.textContent = "Fix the JSON first.";
      return;
    }
    var payload = { video: v.value, audio: a.value };
    if (!HAS_USERMEDIA) {
      log("warn", "setConstraints() unavailable — <usermedia> is not supported here");
      constraintStatus.textContent = "No <usermedia> support in this browser.";
      return;
    }
    mainEl.setConstraints(payload);
    log(
      constraintsApplied ? "warn" : "info",
      constraintsApplied
        ? "setConstraints() called again — Chrome discards every call after the first, silently"
        : "setConstraints() called on <usermedia>",
      safeJson(payload)
    );
    constraintStatus.textContent = constraintsApplied
      ? "Called again. Chrome ignored it: the first call is the only one that counts."
      : "Applied. Click the element in section 1 now. Any further call is discarded.";
    constraintsApplied = true;
    if (mainEl.stream) {
      constraintStatus.textContent +=
        " A stream already exists, so this had no effect at all — constraints are read at acquisition time.";
    }
  });

  var PRESETS = {
    constraintPreset1: {
      video: { width: 1280, height: 720, frameRate: 30, facingMode: "user", resizeMode: "crop-and-scale" },
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1, sampleRate: 48000 }
    },
    constraintPreset2: {
      video: { width: { ideal: 1920 }, height: { min: 720, ideal: 1080 }, frameRate: { exact: 60 }, facingMode: { exact: "environment" } },
      audio: { echoCancellation: { ideal: true }, sampleRate: { min: 44100 }, advanced: [{ noiseSuppression: true }] }
    },
    constraintPreset3: {
      video: { deviceId: "PASTE_A_VIDEO_DEVICE_ID", width: 640, height: 480 },
      audio: { deviceId: "PASTE_AN_AUDIO_DEVICE_ID", groupId: "PASTE_A_GROUP_ID" }
    }
  };

  Object.keys(PRESETS).forEach(function (id) {
    document.getElementById(id).addEventListener("click", function () {
      videoInput.value = JSON.stringify(PRESETS[id].video, null, 2);
      audioInput.value = JSON.stringify(PRESETS[id].audio, null, 2);
      renderSanitizer();
      log("debug", "Loaded constraint preset: " + id);
    });
  });

  (function renderAllowedTable() {
    var body = document.getElementById("allowedConstraintsTable");
    Object.keys(CONSTRAINT_ALLOWLIST).forEach(function (key) {
      var rule = CONSTRAINT_ALLOWLIST[key];
      var tr = document.createElement("tr");
      tr.innerHTML =
        "<td><code>" + key + "</code></td><td>" +
        (rule.media === "both" ? "video and audio" : rule.media) +
        "</td><td>" + FORM_LABEL[rule.form] + "</td>";
      body.appendChild(tr);
    });
  })();

  renderSanitizer();

  /* =====================================================================
     3. Declarative constraints probe
     ===================================================================== */

  var declarativeEl = document.getElementById("declarativeUserMedia");
  var declarativeScript = declarativeEl.querySelector('script[type="permissionconstraints"]');
  var declarativeWanted = null;
  try {
    declarativeWanted = JSON.parse(declarativeScript.textContent);
  } catch (err) {
    log("error", "The declarative constraints block is not valid JSON", String(err));
  }

  wireFallbackButton(
    declarativeEl.querySelector("[data-fallback]"),
    "usermedia (declarative)",
    function (stream) {
      declarativeEl._fallbackStream = stream;
      probeDeclarative(stream);
    }
  );

  declarativeEl.addEventListener("stream", function () {
    log("info", "<usermedia> (declarative) fired 'stream'", describeStream(declarativeEl.stream));
    declarativeEl.stream.getTracks().forEach(function (t) {
      watchTrack(t, "<usermedia> (declarative)");
    });
    probeDeclarative();
  });
  declarativeEl.addEventListener("error", function () {
    log("error", "<usermedia> (declarative) fired 'error': " + (declarativeEl.error && declarativeEl.error.name));
    probeDeclarative();
  });
  declarativeEl.addEventListener("cancel", function () {
    log("warn", "<usermedia> (declarative) fired 'cancel'");
  });

  function probeDeclarative() {
    var stream = (HAS_USERMEDIA && declarativeEl.stream) || declarativeEl._fallbackStream || null;
    var out = document.getElementById("declarativeResult");
    if (!stream) {
      fillDl(out, [
        ["Declarative JSON parsed", declarativeWanted ? "yes" : "no", declarativeWanted ? "yes" : "no"],
        ["Result", "Click the element above to test", "partial"]
      ]);
      return;
    }
    var v = stream.getVideoTracks()[0];
    var a = stream.getAudioTracks()[0];
    var vs = v && v.getSettings ? v.getSettings() : {};
    var as = a && a.getSettings ? a.getSettings() : {};
    var wantV = (declarativeWanted && declarativeWanted.video) || {};
    var wantA = (declarativeWanted && declarativeWanted.audio) || {};

    var checks = [];
    function check(label, want, got) {
      var ok = want === undefined || want === got;
      checks.push([label, want === undefined ? String(got) : got + " (asked for " + want + ")", ok ? "yes" : "no"]);
      return ok;
    }
    var hits = 0;
    if (check("video width", wantV.width, vs.width)) hits++;
    if (check("video height", wantV.height, vs.height)) hits++;
    if (check("facingMode", wantV.facingMode, vs.facingMode)) hits++;
    if (check("echoCancellation", wantA.echoCancellation, as.echoCancellation)) hits++;
    if (check("noiseSuppression", wantA.noiseSuppression, as.noiseSuppression)) hits++;

    checks.unshift([
      "Verdict",
      hits >= 4
        ? "Declarative constraints appear to have been applied"
        : "Settings do not match — the markup was probably ignored, or the hardware could not comply",
      hits >= 4 ? "yes" : "partial"
    ]);
    fillDl(out, checks);
    log(
      hits >= 4 ? "info" : "warn",
      "Declarative constraints probe: " + hits + "/5 settings match the markup"
    );
  }
  probeDeclarative();

  /* =====================================================================
     4. Styling playground
     ===================================================================== */

  var styleInput = document.getElementById("styleInput");
  var playgroundEl = document.getElementById("playgroundUserMedia");
  var playgroundStage = document.getElementById("playgroundStage");
  var playgroundHint = document.getElementById("playgroundHint");
  var styleTag = document.createElement("style");
  styleTag.id = "playgroundStyle";
  document.head.appendChild(styleTag);

  wireFallbackButton(playgroundEl.querySelector("[data-fallback]"), "usermedia (playground)", function () {});

  playgroundEl.addEventListener("stream", function () {
    log("info", "<usermedia> (playground) fired 'stream' — the styling did not block activation");
    playgroundEl.stream.getTracks().forEach(function (t) {
      t.stop();
    });
    log("debug", "Playground stream stopped immediately to release the devices");
  });
  playgroundEl.addEventListener("error", function () {
    log(
      "error",
      "<usermedia> (playground) fired 'error': " + (playgroundEl.error && playgroundEl.error.name),
      "This is what a click on a style-invalidated element looks like from script."
    );
  });
  playgroundEl.addEventListener("cancel", function () {
    log("warn", "<usermedia> (playground) fired 'cancel'");
  });

  var STYLE_PRESETS = {
    valid:
      "#playgroundUserMedia {\n  color: #ffffff;\n  background-color: #ed341d;\n  border: 2px solid #c72d1c;\n  border-radius: 999px;\n  font-size: 1rem;\n  padding: 0.5rem 1.25rem;\n}",
    contrast:
      "/* 3:1 is the floor. This sits just under it. */\n#playgroundUserMedia {\n  color: #8a8a8a;\n  background-color: #ffffff;\n  font-size: 1rem;\n}",
    alpha:
      "/* Alpha must be exactly 1 on color and background-color. */\n#playgroundUserMedia {\n  color: rgba(0, 0, 0, 0.6);\n  background-color: rgba(237, 52, 29, 0.4);\n  font-size: 1rem;\n}",
    tiny:
      "/* Anything below `small` (13px) invalidates the element. */\n#playgroundUserMedia {\n  color: #ffffff;\n  background-color: #ed341d;\n  font-size: 4px;\n}",
    huge:
      "/* Anything above `xxx-large` (48px) invalidates it too. */\n#playgroundUserMedia {\n  color: #ffffff;\n  background-color: #ed341d;\n  font-size: 200px;\n}",
    display:
      "/* inline, contents, list-item, ruby and every table display are rejected. */\n#playgroundUserMedia {\n  color: #ffffff;\n  background-color: #ed341d;\n  font-size: 1rem;\n  display: inline;\n}",
    distort:
      "/* Only 2D translation and proportional scaling survive. rotate, skew,\n   filter, clip-path, mask and background-image are dropped entirely. */\n#playgroundUserMedia {\n  color: #ffffff;\n  background-color: #ed341d;\n  font-size: 1rem;\n  transform: rotate(12deg) skewX(20deg);\n  filter: blur(2px) opacity(0.4);\n  clip-path: circle(30%);\n  background-image: linear-gradient(#fff, #000);\n}",
    squeeze:
      "/* Negative margins and outline offsets clamp to 0. Height is capped at\n   3x the font size and min-height floors at 1x. */\n#playgroundUserMedia {\n  color: #ffffff;\n  background-color: #ed341d;\n  font-size: 1rem;\n  margin: -40px;\n  outline: 2px solid #005a9c;\n  outline-offset: -12px;\n  height: 4px;\n  max-height: 4px;\n  letter-spacing: 2em;\n  word-spacing: 5em;\n  font-weight: 100;\n  font-style: oblique 40deg;\n}",
    occlude: null
  };

  var occluder = null;
  function toggleOccluder(force) {
    var want = force === undefined ? !occluder : force;
    if (want && !occluder) {
      occluder = document.createElement("div");
      occluder.className = "occluder";
      occluder.textContent =
        "This div covers the element. Chrome now refuses to activate it — the anti-clickjacking check.";
      playgroundStage.appendChild(occluder);
      log("warn", "Playground element covered by an overlay — activation should now be refused");
    } else if (!want && occluder) {
      occluder.remove();
      occluder = null;
      log("info", "Overlay removed. Chrome re-enables the element after a short cooldown (~500 ms).");
    }
    applyPlaygroundStyle();
  }

  document.querySelectorAll("#stylePresets [data-preset]").forEach(function (button) {
    button.addEventListener("click", function () {
      var name = button.dataset.preset;
      if (name === "occlude") {
        toggleOccluder();
        button.classList.toggle("button--active", !!occluder);
        return;
      }
      styleInput.value = STYLE_PRESETS[name];
      applyPlaygroundStyle();
      log("debug", "Loaded style preset: " + name);
    });
  });

  /* Very small declaration parser — enough to show "you asked for X". */
  function parseDeclarations(css) {
    var out = {};
    var open = css.indexOf("{");
    var close = css.lastIndexOf("}");
    if (open === -1 || close === -1) return out;
    css
      .slice(open + 1, close)
      .split(";")
      .forEach(function (decl) {
        var i = decl.indexOf(":");
        if (i === -1) return;
        var prop = decl.slice(0, i).trim();
        var value = decl.slice(i + 1).trim();
        if (!prop || prop.indexOf("/*") === 0) return;
        out[prop] = value;
      });
    return out;
  }

  var WATCHED_PROPERTIES = [
    "color",
    "background-color",
    "background-image",
    "border-top-width",
    "border-radius",
    "outline-offset",
    "font-size",
    "font-weight",
    "font-style",
    "letter-spacing",
    "word-spacing",
    "display",
    "margin-top",
    "padding-left",
    "padding-top",
    "min-height",
    "max-height",
    "min-width",
    "max-width",
    "height",
    "width",
    "transform",
    "filter",
    "clip-path",
    "cursor",
    "contain",
    "content-visibility"
  ];

  /* Shown even when the stylesheet says nothing about them, because these are
     the properties Chrome is most likely to have quietly overruled. */
  var ALWAYS_SHOWN = [
    "color",
    "background-color",
    "font-size",
    "font-weight",
    "display",
    "cursor",
    "transform",
    "filter",
    "clip-path",
    "background-image",
    "min-height",
    "max-height"
  ];

  var SHORTHAND_SOURCE = {
    "border-top-width": "border",
    "border-radius": "border-radius",
    "margin-top": "margin",
    "padding-left": "padding",
    "padding-top": "padding"
  };

  function relativeLuminance(rgb) {
    var channels = rgb.map(function (c) {
      var s = c / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  }

  function parseColor(value) {
    var m = value.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    var parts = m[1].split(/[\s,/]+/).filter(Boolean).map(parseFloat);
    return { rgb: parts.slice(0, 3), alpha: parts.length > 3 ? parts[3] : 1 };
  }

  function contrastRatio(a, b) {
    var la = relativeLuminance(a);
    var lb = relativeLuminance(b);
    var hi = Math.max(la, lb);
    var lo = Math.min(la, lb);
    return (hi + 0.05) / (lo + 0.05);
  }

  function applyPlaygroundStyle() {
    styleTag.textContent = styleInput.value;
    /* Let the browser settle before reading back computed values. */
    requestAnimationFrame(function () {
      var declared = parseDeclarations(styleInput.value);
      var computed = getComputedStyle(playgroundEl);
      var body = document.getElementById("computedStyleTable");
      body.innerHTML = "";

      WATCHED_PROPERTIES.forEach(function (prop) {
        var asked = declared[prop];
        var fromShorthand = false;
        if (asked === undefined) {
          /* Shorthand fallbacks so `border: 2px solid` shows up under
             border-top-width. A shorthand cannot be compared value-for-value
             against one longhand, so these are shown without a verdict. */
          var shorthand = SHORTHAND_SOURCE[prop];
          if (shorthand && declared[shorthand] !== undefined) {
            asked = declared[shorthand];
            fromShorthand = true;
          }
        }
        var got = computed.getPropertyValue(prop).trim();
        if (asked === undefined && ALWAYS_SHOWN.indexOf(prop) === -1) return;
        if (!got && asked === undefined) return;

        var judged = asked !== undefined && !fromShorthand;
        var corrected = judged && !valuesAgree(asked, got);
        var tr = document.createElement("tr");
        tr.innerHTML =
          "<td><code>" + prop + "</code></td>" +
          "<td><code>" + (asked === undefined ? "—" : escapeHtml(asked)) + "</code>" +
          (fromShorthand ? ' <span class="why">via shorthand</span>' : "") + "</td>" +
          '<td class="' + (corrected ? "is-corrected" : judged ? "is-ok" : "") + '"><code>' +
          escapeHtml(got || "—") + "</code></td>" +
          "<td>" + (corrected ? "corrected" : judged ? "kept" : "") + "</td>";
        body.appendChild(tr);
      });

      /* Predict validity with the same rules Chromium applies. Pointless in a
         browser where the tag is just an unknown inline element. */
      if (!HAS_USERMEDIA) {
        playgroundHint.textContent =
          "This browser has no <usermedia> element, so there is nothing for Chrome's style validator to reject. The table above is showing the computed style of an unknown element.";
        playgroundHint.style.color = "";
        return;
      }

      var problems = [];
      var fg = parseColor(computed.color);
      var bg = parseColor(computed.backgroundColor);
      if (fg && fg.alpha !== 1) problems.push("color is not fully opaque");
      if (bg && bg.alpha !== 1) problems.push("background-color is not fully opaque");
      if (fg && bg && fg.alpha === 1 && bg.alpha === 1) {
        var ratio = contrastRatio(fg.rgb, bg.rgb);
        if (ratio < 3) problems.push("contrast is " + ratio.toFixed(2) + ":1, below the 3:1 minimum");
      }
      var fontPx = parseFloat(computed.fontSize);
      if (fontPx < 13) problems.push("font-size " + computed.fontSize + " is smaller than `small`");
      if (fontPx > 48) problems.push("font-size " + computed.fontSize + " is larger than `xxx-large`");
      if (["contents", "inline", "list-item", "ruby", "ruby-text", "none"].indexOf(computed.display) !== -1 || computed.display.indexOf("table") === 0) {
        problems.push("display: " + computed.display + " is not allowed");
      }
      if (occluder) problems.push("the element is covered by another element");

      if (problems.length) {
        playgroundHint.innerHTML =
          "<strong>Chrome will refuse clicks:</strong> " + escapeHtml(problems.join("; ")) +
          ". Check the DevTools Issues panel for Chrome's own report.";
        playgroundHint.style.color = "var(--brand-dark)";
      } else {
        playgroundHint.innerHTML =
          "This styling is accepted. Values Chrome corrected rather than rejected are marked above.";
        playgroundHint.style.color = "";
      }
    });
  }

  function valuesAgree(asked, got) {
    var a = String(asked).toLowerCase().replace(/\s+/g, " ").trim();
    var g = String(got).toLowerCase().replace(/\s+/g, " ").trim();
    if (a === g) return true;
    /* Compare colors by their computed form. */
    if (/^#[0-9a-f]{3,8}$/.test(a) || a.indexOf("rgb") === 0) {
      var probe = document.createElement("span");
      probe.style.color = asked;
      document.body.appendChild(probe);
      var normalized = getComputedStyle(probe).color;
      probe.remove();
      return normalized.toLowerCase().replace(/\s+/g, " ") === g;
    }
    /* rem/px equivalence for lengths. */
    var an = parseFloat(a);
    var gn = parseFloat(g);
    if (!isNaN(an) && !isNaN(gn)) {
      if (a.indexOf("rem") !== -1) an = an * parseFloat(getComputedStyle(document.documentElement).fontSize);
      if (Math.abs(an - gn) < 0.6) return true;
    }
    /* Shorthands: agree if the computed value appears in the shorthand. */
    if (a.indexOf(g) !== -1) return true;
    return false;
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  styleInput.addEventListener("input", applyPlaygroundStyle);
  applyPlaygroundStyle();

  (function renderCssRules() {
    var rules = [
      ["color / background-color", "Contrast must be at least 3:1 and both alphas exactly 1, or the element is disabled."],
      ["border-* colors", "If every border is opaque, non-zero and at least 3:1 against the background, the width cap on the element is lifted."],
      ["border-width", "Capped at 0.5 × font-size on each side."],
      ["border-radius", "Capped at 25% horizontally and 50% vertically — unless all four corners are equal and circular, which gives you a pill."],
      ["font-size / zoom", "Must land between `small` (≥13px) and `xxx-large` (≤48px). Browser zoom is factored out; CSS zoom is not."],
      ["font-weight", "Values under 200 are raised to 200."],
      ["font-style", "Anything other than normal or italic becomes normal."],
      ["word-spacing", "Clamped to 0 … 0.5em."],
      ["letter-spacing", "Clamped to −0.05em … 0.2em."],
      ["display", "contents, inline, list-item, ruby, ruby-text and every table display disable the element."],
      ["margin (all sides)", "Negative values become 0."],
      ["outline-offset", "Negative values become 0."],
      ["min-height", "Floored at 1 × font-size, ceilinged at 3 × font-size."],
      ["max-height", "Ceilinged at 3 × font-size."],
      ["min-width", "Between 1× and 3× the intrinsic content width."],
      ["max-width", "Ceilinged at 3× the content width, unless the border rule above lifts it."],
      ["padding-top / padding-bottom", "Only applied when height is auto, capped at 1 × font-size, and bottom is forced to match top."],
      ["padding-left / padding-right", "Only applied when width is auto, capped at 5 × font-size, and right is forced to match left."],
      ["transform", "Only 2D translation and proportional scaling survive. Rotation, skew and non-uniform scale are dropped."],
      ["background-image, border-image, mask, clip-path, filter", "Ignored entirely."],
      ["cursor, contain, content-visibility, corner-shape", "Ignored entirely."],
      ["Occlusion, clipping, viewport", "Anything covering, clipping or scrolling the element out of view disables it until it is clear again."],
      ["Attachment cooldown", "Clicks are refused for roughly 500 ms after the element is attached or an attribute changes."]
    ];
    var body = document.getElementById("cssRulesTable");
    rules.forEach(function (r) {
      var tr = document.createElement("tr");
      tr.innerHTML = "<td><code>" + r[0] + "</code></td><td>" + r[1] + "</td>";
      body.appendChild(tr);
    });
  })();

  /* =====================================================================
     5. :granted, lang, trusted activation
     ===================================================================== */

  function refreshGrantedState() {
    var el = document.getElementById("grantedState");
    if (!HAS_GRANTED_PSEUDO) {
      el.textContent = "This browser does not support the :granted pseudo-class.";
      return;
    }
    var matched = [];
    document.querySelectorAll("usermedia, camera, microphone").forEach(function (node) {
      try {
        if (node.matches(":granted")) matched.push("<" + node.localName + "#" + node.id + ">");
      } catch (err) {
        /* selector unsupported */
      }
    });
    el.textContent = matched.length
      ? ":granted currently matches " + matched.join(", ")
      : ":granted matches nothing yet — grant permission and acquire a stream first.";
  }
  refreshGrantedState();
  trackChangeHandlers.push(refreshGrantedState);

  var langWrapper = document.getElementById("langWrapper");
  var langEl = document.getElementById("langUserMedia");
  wireFallbackButton(langEl.querySelector("[data-fallback]"), "usermedia (lang)", function () {});
  langEl.addEventListener("stream", function () {
    log("info", "<usermedia> (lang demo) fired 'stream' — stopping it immediately");
    langEl.stream.getTracks().forEach(function (t) {
      t.stop();
    });
  });
  langEl.addEventListener("error", function () {
    log("error", "<usermedia> (lang demo) fired 'error': " + (langEl.error && langEl.error.name));
  });
  langEl.addEventListener("cancel", function () {
    log("warn", "<usermedia> (lang demo) fired 'cancel'");
  });

  document.getElementById("langSelect").addEventListener("change", function (event) {
    langWrapper.lang = event.target.value;
    requestAnimationFrame(function () {
      var w = langEl.offsetWidth;
      document.getElementById("langWidth").textContent =
        'lang="' + event.target.value + '" → element is ' + w + "px wide";
      log(
        "info",
        'Changed inherited lang to "' + event.target.value + '"; the element re-rendered at ' + w + "px wide"
      );
    });
  });
  requestAnimationFrame(function () {
    document.getElementById("langWidth").textContent =
      'lang="en" → element is ' + langEl.offsetWidth + "px wide";
  });

  var trustResult = document.getElementById("trustResult");

  document.getElementById("scriptClick").addEventListener("click", function () {
    log("info", "Calling mainUserMedia.click() from script — expect an untrusted-event error");
    var before = counters.error;
    mainEl.click();
    setTimeout(function () {
      var fired = counters.error > before;
      trustResult.textContent = fired
        ? "element.click() produced an error event: " +
          (mainEl.error ? mainEl.error.name + " — " + (mainEl.error.message || "no message") : "unknown") +
          ". No prompt was shown."
        : "element.click() did nothing observable — no prompt, no event. The activation was simply dropped.";
      log(fired ? "warn" : "info", trustResult.textContent);
    }, 250);
  });

  document.getElementById("scriptFocus").addEventListener("click", function () {
    mainEl.focus();
    var focused = document.activeElement === mainEl;
    trustResult.textContent = focused
      ? "element.focus() succeeded — this browser allows scripted focus."
      : "element.focus() was refused: document.activeElement is <" +
        document.activeElement.localName +
        ">. The element is only focusable during user activation.";
    log(focused ? "info" : "warn", trustResult.textContent);
  });

  document.getElementById("dispatchClick").addEventListener("click", function () {
    var before = counters.error;
    var event = new MouseEvent("click", { bubbles: true, cancelable: true });
    log("info", "Dispatching a synthetic MouseEvent (isTrusted=" + event.isTrusted + ")");
    mainEl.dispatchEvent(event);
    setTimeout(function () {
      var fired = counters.error > before;
      trustResult.textContent = fired
        ? "The synthetic MouseEvent produced an error event — isTrusted=false is rejected."
        : "The synthetic MouseEvent was ignored outright: no prompt, no stream, no event.";
      log("warn", trustResult.textContent);
    }, 250);
  });

  /* =====================================================================
     6. <camera> and <microphone>
     ===================================================================== */

  var cameraEl = document.getElementById("cameraEl");
  var microphoneEl = document.getElementById("microphoneEl");
  var cameraVideo = document.getElementById("cameraVideo");
  var micLevelBar = document.getElementById("micLevelBar");
  var stopMicMeter = function () {};

  document.getElementById("camMicSupport").textContent = HAS_CAMERA
    ? "Both elements are available in this browser."
    : "Not available here. They ship in Chrome 153; earlier builds can turn them on with the CameraAndMicrophoneElements flag under chrome://flags/#enable-experimental-web-platform-features. The fallback buttons below are wired to getUserMedia() instead.";

  function showCameraPreview() {
    document.getElementById("cameraContainer").classList.remove("is-hidden");
    document.getElementById("cameraHint").classList.add("is-hidden");
  }

  wireFallbackButton(cameraEl.querySelector("[data-fallback]"), "camera", function (stream) {
    cameraVideo.srcObject = stream;
    showCameraPreview();
    updateTrackElementProps();
  });
  wireFallbackButton(microphoneEl.querySelector("[data-fallback]"), "microphone", function (stream) {
    stopMicMeter = attachMeter(stream.getAudioTracks()[0], micLevelBar);
    updateTrackElementProps();
  });

  if (HAS_CAMERA) {
    cameraEl.setConstraints({ width: 1280, height: 720, facingMode: "user" });
    log("info", "<camera>.setConstraints({ width: 1280, height: 720, facingMode: 'user' }) — note the flat shape");
  }
  if (HAS_MICROPHONE) {
    microphoneEl.setConstraints({ echoCancellation: true, noiseSuppression: true });
    log("info", "<microphone>.setConstraints({ echoCancellation: true, noiseSuppression: true })");
  }

  cameraEl.addEventListener("track", function () {
    log("info", "<camera> fired 'track'", cameraEl.track ? cameraEl.track.label : "no track");
    if (cameraEl.track) {
      watchTrack(cameraEl.track, "<camera>");
      cameraVideo.srcObject = new MediaStream([cameraEl.track]);
      showCameraPreview();
    }
    updateTrackElementProps();
    refreshGrantedState();
  });
  cameraEl.addEventListener("error", function () {
    log("error", "<camera> fired 'error': " + (cameraEl.error && cameraEl.error.name));
    updateTrackElementProps();
  });
  cameraEl.addEventListener("cancel", function () {
    log("warn", "<camera> fired 'cancel'");
  });

  microphoneEl.addEventListener("track", function () {
    log("info", "<microphone> fired 'track'", microphoneEl.track ? microphoneEl.track.label : "no track");
    if (microphoneEl.track) {
      watchTrack(microphoneEl.track, "<microphone>");
      stopMicMeter();
      stopMicMeter = attachMeter(microphoneEl.track, micLevelBar);
    }
    updateTrackElementProps();
    refreshGrantedState();
  });
  microphoneEl.addEventListener("error", function () {
    log("error", "<microphone> fired 'error': " + (microphoneEl.error && microphoneEl.error.name));
    updateTrackElementProps();
  });
  microphoneEl.addEventListener("cancel", function () {
    log("warn", "<microphone> fired 'cancel'");
  });

  var lastEnabled = {};
  function updateTrackElementProps() {
    [
      [cameraEl, "cameraProps", HAS_CAMERA, "camera"],
      [microphoneEl, "microphoneProps", HAS_MICROPHONE, "microphone"]
    ].forEach(function (entry) {
      var el = entry[0];
      var node = document.getElementById(entry[1]);
      var supported = entry[2];
      var name = entry[3];
      if (!supported) {
        fillDl(node, [["Element", "not implemented", "no"]]);
        return;
      }
      var track = el.track;
      if (track && lastEnabled[name] !== undefined && lastEnabled[name] !== track.enabled) {
        log(
          "info",
          "<" + name + "> toggled its track: enabled = " + track.enabled +
            " (that is the element's second-click behavior, not our code)"
        );
      }
      if (track) lastEnabled[name] = track.enabled;

      fillDl(node, [
        ["element.track", track ? "MediaStreamTrack" : "null", track ? "yes" : ""],
        ["track.label", track ? track.label || "(empty)" : "—", ""],
        ["track.readyState", track ? track.readyState : "—", track && track.readyState === "live" ? "yes" : ""],
        ["track.enabled", track ? String(track.enabled) : "—", track && track.enabled ? "yes" : "no"],
        ["track.muted", track ? String(track.muted) : "—", track && track.muted ? "no" : ""],
        ["element.error", el.error ? el.error.name : "null", el.error ? "no" : ""],
        ["matches(':granted')", safeMatches(el, ":granted"), ""]
      ]);
    });
  }
  trackChangeHandlers.push(updateTrackElementProps);
  updateTrackElementProps();

  /* =====================================================================
     7. Legacy type mode
     ===================================================================== */

  var legacyEl = document.getElementById("legacyUserMedia");
  var legacyStage = document.getElementById("legacyStage");
  var legacySupport = document.getElementById("legacySupport");

  legacySupport.textContent = HAS_LEGACY
    ? "Legacy mode is available in this build: HTMLUserMediaElement.isTypeSupported() exists, so the type attribute and the legacy properties below are live."
    : HAS_USERMEDIA
    ? "Legacy mode is not enabled in this build — HTMLUserMediaElement.isTypeSupported() is missing, so the type attribute is inert and the legacy properties read as undefined. That is the expected end state."
    : "No <usermedia> support in this browser, so there is nothing to inspect here.";

  wireFallbackButton(legacyEl.querySelector("[data-fallback]"), "usermedia (legacy)", function () {});

  ["promptaction", "promptdismiss", "validationstatuschange"].forEach(function (type) {
    legacyEl.addEventListener(type, function (event) {
      log(
        type === "promptdismiss" ? "warn" : "info",
        "<usermedia> in the legacy section fired '" + type + "'",
        type === "validationstatuschange"
          ? "isValid=" + legacyEl.isValid + " invalidReason=" + legacyEl.invalidReason
          : "permissionStatus=" + legacyEl.permissionStatus
      );
      updateLegacyProps();
    });
  });
  legacyEl.addEventListener("stream", function () {
    log("info", "<usermedia> in the legacy section fired 'stream'");
    if (legacyEl.stream) {
      legacyEl.stream.getTracks().forEach(function (t) {
        t.stop();
      });
    }
    updateLegacyProps();
  });
  legacyEl.addEventListener("error", function () {
    log("error", "<usermedia> in the legacy section fired 'error': " + (legacyEl.error && legacyEl.error.name));
    updateLegacyProps();
  });

  document.getElementById("legacyType").addEventListener("change", function (event) {
    var value = event.target.value;
    if (value) {
      legacyEl.setAttribute("type", value);
      var supported = HAS_LEGACY ? window.HTMLUserMediaElement.isTypeSupported(value) : null;
      log(
        "info",
        'Set type="' + value + '"' +
          (supported === null ? "" : " — isTypeSupported() says " + supported),
        "Changing an attribute also restarts the ~500 ms activation cooldown."
      );
    } else {
      legacyEl.removeAttribute("type");
      log("info", "Removed the type attribute — the element is back in standard <usermedia> mode");
    }
    updateLegacyProps();
  });

  var legacyOccluder = null;
  document.getElementById("legacyOcclude").addEventListener("click", function (event) {
    if (legacyOccluder) {
      legacyOccluder.remove();
      legacyOccluder = null;
      event.target.classList.remove("button--active");
      log("info", "Legacy element uncovered");
    } else {
      legacyStage.classList.add("element-stage--playground");
      legacyOccluder = document.createElement("div");
      legacyOccluder.className = "occluder";
      legacyOccluder.textContent = "Overlay — watch isValid and invalidReason below.";
      legacyStage.appendChild(legacyOccluder);
      event.target.classList.add("button--active");
      log("warn", "Legacy element covered by an overlay");
    }
    setTimeout(updateLegacyProps, 700);
  });

  function updateLegacyProps() {
    var node = document.getElementById("legacyProps");
    if (!HAS_USERMEDIA) {
      fillDl(node, [["<usermedia>", "not implemented", "no"]]);
      return;
    }
    var typed = legacyEl.hasAttribute("type");
    fillDl(node, [
      ["type attribute", typed ? legacyEl.getAttribute("type") : "(absent — standard mode)", typed ? "partial" : "yes"],
      [
        "isTypeSupported()",
        HAS_LEGACY && typed ? String(window.HTMLUserMediaElement.isTypeSupported(legacyEl.getAttribute("type"))) : "—",
        ""
      ],
      ["isValid", describeLegacy(legacyEl.isValid), legacyEl.isValid === false ? "no" : legacyEl.isValid === true ? "yes" : ""],
      ["invalidReason", describeLegacy(legacyEl.invalidReason) || "(none)", legacyEl.invalidReason ? "no" : ""],
      ["permissionStatus", describeLegacy(legacyEl.permissionStatus), ""],
      ["initialPermissionStatus", describeLegacy(legacyEl.initialPermissionStatus), ""],
      ["matches(':invalid')", safeMatches(legacyEl, ":invalid"), ""],
      ["element.error", legacyEl.error ? legacyEl.error.name : "null", legacyEl.error ? "no" : ""]
    ]);
  }

  function describeLegacy(value) {
    if (value === undefined) return "undefined (legacy mode off)";
    if (value === null) return "null";
    return String(value);
  }
  updateLegacyProps();
  setInterval(updateLegacyProps, 2000);

  /* =====================================================================
     8. Iframes
     ===================================================================== */

  window.addEventListener("message", function (event) {
    var data = event.data;
    if (!data || data.source !== "usermedia-demo-frame") return;
    log(
      data.level || "info",
      "iframe[" + data.label + "]: " + data.message,
      data.detail
    );
    if (data.label && data.summary) {
      document.getElementById("frameHint").textContent =
        "Latest from the " + data.label + " frame: " + data.summary;
    }
  });

  /* =====================================================================
     9. Fallback status & generated code
     ===================================================================== */

  document.getElementById("fallbackStatus").textContent = HAS_USERMEDIA
    ? "This browser supports the element, so the nested fallback buttons are hidden by the browser and never fire. The getUserMedia() path on this page is dormant."
    : "This browser does not support the element, so every nested button is visible and wired to getUserMedia(). That is the fallback path running for real.";

  function updateGeneratedCode() {
    var v = parseSet(videoInput);
    var a = parseSet(audioInput);
    var constraints = {
      video: v.ok ? sanitizeSet(v.value).kept : {},
      audio: a.ok ? sanitizeSet(a.value).kept : {}
    };
    var css = styleInput ? styleInput.value.replace(/#playgroundUserMedia/g, "usermedia") : "";

    var code =
      "<!-- Markup -->\n" +
      '<usermedia id="capture">\n' +
      '  <button id="capture-fallback">Enable camera and microphone</button>\n' +
      "</usermedia>\n\n" +
      "/* CSS — stays inside the rules Chrome enforces */\n" +
      css +
      "\n\nusermedia:granted {\n  background-color: #1f7a4d;\n}\n\n" +
      "// JavaScript\n" +
      "const el = document.getElementById('capture');\n" +
      "const video = document.querySelector('video');\n\n" +
      "if ('HTMLUserMediaElement' in window) {\n" +
      "  // Call this once, before the first click. Later calls are discarded.\n" +
      "  el.setConstraints(" +
      JSON.stringify(constraints, null, 2).replace(/\n/g, "\n  ") +
      ");\n\n" +
      "  el.addEventListener('stream', () => {\n" +
      "    video.srcObject = el.stream;\n" +
      "  });\n\n" +
      "  el.addEventListener('error', () => {\n" +
      "    console.error('Access failed:', el.error?.name);\n" +
      "  });\n\n" +
      "  el.addEventListener('cancel', () => {\n" +
      "    console.log('The user dismissed the prompt.');\n" +
      "  });\n" +
      "} else {\n" +
      "  document.getElementById('capture-fallback')\n" +
      "    .addEventListener('click', async () => {\n" +
      "      video.srcObject = await navigator.mediaDevices.getUserMedia({\n" +
      "        video: true, audio: true\n" +
      "      });\n" +
      "    });\n" +
      "}";

    document.getElementById("generatedCode").textContent = code;
  }

  document.getElementById("copyCode").addEventListener("click", function (event) {
    copyToClipboard(document.getElementById("generatedCode").textContent, event.target, "Copy code");
  });

  updateGeneratedCode();
})();
