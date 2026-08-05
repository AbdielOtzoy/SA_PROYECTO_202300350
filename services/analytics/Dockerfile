FROM python:3.12-slim
WORKDIR /app
COPY services/analytics/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY proto /proto
COPY services/analytics/app ./
RUN python -m grpc_tools.protoc -I /proto --python_out=. --grpc_python_out=. /proto/analytics.proto
CMD ["python","main.py"]

