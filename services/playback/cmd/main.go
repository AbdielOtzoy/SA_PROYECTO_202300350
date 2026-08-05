package main

import (
	"context"
	pb "github.com/abdielo/yousac/services/playback/gen"
	"github.com/golang-jwt/jwt/v5"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"google.golang.org/grpc"
	"google.golang.org/grpc/metadata"
	"log"
	"net"
	"os"
	"path/filepath"
	"strings"
	"time"
)

type server struct {
	pb.UnimplementedPlaybackServiceServer
	db      *mongo.Database
	catalog pb.CatalogServiceClient
}

func authorize(ctx context.Context) error {
	values, ok := metadata.FromIncomingContext(ctx)
	if !ok || len(values.Get("authorization")) == 0 {
		return grpc.Errorf(16, "JWT interno requerido")
	}
	raw := strings.TrimPrefix(values.Get("authorization")[0], "Bearer ")
	if raw == values.Get("authorization")[0] {
		return grpc.Errorf(16, "JWT interno inválido")
	}
	token, err := jwt.Parse(raw, func(t *jwt.Token) (interface{}, error) {
		if t.Method.Alg() != jwt.SigningMethodHS256.Alg() {
			return nil, grpc.Errorf(16, "Algoritmo JWT inválido")
		}
		return []byte(os.Getenv("JWT_SECRET")), nil
	})
	if err != nil || !token.Valid {
		return grpc.Errorf(16, "JWT inválido")
	}
	return nil
}
func catalogContext(ctx context.Context) context.Context {
	values, _ := metadata.FromIncomingContext(ctx)
	return metadata.NewOutgoingContext(ctx, values)
}
func (s *server) GetPlayback(ctx context.Context, in *pb.PlaybackRequest) (*pb.PlaybackReply, error) {
	if err := authorize(ctx); err != nil {
		return nil, err
	}
	auth, err := s.catalog.CanPlay(catalogContext(ctx), &pb.PlaybackAuthorizationRequest{RecordingId: in.RecordingId, UserId: in.UserId})
	if err != nil || !auth.Allowed {
		return nil, grpc.Errorf(7, "grabación no autorizada")
	}
	var cp struct {
		Seconds float64 `bson:"seconds"`
	}
	_ = s.db.Collection("checkpoints").FindOne(ctx, bson.M{"user_id": in.UserId, "recording_id": in.RecordingId}).Decode(&cp)
	// A visit is added to history only when the client saves a real checkpoint.
	// Opening a player must not make an unwatched video appear in "Continuar viendo".
	return &pb.PlaybackReply{StreamUrl: "/api/playback/" + in.RecordingId + "/stream", CheckpointSeconds: cp.Seconds}, nil
}
func (s *server) SaveCheckpoint(ctx context.Context, in *pb.CheckpointRequest) (*pb.CheckpointReply, error) {
	if err := authorize(ctx); err != nil {
		return nil, err
	}
	_, err := s.db.Collection("checkpoints").UpdateOne(ctx, bson.M{"user_id": in.UserId, "recording_id": in.RecordingId}, bson.M{"$set": bson.M{"seconds": in.Seconds, "updated_at": time.Now()}}, options.Update().SetUpsert(true))
	if err != nil {
		return nil, err
	}
	// Keep legacy duplicate rows in sync too; GetHistory can then never surface
	// a stale checkpoint while the collection is being migrated to one row/user/video.
	_, _ = s.db.Collection("playback_history").UpdateOne(ctx,
		bson.M{"user_id": in.UserId, "recording_id": in.RecordingId},
		bson.M{"$set": bson.M{"last_position_seconds": in.Seconds, "started_at": time.Now()}},
		options.Update().SetUpsert(true))
	_, _ = s.db.Collection("playback_events").InsertOne(ctx, bson.M{"user_id": in.UserId, "recording_id": in.RecordingId, "seconds": in.Seconds, "event_type": in.EventType, "timestamp": time.Now()})
	return &pb.CheckpointReply{Seconds: in.Seconds}, nil
}
func (s *server) GetHistory(ctx context.Context, in *pb.HistoryRequest) (*pb.HistoryReply, error) {
	if err := authorize(ctx); err != nil {
		return nil, err
	}
	cur, err := s.db.Collection("playback_history").Find(ctx, bson.M{"user_id": in.UserId, "last_position_seconds": bson.M{"$gt": 0}}, options.Find().SetSort(bson.D{{Key: "started_at", Value: -1}}).SetLimit(20))
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)
	result := &pb.HistoryReply{}
	for cur.Next(ctx) {
		var h struct {
			RecordingID string    `bson:"recording_id"`
			StartedAt   time.Time `bson:"started_at"`
			Position    float64   `bson:"last_position_seconds"`
		}
		if cur.Decode(&h) == nil {
			result.Items = append(result.Items, &pb.HistoryItem{RecordingId: h.RecordingID, StartedAt: h.StartedAt.Format(time.RFC3339), LastPositionSeconds: h.Position})
		}
	}
	return result, cur.Err()
}
func (s *server) StreamVideo(in *pb.PlaybackRequest, stream pb.PlaybackService_StreamVideoServer) error {
	if err := authorize(stream.Context()); err != nil {
		return err
	}
	auth, err := s.catalog.CanPlay(catalogContext(stream.Context()), &pb.PlaybackAuthorizationRequest{RecordingId: in.RecordingId, UserId: in.UserId})
	if err != nil || !auth.Allowed {
		return grpc.Errorf(7, "grabación no autorizada")
	}
	safe := filepath.Base(auth.VideoPath)
	file, err := os.Open(filepath.Join("/videos", safe))
	if err != nil {
		return err
	}
	defer file.Close()
	buf := make([]byte, 64*1024)
	for {
		n, readErr := file.Read(buf)
		if n > 0 {
			if err := stream.Send(&pb.VideoChunk{Data: buf[:n]}); err != nil {
				return err
			}
		}
		if readErr != nil {
			return nil
		}
	}
}
func main() {
	ctx := context.Background()
	client, err := mongo.Connect(ctx, options.Client().ApplyURI(os.Getenv("PLAYBACK_MONGO_URL")))
	if err != nil {
		log.Fatal(err)
	}
	defer client.Disconnect(ctx)
	conn, err := grpc.Dial("catalog:50052", grpc.WithInsecure())
	if err != nil {
		log.Fatal(err)
	}
	lis, err := net.Listen("tcp", ":50053")
	if err != nil {
		log.Fatal(err)
	}
	g := grpc.NewServer()
	pb.RegisterPlaybackServiceServer(g, &server{db: client.Database("playback_db"), catalog: pb.NewCatalogServiceClient(conn)})
	log.Println("playback gRPC :50053")
	log.Fatal(g.Serve(lis))
}
