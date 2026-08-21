package playback

import (
	"context"
	"errors"
	"testing"
	"time"

	pb "github.com/abdielo/yousac/services/playback/gen"
	"github.com/abdielo/yousac/services/playback/internal/repository"
	videostorage "github.com/abdielo/yousac/services/playback/internal/storage"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type fakeAuthorizer struct{ err error }

func (a fakeAuthorizer) Authorize(context.Context) error { return a.err }

type fakeCatalog struct {
	reply *pb.AuthorizationReply
	err   error
}

func (c fakeCatalog) CanPlay(context.Context, *pb.PlaybackAuthorizationRequest, ...grpc.CallOption) (*pb.AuthorizationReply, error) {
	return c.reply, c.err
}

type fakeRepository struct {
	checkpoint float64
	saved      float64
	userID     string
	recording  string
	items      []repository.HistoryItem
}

func (r *fakeRepository) FindCheckpoint(context.Context, string, string) (float64, error) {
	return r.checkpoint, nil
}

func (r *fakeRepository) SaveCheckpoint(_ context.Context, userID string, recordingID string, seconds float64) error {
	r.userID, r.recording, r.saved = userID, recordingID, seconds
	return nil
}

func (r *fakeRepository) SaveHistory(context.Context, string, string, float64, time.Time) error {
	return nil
}
func (r *fakeRepository) SaveEvent(context.Context, string, string, float64, string, time.Time) error {
	return nil
}
func (r *fakeRepository) ListHistory(context.Context, string) ([]repository.HistoryItem, error) {
	return r.items, nil
}

func TestGetPlaybackReturnsCheckpoint(t *testing.T) {
	repo := &fakeRepository{checkpoint: 12.5}
	service := NewService(fakeAuthorizer{}, fakeCatalog{reply: &pb.AuthorizationReply{Allowed: true}}, repo, videostorage.NewLocalVideoStorage("/videos"))
	reply, err := service.GetPlayback(context.Background(), &pb.PlaybackRequest{UserId: "u-1", RecordingId: "r-1"})
	if err != nil {
		t.Fatal(err)
	}
	if reply.GetCheckpointSeconds() != 12.5 || reply.GetStreamUrl() != "/api/playback/r-1/stream" {
		t.Fatalf("respuesta inesperada: %v", reply)
	}
}

func TestSaveCheckpointUsesRepository(t *testing.T) {
	repo := &fakeRepository{}
	service := NewService(fakeAuthorizer{}, fakeCatalog{reply: &pb.AuthorizationReply{Allowed: true}}, repo, videostorage.NewLocalVideoStorage("/videos"))
	_, err := service.SaveCheckpoint(context.Background(), &pb.CheckpointRequest{UserId: "u-1", RecordingId: "r-1", Seconds: 8.75, EventType: "pause"})
	if err != nil {
		t.Fatal(err)
	}
	if repo.saved != 8.75 || repo.userID != "u-1" || repo.recording != "r-1" {
		t.Fatalf("checkpoint no persistido: %+v", repo)
	}
}

func TestAuthorizationFailureIsPermissionDenied(t *testing.T) {
	service := NewService(fakeAuthorizer{}, fakeCatalog{reply: &pb.AuthorizationReply{Allowed: false}, err: errors.New("catalog down")}, &fakeRepository{}, videostorage.NewLocalVideoStorage("/videos"))
	_, err := service.GetPlayback(context.Background(), &pb.PlaybackRequest{})
	if status.Code(err) != codes.PermissionDenied {
		t.Fatalf("código inesperado: %v", status.Code(err))
	}
}
