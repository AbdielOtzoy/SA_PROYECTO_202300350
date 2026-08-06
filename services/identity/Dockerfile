FROM node:20-alpine
WORKDIR /app
ENV PROTO_DIR=/app/proto
COPY package.json ./package.json
COPY services/identity/package.json services/identity/package.json
RUN npm install --workspace @yousac/identity
COPY proto ./proto
COPY services/identity ./services/identity
CMD ["npm","run","start","--workspace","@yousac/identity"]
