# Codexa runner image for Cloudflare Containers.
# One container per project: the runner inside it starts the project's dev
# server, runs allow-listed commands, streams logs, serves the preview on
# port 4100 and builds deployments. Commands run as the unprivileged "node"
# user (uid 1000); the container itself is the isolation boundary.
#
# Build context is the repository root. `npm run container:build` must run
# first to produce containers/runner/dist (npm run cf:build does both).
FROM node:22-bookworm-slim

ENV RUNNER_DATA_DIR=/var/codexa \
    RUNNER_SANDBOX_DRIVER=process \
    RUNNER_SANDBOX_UID=1000 \
    RUNNER_SANDBOX_GID=1000 \
    RUNNER_NODE_DIR=/usr/local \
    RUNNER_NODE_BIN=/usr/local/bin/node \
    RUNNER_BIND=0.0.0.0 \
    RUNNER_PREVIEW_BIND=0.0.0.0 \
    RUNNER_PORT=4000 \
    RUNNER_PREVIEW_PORT=4100 \
    RUNNER_REAP_ORPHANS=0

COPY containers/runner/dist/ /app/

# Preinstall the template dependency sets so previews start in seconds.
# Behind a TLS-inspecting proxy, pass its CA as an optional build secret:
#   docker build --secret id=extra_ca,src=<ca.pem> ...
RUN --mount=type=secret,id=extra_ca,required=false \
    NODE_EXTRA_CA_CERTS=/run/secrets/extra_ca RUNNER_TOKEN=image-build node /app/prepare.mjs

EXPOSE 4000 4100
CMD ["node", "/app/runner.mjs"]
