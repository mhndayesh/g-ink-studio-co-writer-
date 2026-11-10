"""Concurrency sweep for the local llama-server.

Sends N simultaneous chat completions at each level and reports wall time,
aggregate tokens/sec, and per-request latency. Thinking is disabled so the
numbers measure generation, not hidden reasoning.
"""
import asyncio
import json
import statistics
import sys
import time

import httpx

BASE = "http://127.0.0.1:8080"
MODEL = "qwen3.6-35b-a3b"
PROMPT = (
    "Write a vivid three-sentence description of a storm moving over a desert "
    "city at dusk. Keep it under 120 words."
)
MAX_TOKENS = 128
LEVELS = [1, 2, 4, 8, 12, 16]


async def one(client: httpx.AsyncClient, idx: int) -> dict:
    body = {
        "model": MODEL,
        "messages": [{"role": "user", "content": f"{PROMPT} (request {idx})"}],
        "max_tokens": MAX_TOKENS,
        "temperature": 0.2,
        "stream": False,
        "ignore_eos": True,
        "chat_template_kwargs": {"enable_thinking": False},
    }
    started = time.perf_counter()
    try:
        r = await client.post(f"{BASE}/v1/chat/completions", json=body, timeout=600)
        elapsed = time.perf_counter() - started
        data = r.json()
        usage = data.get("usage") or {}
        return {
            "ok": r.status_code == 200,
            "latency": elapsed,
            "completion": int(usage.get("completion_tokens") or 0),
            "prompt": int(usage.get("prompt_tokens") or 0),
            "status": r.status_code,
        }
    except Exception as exc:
        return {
            "ok": False,
            "latency": time.perf_counter() - started,
            "completion": 0,
            "prompt": 0,
            "status": str(exc),
        }


async def run_level(n: int) -> dict:
    async with httpx.AsyncClient() as client:
        started = time.perf_counter()
        results = await asyncio.gather(*[one(client, i) for i in range(n)])
        wall = time.perf_counter() - started

    ok = [r for r in results if r["ok"]]
    completion = sum(r["completion"] for r in ok)
    latencies = [r["latency"] for r in results]
    return {
        "concurrency": n,
        "ok": len(ok),
        "wall_s": round(wall, 2),
        "completion_tokens": completion,
        "aggregate_tok_s": round(completion / wall, 1) if wall else 0,
        "avg_latency_s": round(statistics.mean(latencies), 2) if latencies else 0,
        "p95_latency_s": round(sorted(latencies)[max(0, int(len(latencies) * 0.95) - 1)], 2) if latencies else 0,
        "avg_tok_s_per_req": round(
            statistics.mean([r["completion"] / r["latency"] for r in ok]), 1
        ) if ok else 0,
    }


async def warmup() -> None:
    async with httpx.AsyncClient() as client:
        for i in range(2):
            await one(client, 9000 + i)


async def main() -> None:
    print(f"model={MODEL} max_tokens={MAX_TOKENS} thinking=off ignore_eos=on")
    await warmup()
    rows = []
    for n in LEVELS:
        row = await run_level(n)
        rows.append(row)
        print(json.dumps(row), flush=True)
        await asyncio.sleep(2)
    print("\nSUMMARY")
    print(json.dumps(rows, indent=2))


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        sys.exit(130)
