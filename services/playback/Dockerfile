FROM golang:1.22-alpine AS build
WORKDIR /app/services/playback
COPY services/playback/go.mod services/playback/go.sum ./
RUN go mod download
COPY services/playback ./
RUN go build -o /playback ./cmd/playback
FROM alpine:3.20
COPY --from=build /playback /playback
EXPOSE 50053
CMD ["/playback"]
