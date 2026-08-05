FROM golang:1.22-alpine AS build
RUN apk add --no-cache protobuf git && go install google.golang.org/protobuf/cmd/protoc-gen-go@v1.35.1 && go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@v1.5.1
WORKDIR /app/services/playback
COPY services/playback/go.mod services/playback/go.sum ./
RUN go mod download
COPY proto /app/proto
COPY services/playback ./
RUN mkdir -p gen && protoc -I /app/proto --go_out=paths=source_relative:gen --go-grpc_out=paths=source_relative:gen catalog.proto playback.proto && go mod tidy && go build -o /playback ./cmd
FROM alpine:3.20
COPY --from=build /playback /playback
EXPOSE 50053
CMD ["/playback"]
