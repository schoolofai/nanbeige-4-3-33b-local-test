# Nanbeige4.3-33B on a Mac vs Claude Code and Codex

Video: https://youtu.be/iv3w_SiQ-8Q

Same three tests, same prompts, on the free open-weight Nanbeige4.3-33B (run locally with MLX on a MacBook Pro M4 Max, 128 GB, macOS 15) and on two frontier agents (Claude Code with Opus 5.5, Codex CLI with GPT-6.1 Sol).

| test | Claude Code (Opus 5.5) | Codex CLI (GPT-6.1 Sol) | Nanbeige4.3-33B MLX 4-bit | Nanbeige4.3-33B MLX 8-bit |
|---|---|---|---|---|
| Trick questions (4) | 4/4, 5.6 s | 4/4, 8.6 s | 3/4 (A2 wrong), 91 s, 1,219 tok | 3/4 (A2 wrong), 267 s, 2,344 tok |
| Bug hunt (2 planted bugs, pytest) | 2/2, 4/4 tests, 17.3 s | 2/2, 4/4 tests, 26.2 s | 2/2, 4/4 tests, 274 s | 2/2, 4/4 tests, 296 s |
| Snake, one HTML file | plays, 0 JS errors, 29.2 s | plays, 0 JS errors, 30.8 s | plays: moves, eats, grows, scores, game over, restart; 0 JS errors; 55 min, 36,346 tok | plays: moves, eats, grows, scores, game over, restart; 0 JS errors; 65 min, 30,499 tok |
| Generation speed (mean of 3 x 600-token runs, nothing else running) | cloud | cloud | 15.0 tok/s (peak 18.8 GB) | 8.8 tok/s (peak 35.4 GB) |

Model: https://huggingface.co/Nanbeige/Nanbeige4.3-33B (Apache-2.0). MLX builds used: https://huggingface.co/fcmeyer/Nanbeige4.3-33B-MLX-4bit and https://huggingface.co/fcmeyer/Nanbeige4.3-33B-MLX-8bit (community conversions, not official files).

Snake note: both Nanbeige builds wrote a working game, but it takes a long time. With thinking on, the 4-bit build generated 36,346 tokens (10.9 tok/s, 55 minutes, peak 26.8 GB) and the 8-bit build 30,499 tokens (7.8 tok/s, 65 minutes, peak 42.0 GB), most of it reasoning before the code. Both finished on their own (finish reason `stop`). We tested each game headless in Chrome with `tools/test_snake.js`: it starts, moves, eats six pieces of food (length and score go up by one each time, and the on-screen score matches), ends the game on hitting itself and on hitting the wall, and restarts at score 0. No console errors. Results: `results/nanbeige/mlx*/snake_test.json`.

Raw Nanbeige outputs: `results/nanbeige/mlx4/` and `results/nanbeige/mlx8/` (runs.jsonl, speed_clean.jsonl, t1/t2/t3 outputs, snake.html, snake_test.json, grade.json).

## Which Mac do you need?
Weights (file sizes) plus the KV cache. From the official config.json (52 layers, 8 KV heads, head size 128) the 16-bit cache is about 0.21 MB per token: 8K tokens about 1.7 GB, 32K about 7 GB, 128K about 28 GB.

| unified memory | what fits (estimate) |
|---|---|
| 16 GB | not practical (smallest GGUF, IQ2_XXS, is 10.07 GB before any context) |
| 24 GB | 3-bit (IQ3_XXS 14.49 GB) with short context |
| 32-36 GB | 4-bit (MLX 4-bit 18.65 GB, Q4_K_M 20.79 GB) with 8K-32K context |
| 48 GB | 6-bit (Q6_K 29.02 GB) with 32K context |
| 64 GB+ | 8-bit (MLX 8-bit 35.21 GB, Q8_0 35.2 GB) with 64K+ context |
| 128 GB | 8-bit with 128K context, or the full 16-bit weights (66.2 GB) |

## Quick start (timestamps are from the video)

### 1. Get the repo (1:33)
```bash
git clone https://github.com/schoolofai/nanbeige-4-3-33b-local-test
cd nanbeige-4-3-33b-local-test
```

### 2. Run Nanbeige on your Mac (0:11)
Needs Apple silicon, Python 3.10+, and about 19 GB (4-bit) or 35 GB (8-bit) of free disk. Everything installs into `mac/.venv`.
```bash
bash mac/run_nanbeige_mac.sh
```
What you should see: `mac/run.log` ends with `ALL_DONE`; each line in `mac/out/mlx4/runs.jsonl` holds `gen_tps` (tokens per second) and `peak_mem_gb`. To run only the 4-bit build, delete the 8-bit line in the `for pair in` loop.

### 3. Grade the bug hunt (3:36)
Copy the code block from `mac/out/mlx4/t3_bug.txt` into `bug_hunt/cart.py`, then:
```bash
python3 -m pip install pytest
python3 -m pytest -q bug_hunt
```
Expected for a correct fix: `4 passed`.

### 4. Check the Snake game (3:57)
Save the html block from `mac/out/mlx4/t1_game.txt` as `snake.html` and open it in a browser, or run the headless check (needs Node and Chrome):
```bash
npm install puppeteer-core
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" node tools/check.js snake.html nanbeige
```
Expected: `"errors":[]` and four screenshots `nanbeige_0start.png` ... `nanbeige_3restart.png`. For the full gameplay test (eat, grow, score, game over, restart): `node tools/test_snake.js snake.html snake_out` (set `CHROME` the same way).

Heads-up: the Snake prompt took Nanbeige about an hour on an M4 Max (55 min on 4-bit, 65 min on 8-bit), because it thinks for 25,000+ tokens first. Start it and walk away.

### 5. Run the frontier side (optional, 3:05)
Needs your own Claude Code and Codex CLI logins; it uses your plan's usage. Work happens in throwaway folders under /tmp.
```bash
bash frontier/run_frontier.sh
```
Results land in `results/frontier/`.

## Notes
- Sampling for Nanbeige follows the model card's "reasoning and chat" row: temperature 0.6, top-p 0.95. Thinking is on (the card's default).
- Benchmark numbers in the video come from Nanbeige's own model card table.
- Code in this repo: MIT. The model is Apache-2.0 and is not included here.
