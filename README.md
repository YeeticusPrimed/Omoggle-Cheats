# Omoggle Score Changer

A Tampermonkey userscript that lets you set your own score on [Omoggle](https://omoggle.com).

## Installation

1. Install [Tampermonkey](https://www.tampermonkey.net/) for your browser
2. Click **Create a new script**
3. Paste the contents of the script and save
4. Navigate to Omoggle — the UI will appear automatically

## Usage

The panel has three sections:

### My Score (green)
- Controls your local score display during the match
- Controls the score submitted to the server at match finalization
- This is what determines win/loss and ELO change
- Use preset buttons or drag the slider

### What Opponent Sees (orange)
- Controls the live score broadcast to your opponent during the match
- Updates in real time every frame via LiveKit
- Can be set independently from your final score

### Fluctuation (orange slider, below opponent section)
- Adds random noise to the score your opponent sees each frame
- Range is `±value` around the base opponent score
- Example: base `7.0` with fluctuation `1.0` means opponent sees between `6.0` and `8.0` each frame, chosen randomly
- Set to `0` for a completely steady score
- Max fluctuation is `±3.0`

Drag the panel anywhere by clicking and holding the header.

## Preset Buttons

| Button | Score |
|--------|-------|
| 1.0 | Low |
| 3.0 | Below average |
| 7.5 | High |
| 9.8 | Near perfect |

## How It Works

The script uses multiple intercept strategies that activate before any page code runs:

**My Score / Final Score** — patches `JSON.stringify` at the document level. Every time the site serializes the match finalization payload the `selfScore` field is replaced with your chosen value before it reaches the server at `/api/match/finalize`. Also patches the Zustand store's `setState` and the webpack scoring functions (`VA`, `cv`, `cM`) so the local display matches. A MutationObserver fallback keeps the on-screen number locked as a last resort.

**What Opponent Sees** — patches `TextEncoder.prototype.encode` at the document level. Every LiveKit `publishData` call encodes its payload through `TextEncoder` first, so any `SCAN_STATE` message broadcast to your opponent is intercepted and rewritten with your chosen value before it leaves your browser. If fluctuation is set above `0`, random noise is added to each frame independently.

A background async scan also patches the webpack scoring module without freezing the page, scanning in batches of 500 modules at a time.

## Notes

- Both hooks activate instantly on page load
- My Score and What Opponent Sees can be set to different values
- Fluctuation only affects what the opponent sees, not your final score
- Set your scores before entering a match
- Works across deploys since critical intercepts do not rely on hardcoded webpack module IDs

## Compatibility

| Browser | Supported |
|---------|-----------|
| Chrome  | ✅ |
| Firefox | ✅ |
| Edge    | ✅ |
| Safari  | ⚠️ Tampermonkey support varies |

## Disclaimer

This script is for educational purposes only. Use at your own risk.
