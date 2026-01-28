#!/bin/bash

# Check if Ollama is already running
if lsof -Pi :11434 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo "✅ Ollama already running on port 11434"
    # Keep this process alive to work with concurrently
    while true; do sleep 30; done
else
    echo "🚀 Starting Ollama..."
    ollama serve
fi
