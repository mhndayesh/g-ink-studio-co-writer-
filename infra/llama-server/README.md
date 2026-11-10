# llama-server (llama.cpp) — local inference

Raw `llama-server` is the local inference backend for this project on Windows.
It replaces LM Studio / vLLM for headless, high-concurrency serving on dual AMD
GPUs.

| Item | Value |
|---|---|
| Runtime | llama.cpp `llama-server` (Windows Vulkan x64) |
| Release | newest `b####` (verified with **b12246**) |
| GPU | 2 × AMD Radeon RX 9070 XT (16 GB) → `Vulkan0`, `Vulkan1` |
| Endpoint | `http://127.0.0.1:8081/v1` (OpenAI-compatible) |
| Model alias | configurable; this machine uses `qwen3.6-35b-a3b` (`local` is also accepted) |

## Install

From the repo root:

```powershell
powershell -ExecutionPolicy Bypass -File infra\llama-server\install.ps1
```

This copies the scripts to `C:\llama`, creates `C:\llama\models`, writes
`config.env` if missing, and downloads the newest Windows Vulkan build.

Then:

1. Put a `.gguf` in `C:\llama\models`.
2. Set `MODEL=` in `C:\llama\config.env`.
3. Run `C:\llama\start-server.bat`.
4. Check `powershell -File C:\llama\status.ps1`.

## Dual-GPU defaults

```
DEVICES=Vulkan0,Vulkan1
SPLIT_MODE=layer
TENSOR_SPLIT=1,1
GPU_LAYERS=999
```

- `layer` is the safest split for models that fit in 32 GB combined.
- `row` can speed prompt processing; try after the model is stable.
- `tensor` is the most parallel but the most fragile on Vulkan.
- `none` + `MAIN_GPU` for a single card.

## Concurrency

| Knob | Meaning |
|---|---|
| `PARALLEL` (`-np`) | concurrent request slots |
| `CTX` (`-c`) | total context tokens shared by slots |
| `KV_UNIFIED=1` | one dynamic KV pool across slots |
| `CACHE_REUSE` | prompt-prefix reuse (matters for G-Ink's stable story context) |
| `KV_K` / `KV_V` | `f16`, `q8_0`, or `q4_0` (default for the 256k profiles) |

G-Ink uses two 256k-token profiles on this machine:

| Profile | `CTX` | `PARALLEL` | `KV_UNIFIED_PER_SLOT` | VRAM | Verified prompt |
|---|---:|---:|---:|---:|---:|
| Long window | 262144 | 4 | 65536 | 23.0 GB | 64,621 tokens |
| More concurrency | 262144 | 6 | 43690 | 23.2 GB | 39,121 tokens |

Both use KV `q4_0`, `UBATCH=1024`, `CACHE_REUSE=0`, and thinking disabled. The
per-slot cap bounds a single request; the total pool can be borrowed by one long
request when other slots are idle.

## PagedAttention vs llama.cpp

llama.cpp does **not** implement vLLM-style PagedAttention. Its equivalents are:

| vLLM | llama.cpp |
|---|---|
| PagedAttention blocks | unified KV pool (`--kv-unified`) |
| continuous batching | `--cont-batching` (default on) |
| sequence slots | `--parallel N` |
| per-request page table | slot KV allocation inside the shared pool |

Quantized KV is supported for both K and V: `q4_0`, `q4_1`, `iq4_nl`, `q5_0`,
`q5_1`, `q8_0`, plus `f16`/`bf16`/`f32`. On Vulkan/RDNA4 there is a merged Q4_0
KV flash-attention fast path (llama.cpp PR #30738). Quantized KV normally wants
flash attention; this Qwen3.6 hybrid model currently makes Vulkan disable FA
(`Flash Attention over K/V rows not supported`), so q4_0 KV still loads but runs
on the non-FA path. `--split-mode row` is **not** supported on Vulkan
(`device Vulkan0 does not support split buffers`); use `layer`.

## Historical concurrency baseline

Earlier 131k/16 baseline on 2 x RX 9070 XT, **Qwen3.6-35B-A3B IQ4_XS** (4.25 bpw), KV `q4_0`, `CTX=131072`,
`PARALLEL=16`, `--kv-unified`, thinking off, 128 output tokens, `ignore_eos`.

| Concurrent requests | Wall time | Aggregate tok/s | Avg latency | Per-request tok/s |
|---:|---:|---:|---:|---:|
| 1 | 1.7 s | 76 | 1.7 s | 76 |
| 2 | 2.3 s | 113 | 2.3 s | 57 |
| 4 | 4.0 s | 129 | 4.0 s | 32 |
| 8 | 7.4 s | 138 | 7.4 s | 17 |
| 12 | 11.5 s | 134 | 11.5 s | 11 |
| 16 | 14.6-32.7 s | 63-140 | 14.6-32.7 s | 4-9 |

Throughput plateaus around **130-140 tok/s** from 4 concurrent requests upward.
All 16 slots accept work, but above ~8 requests the extra calls mostly queue:
prefill and decode contend, so latency rises while aggregate throughput does not.
Practical sweet spot: **4-8 concurrent** for interactive use; 16 is the configured
maximum. VRAM in this run: ~13.7 GB + ~9.6 GB = **23.3 GB of 32 GB**.

Reproduce with `bench_concurrency.py` (requires `httpx`):

```powershell
python infra\llama-server\bench_concurrency.py
```

## Point the app at it

```env
LLM_PROVIDER=llamacpp
LLAMACPP_BASE_URL=http://localhost:8081/v1
LLAMACPP_MODEL=local
```

The `llamacpp` preset is local-first: loopback/LAN base URLs are allowed for it,
but cloud metadata endpoints remain blocked.

Embeddings: a chat GGUF does not serve `/v1/embeddings`. Run a second
`llama-server` with an embedding model and `--embeddings`, or keep a dedicated
embedding provider. The app's embedding lane degrades/falls back automatically.

## Update

```powershell
powershell -File C:\llama\update-llama.ps1
```

Resolves the newest `b####` release, downloads `llama-*-bin-win-vulkan-x64.zip`,
and overlays it while preserving `config.env`.

## Files

```
infra/llama-server/
  install.ps1            deploy to C:\llama + download build
  update-llama.ps1       update the build in place
  start-server.ps1       launcher (reads config.env)
  start-server.bat       double-click wrapper
  stop-server.bat
  status.ps1             /health + /props + /slots check
  config.example.env     copy to C:\llama\config.env
```
