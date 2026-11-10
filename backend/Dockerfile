# syntax=docker/dockerfile:1

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# No build step, so dev dependencies never need to reach the image.
RUN npm ci --omit=dev

FROM node:22-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production
# The published port is the security boundary (see docker-compose.yml); inside
# the container the listener must accept the Docker network.
ENV HOST=0.0.0.0
ENV PORT=3001

COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node package.json ./
COPY --chown=node:node src ./src

USER node
EXPOSE 3001

# Liveness, not readiness: the process is meant to stay up through a Supabase
# outage, so readiness failing must not cause a restart loop.
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3001)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "src/server.js"]
