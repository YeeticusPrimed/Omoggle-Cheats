# Omoggle Score Changer

A Tampermonkey userscript that lets you set your own score on [Omoggle](https://omoggle.com).

## Installation

1. Install [Tampermonkey](https://www.tampermonkey.net/) for your browser
2. Click **Create a new script**
3. Paste the contents of the script and save
4. Navigate to Omoggle — the UI will appear automatically

## Usage

The panel has two independent sliders:

**Final Score** (green)
- Controls the score submitted to the server at match finalization
- This is what determines win/loss and ELO change
- Use preset buttons or drag the slider

**What Opponent Sees** (orange)
- Controls the live score broadcast to your opponent during the match
- Updates in real time every frame via LiveKit
- Can be set independently from your final score

Both show **ACTIVE ✓** immediately on page load — no waiting required.

Drag the panel anywhere by clicking and holding the header.

## Preset Buttons

| Button | Score |
|--------|-------|
| 1.0 | Low |
| 3.0 | Below average |
| 7.5 | High |
| 9.8 | Near perfect |

## How It Works

The script uses two intercept strategies that activate before any page code runs:

**Final Score** — patches `JSON.stringify` at the document level. Every time the site serializes the match finalization payload (containing `selfScore` and `opponentScore`) the value is replaced with your chosen score before it reaches the server at `/api/match/finalize`.

**Live Score** — patches `TextEncoder.prototype.encode` at the document level. Every LiveKit `publishData` call encodes its payload through `TextEncoder` first, so any `SCAN_STATE` message broadcast to your opponent is intercepted and rewritten with your chosen value before it leaves your browser.

Additionally a background async scan patches the webpack scoring module (`VA`, `cv`, `cM`) for extra coverage, without freezing the page.

## Notes

- Both hooks activate instantly on page load — no scanning delay
- Final Score and Live Score can be set to different values
- Set your scores before entering a match
- Works across deploys since it does not rely on hardcoded webpack module IDs for the critical intercepts

## Compatibility

| Browser | Supported |
|---------|-----------|
| Chrome  | ✅ |
| Firefox | ✅ |
| Edge    | ✅ |
| Safari  | ⚠️ Tampermonkey support varies |

## Disclaimer

This script is for educational purposes only. Use at your own risk.
