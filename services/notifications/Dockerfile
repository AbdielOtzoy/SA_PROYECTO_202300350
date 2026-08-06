FROM node:20-alpine
WORKDIR /app
ENV PROTO_DIR=/app/proto
COPY package.json ./package.json
COPY services/notifications/package.json services/notifications/package.json
RUN npm install --workspace @yousac/notifications
COPY proto ./proto
COPY services/notifications ./services/notifications
CMD ["npm","run","start","--workspace","@yousac/notifications"]
