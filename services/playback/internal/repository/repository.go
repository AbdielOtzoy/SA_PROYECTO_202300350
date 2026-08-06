package repository

import (
	"context"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type HistoryItem struct {
	RecordingID string
	StartedAt   time.Time
	Position    float64
}

type Repository interface {
	FindCheckpoint(context.Context, string, string) (float64, error)
	SaveCheckpoint(context.Context, string, string, float64) error
	SaveHistory(context.Context, string, string, float64, time.Time) error
	SaveEvent(context.Context, string, string, float64, string, time.Time) error
	ListHistory(context.Context, string) ([]HistoryItem, error)
}

type MongoRepository struct {
	database *mongo.Database
}

func NewMongoRepository(database *mongo.Database) *MongoRepository {
	return &MongoRepository{database: database}
}

func (r *MongoRepository) FindCheckpoint(ctx context.Context, userID string, recordingID string) (float64, error) {
	var checkpoint struct {
		Seconds float64 `bson:"seconds"`
	}
	err := r.database.Collection("checkpoints").FindOne(ctx, bson.M{"user_id": userID, "recording_id": recordingID}).Decode(&checkpoint)
	if err == mongo.ErrNoDocuments {
		return 0, nil
	}
	return checkpoint.Seconds, err
}

func (r *MongoRepository) SaveCheckpoint(ctx context.Context, userID string, recordingID string, seconds float64) error {
	_, err := r.database.Collection("checkpoints").UpdateOne(ctx,
		bson.M{"user_id": userID, "recording_id": recordingID},
		bson.M{"$set": bson.M{"seconds": seconds, "updated_at": time.Now()}},
		options.Update().SetUpsert(true),
	)
	return err
}

func (r *MongoRepository) SaveHistory(ctx context.Context, userID string, recordingID string, seconds float64, startedAt time.Time) error {
	_, err := r.database.Collection("playback_history").UpdateOne(ctx,
		bson.M{"user_id": userID, "recording_id": recordingID},
		bson.M{"$set": bson.M{"last_position_seconds": seconds, "started_at": startedAt}},
		options.Update().SetUpsert(true),
	)
	return err
}

func (r *MongoRepository) SaveEvent(ctx context.Context, userID string, recordingID string, seconds float64, eventType string, timestamp time.Time) error {
	_, err := r.database.Collection("playback_events").InsertOne(ctx, bson.M{
		"user_id": userID, "recording_id": recordingID, "seconds": seconds, "event_type": eventType, "timestamp": timestamp,
	})
	return err
}

func (r *MongoRepository) ListHistory(ctx context.Context, userID string) ([]HistoryItem, error) {
	cur, err := r.database.Collection("playback_history").Find(ctx,
		bson.M{"user_id": userID, "last_position_seconds": bson.M{"$gt": 0}},
		options.Find().SetSort(bson.D{{Key: "started_at", Value: -1}}).SetLimit(20),
	)
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)

	items := make([]HistoryItem, 0, 20)
	for cur.Next(ctx) {
		var item struct {
			RecordingID string    `bson:"recording_id"`
			StartedAt   time.Time `bson:"started_at"`
			Position    float64   `bson:"last_position_seconds"`
		}
		if err := cur.Decode(&item); err != nil {
			continue
		}
		items = append(items, HistoryItem{RecordingID: item.RecordingID, StartedAt: item.StartedAt, Position: item.Position})
	}
	return items, cur.Err()
}
