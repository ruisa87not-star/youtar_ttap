# Reviewable draft. Resolve/scan/pin a Node 24 image digest before production.
ARG NODE_IMAGE=node:24-bookworm-slim
FROM ${NODE_IMAGE} AS bridge
WORKDIR /build
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY scripts/build-proxy.mjs scripts/build-proxy.mjs
COPY src/shared src/shared
COPY src/renderer/registration/proxyBridge.ts src/renderer/registration/proxyBridge.ts
RUN npm run build:proxy

FROM ${NODE_IMAGE} AS runtime
ENV NODE_ENV=production PROXY_BIND_HOST=0.0.0.0 PROXY_PORT=3000
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --omit=optional --ignore-scripts && npm cache clean --force
COPY server server
COPY src/shared src/shared
COPY LICENSE UPSTREAM.md THIRD_PARTY_NOTICES.txt ./
COPY --from=bridge /build/dist-proxy dist-proxy
USER node
EXPOSE 3000
CMD ["node", "--use-system-ca", "server/registration-proxy/main.ts"]
