// ==UserScript==
// @name         Omoggle Set Score
// @namespace    http://tampermonkey.net/
// @version      4
// @description  Set your score!
// @author       ConMan
// @match        *://*.omoggle.com/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
  'use strict';

  function injectPatcher() {
    const script = document.createElement('script');
    script.textContent = `
      (function() {
        window.__mogTargetScore = 9.8;
        window.__mogOpponentTargetScore = 9.8;

        // Patch JSON.stringify early
        const origStringify = JSON.stringify;
        JSON.stringify = function(value, ...args) {
          if (value && typeof value === 'object' && 'selfScore' in value && 'opponentScore' in value) {
            console.log('[Score Hook] Intercepted finalize payload');
            value = { ...value, selfScore: window.__mogTargetScore ?? 9.8 };
          }
          return origStringify.call(this, value, ...args);
        };

        // Patch TextEncoder early for live SCAN_STATE
        const origEncode = TextEncoder.prototype.encode;
        TextEncoder.prototype.encode = function(str) {
          if (typeof str === 'string' && str.includes('SCAN_STATE')) {
            try {
              const parsed = JSON.parse(str);
              if (parsed.type === 'SCAN_STATE' && parsed.payload) {
                const s = window.__mogOpponentTargetScore ?? 9.8;
                parsed.payload.overall = s;
                parsed.payload.isFaceStraight = true;
                parsed.payload.faceStatus = 'perfect';
                parsed.payload.scoringConfidence = 1.0;
                if (parsed.payload.eyes !== undefined) parsed.payload.eyes = s;
                if (parsed.payload.jawline !== undefined) parsed.payload.jawline = s;
                if (parsed.payload.symmetry !== undefined) parsed.payload.symmetry = s * 10;
                if (parsed.payload.midface !== undefined) parsed.payload.midface = s;
                if (parsed.payload.cheekbones !== undefined) parsed.payload.cheekbones = s;
                if (parsed.payload.eyeAspect !== undefined) parsed.payload.eyeAspect = s;
                if (parsed.payload.harmony !== undefined) parsed.payload.harmony = s;
                str = JSON.stringify(parsed);
              }
            } catch(e) {}
          }
          return origEncode.call(this, str);
        };

        // Both intercepts are active immediately
        window.__mogScorePatched = true;
        window.__mogLiveKitPatched = true;
        console.log('[Score Hook] Early intercepts active');

        // Webpack module patch runs async in background for extra coverage
        function getRequire() {
          try {
            let req = null;
            const chunk = window.webpackChunk_N_E;
            if (!chunk) return null;
            chunk.push([[Symbol()], {}, function(r) { req = r; }]);
            return req;
          } catch(e) { return null; }
        }

        function patchMod(mod) {
          const origVA = mod.VA;
          mod.VA = function(e, t, r, n) {
            const result = origVA(e, t, r, n);
            if (result) {
              const s = window.__mogTargetScore ?? 9.8;
              result.overall = s;
              if (result.traits) result.traits = result.traits.map(t => ({...t, score: s}));
              if (result.rawMetrics) result.rawMetrics.overall = s;
              if (result.quality) {
                result.quality.reliability = 1.0;
                result.quality.confidence = 1.0;
                result.quality.accepted = true;
              }
            }
            return result;
          };

          const origCV = mod.cv;
          mod.cv = function(e) {
            const result = origCV(e);
            if (result) {
              result.overall = window.__mogTargetScore ?? 9.8;
              if (result.rawMetrics) result.rawMetrics.overall = window.__mogTargetScore ?? 9.8;
            }
            return result;
          };

          const origCM = mod.cM;
          mod.cM = function(e, t, r) {
            const result = origCM(e, t, r);
            if (result) {
              result.reliability = 1.0;
              result.confidence = 1.0;
              result.accepted = true;
            }
            return result;
          };

          console.log('[Score Hook] Webpack module also patched for extra coverage');
        }

        function scanAsync(require) {
          let id = 0;
          const BATCH = 500;
          const MAX = 200000;

          function nextBatch() {
            const end = Math.min(id + BATCH, MAX);
            for (; id < end; id++) {
              try {
                const mod = require(id);
                if (mod && typeof mod.VA === 'function' && typeof mod.cv === 'function' && typeof mod.cM === 'function') {
                  console.log('[Score Hook] Found webpack module at id:', id);
                  patchMod(mod);
                  return;
                }
              } catch(e) {}
            }
            if (id < MAX) setTimeout(nextBatch, 0);
          }

          nextBatch();
        }

        function tryStart() {
          const require = getRequire();
          if (!require) return false;
          scanAsync(require);
          return true;
        }

        const interval = setInterval(() => {
          if (tryStart()) clearInterval(interval);
        }, 500);
      })();
    `;
    (document.head || document.documentElement).appendChild(script);
    script.remove();
  }

  injectPatcher();

  function injectUI() {
    if (document.getElementById('score-ui')) return;

    const ui = document.createElement('div');
    ui.id = "score-ui";
    ui.style = "position:fixed; top:20px; left:20px; z-index:1000000; background:#000; border:3px solid #00ff88; border-radius:15px; padding:15px; width:240px; box-shadow:0 0 15px #00ff88; user-select:none;";

    const header = document.createElement('div');
    header.style = "color:#00ff88; font-weight:bold; font-family:monospace; font-size:13px; text-align:center; padding-bottom:8px; margin-bottom:10px; border-bottom:1px solid #00ff8844; cursor:grab;";
    header.innerText = "⠿ SCORE CHANGER";
    ui.appendChild(header);

    let dragging = false, ox = 0, oy = 0;
    header.addEventListener('mousedown', (e) => {
      if (e.target !== header) return;
      dragging = true;
      ox = e.clientX - ui.getBoundingClientRect().left;
      oy = e.clientY - ui.getBoundingClientRect().top;
      header.style.cursor = "grabbing";
      e.preventDefault();
    });
    document.addEventListener('mousemove', (e) => {
      if (!dragging) return;
      ui.style.left = Math.max(0, Math.min(window.innerWidth - ui.offsetWidth, e.clientX - ox)) + 'px';
      ui.style.top = Math.max(0, Math.min(window.innerHeight - ui.offsetHeight, e.clientY - oy)) + 'px';
    });
    document.addEventListener('mouseup', () => {
      dragging = false;
      header.style.cursor = "grab";
    });

    function makeSection(labelText, labelColor, accentColor, defaultVal, onUpdate) {
      const wrap = document.createElement('div');

      const label = document.createElement('div');
      label.style = `color:${labelColor}; font-family:monospace; font-size:10px; font-weight:bold; text-transform:uppercase; letter-spacing:0.15em; margin-bottom:4px;`;
      label.innerText = labelText;
      wrap.appendChild(label);

      const display = document.createElement('div');
      display.style = `color:${labelColor}; font-family:monospace; font-size:32px; font-weight:900; text-align:center; margin-bottom:4px;`;
      display.innerText = defaultVal.toFixed(1);
      wrap.appendChild(display);

      const slider = document.createElement('input');
      slider.type = 'range';
      slider.min = 0;
      slider.max = 10;
      slider.step = 0.1;
      slider.value = defaultVal;
      slider.style = `width:100%; accent-color:${accentColor}; margin-bottom:8px;`;

      function update(val) {
        display.innerText = val.toFixed(1);
        display.style.color = val >= 8 ? "#00ff88" : val >= 6 ? "#f5a623" : "#eb4034";
        onUpdate(val);
      }

      slider.oninput = () => update(parseFloat(slider.value));
      wrap.appendChild(slider);

      const presets = document.createElement('div');
      presets.style = "display:grid; grid-template-columns:repeat(4,1fr); gap:4px; margin-bottom:12px;";
      [1.0, 3.0, 7.5, 9.8].forEach(val => {
        const btn = document.createElement('button');
        btn.innerText = val.toFixed(1);
        btn.style = `background:#111; color:${accentColor}; border:1px solid ${accentColor}44; padding:4px 0; border-radius:6px; font-family:monospace; font-size:11px; font-weight:bold; cursor:pointer;`;
        btn.onmouseenter = () => btn.style.background = accentColor + "22";
        btn.onmouseleave = () => btn.style.background = "#111";
        btn.onclick = () => { update(val); slider.value = val; };
        presets.appendChild(btn);
      });
      wrap.appendChild(presets);

      return wrap;
    }

    ui.appendChild(makeSection(
      "Final Score",
      "#00ff88",
      "#00ff88",
      9.8,
      val => { window.__mogTargetScore = val; }
    ));

    const divider = document.createElement('div');
    divider.style = "border-top:1px solid #00ff8822; margin-bottom:12px;";
    ui.appendChild(divider);

    ui.appendChild(makeSection(
      "What Opponent Sees",
      "#f5a623",
      "#f5a623",
      9.8,
      val => { window.__mogOpponentTargetScore = val; }
    ));

    const divider2 = document.createElement('div');
    divider2.style = "border-top:1px solid #00ff8822; margin-bottom:8px;";
    ui.appendChild(divider2);

    const statusFinal = document.createElement('div');
    statusFinal.style = "font-family:monospace; font-size:10px; text-align:center; color:#00ff88;";
    statusFinal.innerText = "Final Score: ACTIVE ✓";
    ui.appendChild(statusFinal);

    const statusLive = document.createElement('div');
    statusLive.style = "font-family:monospace; font-size:10px; text-align:center; color:#00ff88; margin-top:2px;";
    statusLive.innerText = "Live Score: ACTIVE ✓";
    ui.appendChild(statusLive);

    document.body.appendChild(ui);
  }

  setInterval(injectUI, 1000);
})();
