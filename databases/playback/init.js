db.createCollection('checkpoints');
db.checkpoints.createIndex({user_id: 1, recording_id: 1}, {unique: true});
db.createCollection('playback_history');
db.playback_history.createIndex({user_id: 1, started_at: -1});
db.createCollection('playback_events');
db.playback_events.createIndex({timestamp: 1}, {expireAfterSeconds: 2592000});
db.checkpoints.insertOne({user_id: '00000000-0000-0000-0000-000000000002', recording_id: '00000000-0000-0000-0000-000000000304', seconds: 12.5, updated_at: new Date()});

