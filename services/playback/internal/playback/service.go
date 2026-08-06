package playback

import (
	"context"
	"io"
	"os"
	"path/filepath"
	"time"

	pb "github.com/abdielo/yousac/services/playback/gen"
	"github.com/abdielo/yousac/services/playback/internal/auth"
	"github.com/abdielo/yousac/services/playback/internal/catalog"
	"github.com/abdielo/yousac/services/playback/internal/repository"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type Service struct {
	pb.UnimplementedPlaybackServiceServer
	authorizer auth.Authorizer
	catalog    catalog.Client
	repository repository.Repository
	videoRoot  string
}

func NewService(authorizer auth.Authorizer, catalogClient catalog.Client, playbackRepository repository.Repository, videoRoot string) *Service {
	return &Service{authorizer: authorizer, catalog: catalogClient, repository: playbackRepository, videoRoot: videoRoot}
}

func (s *Service) GetPlayback(ctx context.Context, request *pb.PlaybackRequest) (*pb.PlaybackReply, error) {
	if err := s.authorizer.Authorize(ctx); err != nil {
		return nil, err
	}
	authorization, err := s.catalog.CanPlay(catalog.ForwardIncomingMetadata(ctx), &pb.PlaybackAuthorizationRequest{RecordingId: request.GetRecordingId(), UserId: request.GetUserId()})
	if err != nil || !authorization.GetAllowed() {
		return nil, status.Error(codes.PermissionDenied, "grabación no autorizada")
	}
	checkpoint, _ := s.repository.FindCheckpoint(ctx, request.GetUserId(), request.GetRecordingId())
	return &pb.PlaybackReply{StreamUrl: "/api/playback/" + request.GetRecordingId() + "/stream", CheckpointSeconds: checkpoint}, nil
}

func (s *Service) SaveCheckpoint(ctx context.Context, request *pb.CheckpointRequest) (*pb.CheckpointReply, error) {
	if err := s.authorizer.Authorize(ctx); err != nil {
		return nil, err
	}
	if err := s.repository.SaveCheckpoint(ctx, request.GetUserId(), request.GetRecordingId(), request.GetSeconds()); err != nil {
		return nil, err
	}
	now := time.Now()
	// Legacy history and event writes intentionally remain best effort, as in v0.2.0.
	_ = s.repository.SaveHistory(ctx, request.GetUserId(), request.GetRecordingId(), request.GetSeconds(), now)
	_ = s.repository.SaveEvent(ctx, request.GetUserId(), request.GetRecordingId(), request.GetSeconds(), request.GetEventType(), now)
	return &pb.CheckpointReply{Seconds: request.GetSeconds()}, nil
}

func (s *Service) GetHistory(ctx context.Context, request *pb.HistoryRequest) (*pb.HistoryReply, error) {
	if err := s.authorizer.Authorize(ctx); err != nil {
		return nil, err
	}
	items, err := s.repository.ListHistory(ctx, request.GetUserId())
	if err != nil {
		return nil, err
	}
	result := &pb.HistoryReply{Items: make([]*pb.HistoryItem, 0, len(items))}
	for _, item := range items {
		result.Items = append(result.Items, &pb.HistoryItem{RecordingId: item.RecordingID, StartedAt: item.StartedAt.Format(time.RFC3339), LastPositionSeconds: item.Position})
	}
	return result, nil
}

func (s *Service) StreamVideo(request *pb.PlaybackRequest, stream grpc.ServerStreamingServer[pb.VideoChunk]) error {
	if err := s.authorizer.Authorize(stream.Context()); err != nil {
		return err
	}
	authorization, err := s.catalog.CanPlay(
		catalog.ForwardIncomingMetadata(stream.Context()),
		&pb.PlaybackAuthorizationRequest{
			RecordingId: request.GetRecordingId(),
			UserId:      request.GetUserId(),
		},
	)
	if err != nil || !authorization.GetAllowed() {
		return status.Error(codes.PermissionDenied, "grabación no autorizada")
	}
	file, err := os.Open(filepath.Join(s.videoRoot, filepath.Base(authorization.GetVideoPath())))
	if err != nil {
		return err
	}
	defer file.Close()
	buffer := make([]byte, 64*1024)
	for {
		read, readErr := file.Read(buffer)
		if read > 0 {
			if err := stream.Send(&pb.VideoChunk{Data: buffer[:read]}); err != nil {
				return err
			}
		}
		if readErr == io.EOF {
			return nil
		}
		if readErr != nil {
			return readErr
		}
	}
}
