package storage

import (
	"context"
	"errors"
	"io"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestLocalVideoStorageOpensNestedObject(t *testing.T) {
	root := t.TempDir()
	objectPath := filepath.Join(root, "courses", "so1", "sample.mp4")
	if err := os.MkdirAll(filepath.Dir(objectPath), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(objectPath, []byte("video-bytes"), 0o600); err != nil {
		t.Fatal(err)
	}

	reader, err := NewLocalVideoStorage(root).Open(context.Background(), `courses\\so1\\sample.mp4`)
	if err != nil {
		t.Fatal(err)
	}
	defer reader.Close()
	content, err := io.ReadAll(reader)
	if err != nil {
		t.Fatal(err)
	}
	if string(content) != "video-bytes" {
		t.Fatalf("contenido inesperado: %q", content)
	}
}

func TestLocalVideoStorageRejectsTraversal(t *testing.T) {
	_, err := NewLocalVideoStorage(t.TempDir()).Open(context.Background(), "../outside.mp4")
	if err == nil {
		t.Fatal("se esperaba rechazar una ruta fuera del volumen")
	}
	if !strings.Contains(err.Error(), "fuera del almacenamiento") {
		t.Fatalf("error inesperado: %v", err)
	}
}

func TestNormalizeObjectNameAppliesPrefix(t *testing.T) {
	name, err := normalizeObjectName("courses/so1", "sample.mp4")
	if err != nil {
		t.Fatal(err)
	}
	if name != "courses/so1/sample.mp4" {
		t.Fatalf("nombre inesperado: %q", name)
	}
}

func TestNormalizeObjectNameRejectsAbsoluteAndTraversalPaths(t *testing.T) {
	for _, value := range []string{"/sample.mp4", "../sample.mp4", "courses/../../sample.mp4"} {
		if _, err := normalizeObjectName("", value); err == nil {
			t.Fatalf("se esperaba rechazar %q", value)
		}
	}
}

func TestNewGCSVideoStorageRequiresBucket(t *testing.T) {
	_, err := NewGCSVideoStorage(context.Background(), "", "")
	if err == nil {
		t.Fatal("se esperaba error cuando GCS_BUCKET está vacío")
	}
	if !strings.Contains(err.Error(), "GCS_BUCKET") {
		t.Fatalf("error inesperado: %v", err)
	}
}

func TestLocalVideoStorageHonorsCanceledContext(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	_, err := NewLocalVideoStorage(t.TempDir()).Open(ctx, "sample.mp4")
	if !errors.Is(err, context.Canceled) {
		t.Fatalf("error inesperado: %v", err)
	}
}
