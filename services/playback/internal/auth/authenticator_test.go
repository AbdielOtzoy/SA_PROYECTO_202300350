package auth

import (
	"context"
	"testing"

	"github.com/golang-jwt/jwt/v5"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/metadata"
	"google.golang.org/grpc/status"
)

func TestJWTAuthenticator(t *testing.T) {
	authenticator := NewJWTAuthenticator("secret")
	token, err := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{"sub": "u-1"}).SignedString([]byte("secret"))
	if err != nil {
		t.Fatal(err)
	}
	ctx := metadata.NewIncomingContext(context.Background(), metadata.Pairs("authorization", "Bearer "+token))
	if err := authenticator.Authorize(ctx); err != nil {
		t.Fatalf("token válido rechazado: %v", err)
	}

	withoutToken := context.Background()
	if code := status.Code(authenticator.Authorize(withoutToken)); code != codes.Unauthenticated {
		t.Fatalf("código sin token: %s", code)
	}
	invalid := metadata.NewIncomingContext(context.Background(), metadata.Pairs("authorization", "Bearer invalid"))
	if code := status.Code(authenticator.Authorize(invalid)); code != codes.Unauthenticated {
		t.Fatalf("código con token inválido: %s", code)
	}
}
