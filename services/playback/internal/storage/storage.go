package storage

import (
	"context"
	"fmt"
	"io"
	"os"
	"path"
	"path/filepath"
	"strings"

	gcs "cloud.google.com/go/storage"
)

// VideoStorage provides a stream for a catalog video object.
// Implementations must not load the complete video into memory.
type VideoStorage interface {
	Open(ctx context.Context, objectName string) (io.ReadCloser, error)
}

// LocalVideoStorage reads video objects from the local persistent volume used
// by the development environment.
type LocalVideoStorage struct {
	root string
}

func NewLocalVideoStorage(root string) *LocalVideoStorage {
	if strings.TrimSpace(root) == "" {
		root = "/videos"
	}
	return &LocalVideoStorage{root: root}
}

func (s *LocalVideoStorage) Open(ctx context.Context, objectName string) (io.ReadCloser, error) {
	if err := ctx.Err(); err != nil {
		return nil, err
	}
	name, err := normalizeObjectName("", objectName)
	if err != nil {
		return nil, err
	}
	return os.Open(filepath.Join(s.root, filepath.FromSlash(name)))
}

// GCSVideoStorage reads private objects using Application Default Credentials.
// On Compute Engine, ADC comes from the service account attached to the VM;
// local development can provide ADC with gcloud auth application-default login.
type GCSVideoStorage struct {
	client *gcs.Client
	bucket string
	prefix string
}

func NewGCSVideoStorage(ctx context.Context, bucketName string, prefix string) (*GCSVideoStorage, error) {
	bucketName = strings.TrimSpace(bucketName)
	if bucketName == "" {
		return nil, fmt.Errorf("GCS_BUCKET debe estar definido cuando VIDEO_STORAGE_MODE=gcs")
	}

	normalizedPrefix, err := cleanRelativePath(prefix, "prefijo")
	if err != nil {
		return nil, fmt.Errorf("GCS_PREFIX inválido: %w", err)
	}

	client, err := gcs.NewClient(ctx)
	if err != nil {
		return nil, fmt.Errorf("crear cliente de Google Cloud Storage: %w", err)
	}
	return &GCSVideoStorage{client: client, bucket: bucketName, prefix: normalizedPrefix}, nil
}

func (s *GCSVideoStorage) Open(ctx context.Context, objectName string) (io.ReadCloser, error) {
	name, err := normalizeObjectName(s.prefix, objectName)
	if err != nil {
		return nil, err
	}
	reader, err := s.client.Bucket(s.bucket).Object(name).NewReader(ctx)
	if err != nil {
		return nil, fmt.Errorf("abrir objeto gs://%s/%s: %w", s.bucket, name, err)
	}
	return reader, nil
}

func (s *GCSVideoStorage) Close() error {
	if s == nil || s.client == nil {
		return nil
	}
	return s.client.Close()
}

func normalizeObjectName(prefix string, objectName string) (string, error) {
	cleanPrefix, err := cleanRelativePath(prefix, "prefijo")
	if err != nil {
		return "", err
	}
	cleanObject, err := cleanRelativePath(objectName, "objeto")
	if err != nil {
		return "", err
	}
	if cleanObject == "" {
		return "", fmt.Errorf("objeto no puede estar vacío")
	}
	if cleanPrefix == "" {
		return cleanObject, nil
	}
	return path.Join(cleanPrefix, cleanObject), nil
}

func cleanRelativePath(value string, label string) (string, error) {
	value = strings.TrimSpace(strings.ReplaceAll(value, "\\", "/"))
	if value == "" {
		return "", nil
	}
	if strings.HasPrefix(value, "/") {
		return "", fmt.Errorf("%s no puede ser absoluto", label)
	}

	clean := path.Clean(value)
	if clean == "." || clean == ".." || strings.HasPrefix(clean, "../") {
		return "", fmt.Errorf("%s contiene una ruta fuera del almacenamiento", label)
	}
	return clean, nil
}
