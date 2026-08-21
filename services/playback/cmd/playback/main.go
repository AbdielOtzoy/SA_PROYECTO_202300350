package main

import (
	"context"
	"fmt"
	"log"
	"net"
	"os"
	"strings"

	pb "github.com/abdielo/yousac/services/playback/gen"
	"github.com/abdielo/yousac/services/playback/internal/auth"
	"github.com/abdielo/yousac/services/playback/internal/catalog"
	"github.com/abdielo/yousac/services/playback/internal/config"
	"github.com/abdielo/yousac/services/playback/internal/playback"
	"github.com/abdielo/yousac/services/playback/internal/repository"
	videostorage "github.com/abdielo/yousac/services/playback/internal/storage"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
)

func main() {
	ctx := context.Background()
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		log.Fatal("JWT_SECRET debe estar definido en el entorno")
	}

	mongoClient, err := mongo.Connect(ctx, options.Client().ApplyURI(os.Getenv("PLAYBACK_MONGO_URL")))
	if err != nil {
		log.Fatal(err)
	}
	defer mongoClient.Disconnect(ctx)

	catalogConnection, err := grpc.Dial(config.EnvOrDefault("CATALOG_GRPC_ADDRESS", "catalog:50052"), grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		log.Fatal(err)
	}
	defer catalogConnection.Close()

	videoStore, closeVideoStore, err := newVideoStorage(ctx)
	if err != nil {
		log.Fatal(err)
	}
	defer func() {
		if err := closeVideoStore(); err != nil {
			log.Printf("cerrar almacenamiento de videos: %v", err)
		}
	}()

	bindAddress := config.EnvOrDefault("PLAYBACK_GRPC_BIND", "0.0.0.0:50053")
	listener, err := net.Listen("tcp", bindAddress)
	if err != nil {
		log.Fatal(err)
	}

	server := grpc.NewServer()
	service := playback.NewService(
		auth.NewJWTAuthenticator(secret),
		catalog.NewGRPCClient(pb.NewCatalogServiceClient(catalogConnection)),
		repository.NewMongoRepository(mongoClient.Database("playback_db")),
		videoStore,
	)
	pb.RegisterPlaybackServiceServer(server, service)
	log.Println("playback gRPC", bindAddress)
	log.Fatal(server.Serve(listener))
}

func newVideoStorage(ctx context.Context) (videostorage.VideoStorage, func() error, error) {
	mode := strings.ToLower(strings.TrimSpace(config.EnvOrDefault("VIDEO_STORAGE_MODE", "local")))
	switch mode {
	case "local":
		return videostorage.NewLocalVideoStorage(config.EnvOrDefault("VIDEO_ROOT", "/videos")), func() error { return nil }, nil
	case "gcs":
		store, err := videostorage.NewGCSVideoStorage(
			ctx,
			os.Getenv("GCS_BUCKET"),
			os.Getenv("GCS_PREFIX"),
		)
		if err != nil {
			return nil, nil, err
		}
		return store, store.Close, nil
	default:
		return nil, nil, fmt.Errorf("VIDEO_STORAGE_MODE inválido: %q; use local o gcs", mode)
	}
}
