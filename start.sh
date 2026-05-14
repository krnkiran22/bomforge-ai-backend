#!/bin/bash
set -e

echo "======================================"
echo "  BOMForge AI — Starting Services"
echo "======================================"

# ── 1. Start Ollama server in background (non-blocking) ────
echo "[1/2] Starting Ollama in background..."
ollama serve &

# ── 2. Pull model in background after Ollama is ready ──────
# This does NOT block Node.js startup
(
  echo "[BG] Waiting for Ollama to be ready..."
  MAX=180
  WAITED=0
  until curl -s http://localhost:11434/api/tags > /dev/null 2>&1; do
    sleep 3
    WAITED=$((WAITED + 3))
    if [ $WAITED -ge $MAX ]; then
      echo "[BG] ⚠️  Ollama not ready after ${MAX}s — skipping model pull"
      exit 0
    fi
  done
  echo "[BG] ✅ Ollama ready"

  if ollama list 2>/dev/null | grep -q "llama3.1:8b"; then
    echo "[BG] ✅ llama3.1:8b already present — skipping download"
  else
    echo "[BG] 📥 Pulling llama3.1:8b (~4.6 GB)..."
    ollama pull llama3.1:8b && echo "[BG] ✅ Model ready" || echo "[BG] ⚠️  Pull failed — will use Groq"
  fi
) &

# ── 3. Start Node.js backend IMMEDIATELY (health check passes) ─
echo "[2/2] Starting BOMForge backend..."
exec node dist/index.js
