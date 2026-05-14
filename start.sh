#!/bin/bash
set -e

echo "======================================"
echo "  BOMForge AI — Starting Services"
echo "======================================"

# ── Start Ollama in background ─────────────────────────────
echo "[1/3] Starting Ollama server..."
ollama serve &
OLLAMA_PID=$!

# ── Wait for Ollama to be ready ────────────────────────────
echo "[2/3] Waiting for Ollama to be ready..."
MAX_WAIT=60
WAITED=0
until curl -s http://localhost:11434/api/tags > /dev/null 2>&1; do
  sleep 2
  WAITED=$((WAITED + 2))
  if [ $WAITED -ge $MAX_WAIT ]; then
    echo "  ⚠️  Ollama took too long — starting backend anyway (will use Groq fallback)"
    break
  fi
done

if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
  echo "  ✅ Ollama is ready"

  # Pull model only if not already present (uses Railway volume for persistence)
  if ollama list 2>/dev/null | grep -q "llama3.1:8b"; then
    echo "  ✅ llama3.1:8b already pulled — skipping download"
  else
    echo "  📥 Pulling llama3.1:8b model (~4.6 GB, first run only)..."
    ollama pull llama3.1:8b
    echo "  ✅ Model ready"
  fi
else
  echo "  ⚠️  Ollama not available — backend will use Groq API"
fi

# ── Start Node.js backend ──────────────────────────────────
echo "[3/3] Starting BOMForge backend..."
exec node dist/index.js
