FROM node:22-bookworm-slim
WORKDIR /app
COPY package.json server.mjs ./
COPY public ./public
RUN mkdir -p /data/aarc && chown -R node:node /app /data/aarc
USER node
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000 DATA_DIR=/data/aarc
EXPOSE 3000
VOLUME ["/data/aarc"]
CMD ["node", "server.mjs"]
