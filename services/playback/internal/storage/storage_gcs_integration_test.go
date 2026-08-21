package storage

import (
	"context"
	"io"
	"os"
	"testing"
)

func TestGCSVideoStorageOpensConfiguredObject(t *testing.T) {
	bucket := os.Getenv("GCS_BUCKET")
	object := os.Getenv("GCS_TEST_OBJECT")
	if bucket == "" || object == "" {
		t.Skip("requiere GCS_BUCKET y GCS_TEST_OBJECT para la prueba de integración")
	}

	store, err := NewGCSVideoStorage(context.Background(), bucket, os.Getenv("GCS_PREFIX"))
	if err != nil {
		t.Fatal(err)
	}
	defer store.Close()

	reader, err := store.Open(context.Background(), object)
	if err != nil {
		t.Fatal(err)
	}
	defer reader.Close()

	buffer := make([]byte, 16)
	read, err := io.ReadFull(reader, buffer)
	if err != nil && err != io.ErrUnexpectedEOF {
		t.Fatal(err)
	}
	if read == 0 {
		t.Fatal("GCS devolvió un objeto vacío")
	}
}
