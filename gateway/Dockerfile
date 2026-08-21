FROM node:20-alpine
WORKDIR /app
ENV PROTO_DIR=/app/proto
ENV TLS_DIR=/app/tls
COPY package.json ./package.json
COPY gateway/package.json gateway/package.json
RUN npm install --workspace @yousac/gateway
COPY proto ./proto
COPY gateway ./gateway
CMD ["npm","run","start","--workspace","@yousac/gateway"]
