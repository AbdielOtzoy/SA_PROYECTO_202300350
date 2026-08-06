package auth

import (
	"context"
	"strings"

	"github.com/golang-jwt/jwt/v5"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/metadata"
	"google.golang.org/grpc/status"
)

type Authorizer interface {
	Authorize(context.Context) error
}

type JWTAuthenticator struct {
	secret []byte
}

func NewJWTAuthenticator(secret string) *JWTAuthenticator {
	return &JWTAuthenticator{secret: []byte(secret)}
}

func (a *JWTAuthenticator) Authorize(ctx context.Context) error {
	values, ok := metadata.FromIncomingContext(ctx)
	if !ok || len(values.Get("authorization")) == 0 {
		return status.Error(codes.Unauthenticated, "JWT interno requerido")
	}
	raw := values.Get("authorization")[0]
	if !strings.HasPrefix(strings.ToLower(raw), "bearer ") {
		return status.Error(codes.Unauthenticated, "JWT interno inválido")
	}
	raw = strings.TrimSpace(raw[len("Bearer "):])
	token, err := jwt.Parse(raw, func(token *jwt.Token) (interface{}, error) {
		if token.Method.Alg() != jwt.SigningMethodHS256.Alg() {
			return nil, status.Error(codes.Unauthenticated, "Algoritmo JWT inválido")
		}
		return a.secret, nil
	})
	if err != nil || !token.Valid {
		return status.Error(codes.Unauthenticated, "JWT inválido")
	}
	return nil
}
