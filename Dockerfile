# BOMForge AI Backend — Single container with Ollama + Node.js
# Railway Pro plan required (8GB+ RAM for llama3.1:8b)

FROM node:20-slim

# Install system dependencies + Ollama
RUN apt-get update && apt-get install -y \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install Ollama
RUN curl -fsSL https://ollama.com/install.sh | sh

WORKDIR /app

# Install all deps (including devDeps for TypeScript build)
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# Remove devDependencies after build to keep image lean
RUN npm prune --production

# Copy startup script
COPY start.sh /start.sh
RUN chmod +x /start.sh

# Expose backend port
EXPOSE 3001

CMD ["/start.sh"]
