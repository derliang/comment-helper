FROM node:22-bookworm-slim
WORKDIR /app
COPY engine.mjs ./engine.mjs
COPY server/ai-proxy.mjs ./server/ai-proxy.mjs
USER node
ENV HOST=0.0.0.0 PORT=8787
EXPOSE 8787
CMD ["node","server/ai-proxy.mjs"]
