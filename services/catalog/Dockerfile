FROM node:20-alpine
WORKDIR /app
ENV PROTO_DIR=/app/proto
COPY package.json ./package.json
COPY services/catalog/package.json services/catalog/package.json
RUN npm install --workspace @yousac/catalog
COPY proto ./proto
COPY services/catalog ./services/catalog
CMD ["npm","run","start","--workspace","@yousac/catalog"]
