import datetime as dt
import os
from concurrent import futures
import grpc
import jwt
from pymongo import MongoClient
from redis import Redis
import analytics_pb2
import analytics_pb2_grpc

class Analytics(analytics_pb2_grpc.AnalyticsServiceServicer):
    def __init__(self):
        self.views = MongoClient(os.environ['ANALYTICS_MONGO_URL']).get_database().views
        self.cache = Redis.from_url(os.environ['REDIS_URL'], decode_responses=True)
    @staticmethod
    def authorize(context):
        token = next((item.value[7:] for item in context.invocation_metadata() if item.key == 'authorization' and item.value.startswith('Bearer ')), None)
        if not token:
            context.abort(grpc.StatusCode.UNAUTHENTICATED, 'JWT interno requerido')
        try:
            jwt.decode(token, os.environ['JWT_SECRET'], algorithms=['HS256'])
        except jwt.PyJWTError:
            context.abort(grpc.StatusCode.UNAUTHENTICATED, 'JWT interno inválido')
    def RecordView(self, request, context):
        self.authorize(context)
        self.views.insert_one({'user_id': request.user_id, 'recording_id': request.recording_id, 'viewed_at': dt.datetime.now(dt.timezone.utc)})
        self.cache.delete('analytics:most-viewed:current')
        return analytics_pb2.Empty()
    def MostViewed(self, request, context):
        self.authorize(context)
        start = dt.datetime.fromisoformat(request.week_start.replace('Z', '+00:00')) if request.week_start else dt.datetime.now(dt.timezone.utc) - dt.timedelta(days=7)
        key = 'analytics:most-viewed:' + start.date().isoformat()
        cached = self.cache.get(key)
        if cached:
            return analytics_pb2.MostViewedReply.FromString(bytes.fromhex(cached))
        rows = self.views.aggregate([{'$match': {'viewed_at': {'$gte': start}}}, {'$group': {'_id': '$recording_id', 'views': {'$sum': 1}}}, {'$sort': {'views': -1}}, {'$limit': 10}])
        reply = analytics_pb2.MostViewedReply(items=[analytics_pb2.MostViewedItem(recording_id=x['_id'], views=x['views']) for x in rows])
        self.cache.setex(key, 300, reply.SerializeToString().hex())
        return reply

def main():
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=8))
    analytics_pb2_grpc.add_AnalyticsServiceServicer_to_server(Analytics(), server)
    server.add_insecure_port('[::]:50054')
    server.start(); server.wait_for_termination()
if __name__ == '__main__': main()
