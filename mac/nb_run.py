"""Nanbeige4.3-33B on the Mac with mlx-lm: same three prompts as Codex/Claude + speed bench.
Usage: python nb_run.py <hf_repo> <tag>   (writes out/<tag>/...)"""
import sys, json, time, pathlib, re, platform, subprocess
import mlx.core as mx
from mlx_lm import load, stream_generate
from mlx_lm.sample_utils import make_sampler
repo, tag = sys.argv[1], sys.argv[2]
H = pathlib.Path(__file__).parent; O = H / "out" / tag; O.mkdir(parents=True, exist_ok=True)
t0 = time.time(); model, tok = load(repo); load_s = time.time() - t0
mx.random.seed(7)
samp = make_sampler(temp=0.6, top_p=0.95)  # model card: reasoning and chat tasks
def run(name, user, max_tokens):
    msgs = [{"role": "user", "content": user}]
    prompt = tok.apply_chat_template(msgs, add_generation_prompt=True, tokenize=False)
    text, last = "", None; s = time.time()
    for r in stream_generate(model, tok, prompt, max_tokens=max_tokens, sampler=samp):
        text += r.text; last = r
    rec = {"name": name, "wall_s": round(time.time() - s, 1), "prompt_tokens": last.prompt_tokens,
           "prompt_tps": round(last.prompt_tps, 1), "gen_tokens": last.generation_tokens,
           "gen_tps": round(last.generation_tps, 2), "peak_mem_gb": round(last.peak_memory, 2),
           "finish": getattr(last, "finish_reason", None)}
    (O / f"{name}.txt").write_text(text); print(json.dumps(rec), flush=True)
    with open(O / "runs.jsonl", "a") as f: f.write(json.dumps(rec) + "\n")
    return text
meta = {"repo": repo, "load_s": round(load_s, 1), "mlx": mx.__version__, "macos": platform.mac_ver()[0],
        "chip": subprocess.run(["sysctl", "-n", "machdep.cpu.brand_string"], capture_output=True, text=True).stdout.strip(),
        "mem_bytes": int(subprocess.run(["sysctl", "-n", "hw.memsize"], capture_output=True, text=True).stdout)}
(O / "meta.json").write_text(json.dumps(meta, indent=1)); print(json.dumps(meta), flush=True)
run("speed", "Explain in about 300 words how a hash map works.", 600)
run("t2_puzzle", (H.parent / "prompts" / "t2_puzzle.txt").read_text(), 8192)
bug = (H.parent / "prompts" / "t3_bug.txt").read_text() + "\n\ncart.py:\n```python\n" + (H.parent / "bug_hunt" / "cart.py").read_text() + "```\n\ntest_cart.py:\n```python\n" + (H.parent / "bug_hunt" / "test_cart.py").read_text() + "```\nReply with the full fixed cart.py in one ```python code block, then the explanation."
run("t3_bug", bug, 8192)
run("t1_game", (H.parent / "prompts" / "t1_game.txt").read_text(), 16384)
print("TAG_DONE", tag, flush=True)
