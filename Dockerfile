FROM node:22-slim

RUN apt-get update && \
    apt-get install -y --no-install-recommends python3 ffmpeg ca-certificates && \
    ln -sf /usr/bin/python3 /usr/bin/python && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npx tsc

RUN npm prune --omit=dev

CMD ["node", "dist/index.js"]
