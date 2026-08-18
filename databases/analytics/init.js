db.createCollection('views');
db.views.createIndex({ viewed_at: 1, recording_id: 1 });
db.views.createIndex({ recording_id: 1, viewed_at: 1 });
db.createCollection('trends');
db.trends.createIndex({ period_id: 1, topic: 1 });
db.createCollection('exam_periods');
db.exam_periods.createIndex({ start_at: 1, end_at: 1 });
