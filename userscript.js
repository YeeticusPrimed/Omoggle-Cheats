// ==UserScript==
// @name         Omoggle Set Score
// @namespace    http://tampermonkey.net/
// @version      1
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

          const origStringify = JSON.stringify;
          JSON.stringify = function(value, ...args) {
            if (value && typeof value === 'object' && 'selfScore' in value && 'opponentScore' in value) {
              value = { ...value, selfScore: window.__mogTargetScore ?? 9.8 };
            }
            return origStringify.call(this, value, ...args);
          };

          window.__mogScorePatched = true;
          console.log('[Score Hook] Patched successfully');
        }

        // Scan in small async batches so the page doesnt freeze
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
                  console.log('[Score Hook] Found at id:', id);
                  patchMod(mod);
                  return; // done
                }
              } catch(e) {}
            }
            if (id < MAX) {
              setTimeout(nextBatch, 0); // yield to browser between batches
            } else {
              console.warn('[Score Hook] Module not found after full scan');
            }
          }

          nextBatch();
        }

        function tryStart() {
          const require = getRequire();
          if (!require) return false;
          scanAsync(require);
          return true;
        }

        // Wait for webpack to be ready then start scanning
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
    ui.style = "position:fixed; top:20px; left:20px; z-index:1000000; background:#000; border:3px solid #00ff88; border-radius:15px; padding:15px; width:220px; box-shadow:0 0 15px #00ff88; user-select:none;";

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

    const scoreDisplay = document.createElement('div');
    scoreDisplay.style = "color:#00ff88; font-family:monospace; font-size:36px; font-weight:900; text-align:center; margin-bottom:8px;";
    scoreDisplay.innerText = "9.8";
    ui.appendChild(scoreDisplay);

    function updateScore(val) {
      window.__mogTargetScore = val;
      scoreDisplay.innerText = val.toFixed(1);
      scoreDisplay.style.color = val >= 8 ? "#00ff88" : val >= 6 ? "#f5a623" : "#eb4034";
    }

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = 0;
    slider.max = 10;
    slider.step = 0.1;
    slider.value = 9.8;
    slider.style = "width:100%; accent-color:#00ff88; margin-bottom:10px;";
    slider.oninput = () => updateScore(parseFloat(slider.value));
    ui.appendChild(slider);

    const presets = document.createElement('div');
    presets.style = "display:grid; grid-template-columns:repeat(4,1fr); gap:4px; margin-bottom:10px;";
    [3.0, 5.0, 7.5, 9.8].forEach(val => {
      const btn = document.createElement('button');
      btn.innerText = val.toFixed(1);
      btn.style = "background:#111; color:#00ff88; border:1px solid #00ff8844; padding:5px 0; border-radius:6px; font-family:monospace; font-size:11px; font-weight:bold; cursor:pointer;";
      btn.onmouseenter = () => btn.style.background = "#00ff8822";
      btn.onmouseleave = () => btn.style.background = "#111";
      btn.onclick = () => { updateScore(val); slider.value = val; };
      presets.appendChild(btn);
    });
    ui.appendChild(presets);

    const statusEl = document.createElement('div');
    statusEl.style = "font-family:monospace; font-size:10px; text-align:center; color:#ff4444;";
    statusEl.innerText = "Hook: scanning...";
    ui.appendChild(statusEl);

    const poll = setInterval(() => {
      if (window.__mogScorePatched) {
        statusEl.style.color = "#00ff88";
        statusEl.innerText = "Hook: ACTIVE ✓";
        clearInterval(poll);
      }
    }, 500);

    document.body.appendChild(ui);
  }

  setInterval(injectUI, 1000);
})();
