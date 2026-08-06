package catalog

import (
	"context"

	pb "github.com/abdielo/yousac/services/playback/gen"
	"google.golang.org/grpc"
	"google.golang.org/grpc/metadata"
)

type Client interface {
	CanPlay(context.Context, *pb.PlaybackAuthorizationRequest, ...grpc.CallOption) (*pb.AuthorizationReply, error)
}

type GRPCClient struct {
	client pb.CatalogServiceClient
}

func NewGRPCClient(client pb.CatalogServiceClient) *GRPCClient {
	return &GRPCClient{client: client}
}

func (c *GRPCClient) CanPlay(ctx context.Context, request *pb.PlaybackAuthorizationRequest, options ...grpc.CallOption) (*pb.AuthorizationReply, error) {
	return c.client.CanPlay(ctx, request, options...)
}

func ForwardIncomingMetadata(ctx context.Context) context.Context {
	values, _ := metadata.FromIncomingContext(ctx)
	return metadata.NewOutgoingContext(ctx, values)
}
