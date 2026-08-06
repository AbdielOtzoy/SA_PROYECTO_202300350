db.createCollection('views');
db.views.createIndex({ viewed_at: -1, recording_id: 1 });
db.createCollection('trends');
db.createCollection('exam_periods');
