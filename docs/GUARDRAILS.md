# Local Project Operational Guardrails

> **NOTICE**: This repository is strictly for private, local user usage. It is not intended for redistribution, professional broadcast, or public release.

---

## 1. Zero Data Leakage & Local Isolation
- **Local Repo Only**: Do not push to or pull from any public or remote Git repositories (GitHub, GitLab, Bitbucket, etc.).
- **No Online Public Posting**: Never post private local logs, telemetry data, channel listings, database dumps, or local paths to online forums, pastebins, or social media sites.
- **Local Markdown Logs Only**: Record all operational findings, handoffs, and recommendations exclusively to local markdown files in `/docs` and artifact paths.
- **Credential & Privacy Protection**: Keep all API keys, local ports, system paths, and personal viewing habits strictly confidential. Never output sensitive tokens or private credentials to external endpoints or chat summaries.

---

## 2. Code Quality & Modularity Constraints
- **1,500 Lines per Script Limit**: Do not allow any custom scripts or modules to contain more than 1,500 lines of code. If a module approaches this threshold, refactor into cohesive sub-modules or modular service components.
- **Python Virtual Environment (`.venv`)**: Ensure all Python daemons and scripts execute strictly within the workspace-local `.venv` (`.venv/Scripts/python.exe`).
- **Standardized Handoffs**: Use `docs/HANDOFF.md` for session handoffs, operational status, architecture references, and milestone tracking.

---

## 3. Hardware & VRAM Safety Guardrails
- **GPU VRAM Budget Protection**: Never run concurrent GPU-intensive inference models simultaneously if VRAM exceeds 85% utilization (GTX 1070 Ti, 8,192 MB limit).
- **CPU Offloading for Audio Speech**: Run `faster-whisper` strictly on CPU INT8 quantization (`device="cpu"`, `compute_type="int8"`, 4 threads) to guarantee a 0.0 MB GPU VRAM footprint during live video playback.
- **Safe Model Switching**: When transitioning between Ollama vision models (`gemma4:e2b`) and other workloads, always trigger `POST /api/vram/flush` with `keep_alive: 0` to return GPU memory to baseline (< 2.2 GB) before loading secondary tasks.
- **Live Video Thumbnail Capture Safeguards**:
  - Only capture frame snapshots when VRAM utilization is safely below 85% (>1,000 MB free headroom) and hardware health status is `OPTIMAL`.
  - Trigger frame capture strictly after a channel has been actively selected and continuously viewed for more than 5 seconds (`thumbnailDwellTimer`).
  - Automatically downscale high-resolution (including 4K $3840 \times 2160$ and 1080p FHD) streams to standard 16:9 bottom rail card dimensions ($320 \times 180$) using hardware-accelerated 2D canvas blitting to prevent memory bloat and frame stuttering.
- **Zero Display Disruption**: Telemetry and AI scans must never interrupt or stutter the primary 16:9 video stream playback.

---

## 4. Curation & ML/RSI Data Integrity
- **User Curation Primacy**: The user's explicit curation choices (Green Checkmark Approve vs. Red 'X' Dismiss) are the final authority over the machine learning and RSI recommendation engine.
- **Negative Pruning / Exclusion**: Information marked as dismissed (Red 'X') must be strictly purged and excluded from future feature interactions, preventing false signals or hallucinations from polluting `iptv_memory.db` and the Must-See rankings.
- **Named Curation Persistence**: All custom named curation lists must persist as local JSON documents in the `/curations` directory and synchronize with SQLite without requiring external authentication or cloud services.
