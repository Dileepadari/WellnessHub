FROM node:20-alpine

WORKDIR /app

# Dependencies are installed from the lockfile so an image build is reproducible.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY . .

# Writable at runtime for log files.
RUN mkdir -p logs && chown -R node:node /app

USER node

EXPOSE 5000

# node is already in the image, so no extra package is needed for the probe.
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:5000/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

CMD ["node", "server.js"]
