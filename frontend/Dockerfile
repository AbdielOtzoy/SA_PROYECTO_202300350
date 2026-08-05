FROM node:20-alpine
WORKDIR /app
COPY package.json ./package.json
COPY frontend/package.json frontend/package.json
RUN npm install --workspace @yousac/frontend
COPY frontend ./frontend
COPY infrastructure/tls/frontend-nginx.conf /etc/nginx/nginx.conf
WORKDIR /app/frontend
ENV NEXT_PUBLIC_API_URL=/api
RUN npm run build
RUN apk add --no-cache nginx
CMD ["sh","-c","npm run start -- -p 3001 & nginx -g 'daemon off;'"]
