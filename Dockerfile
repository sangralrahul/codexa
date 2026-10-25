# Codexa web application image (Next.js). The runner service needs host
# privileges for namespaces/cgroups and runs from services/runner on a VM or
# as a privileged container; see docs/RUNTIME.md.
FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY scripts/copy-monaco.mjs scripts/copy-monaco.mjs
RUN npm ci --no-audit --no-fund

FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# Build-time placeholders; real values are provided at runtime.
ENV DATABASE_URL=postgres://build:build@localhost:5432/build \
    SESSION_SECRET=build-time-placeholder-secret \
    ENCRYPTION_KEY=build-time-placeholder-secret
RUN npm run build

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000
RUN groupadd -r codexa && useradd -r -g codexa codexa
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/drizzle ./drizzle
COPY --from=build /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=build /app/content ./content
COPY --from=build /app/src/db ./src/db
USER codexa
EXPOSE 3000
CMD ["npm", "run", "start"]
