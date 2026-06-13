FROM node:20-slim

RUN apt-get update && \
    apt-get install -y --no-install-recommends python3 ffmpeg && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY tsconfig.json ./
COPY src ./src
RUN npx tsc

CMD ["node", "dist/index.js"]
