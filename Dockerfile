# BOMForge AI Backend — Ollama base image + Node.js
# Uses official ollama/ollama image (Ollama pre-installed correctly)

FROM ollama/ollama:latest

# Install Node.js 20 + build tools
RUN apt-get update && apt-get install -y \
    curl \
    ca-certificates \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install all deps (including devDeps for TypeScript build)
COPY package*.json ./
RUN npm ci

# Copy source and build TypeScript
COPY . .
RUN npm run build

# Remove devDependencies after build
RUN npm prune --production

# Copy startup script
COPY start.sh /start.sh
RUN chmod +x /start.sh

EXPOSE 3001

CMD ["/start.sh"]
