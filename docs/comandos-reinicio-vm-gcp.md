```bash
gcloud config set project yousac
gcloud compute instances start yousac-vm --zone=us-central1-a
gcloud compute ssh yousac-vm --zone=us-central1-a
```

```bash
cd ~/yousac
sudo systemctl is-active --quiet docker || sudo systemctl start docker
docker compose --env-file .env.gcp -f docker-compose.gcp.yml config --quiet
docker compose --env-file .env.gcp -f docker-compose.gcp.yml up -d
docker compose --env-file .env.gcp -f docker-compose.gcp.yml ps
```

```bash
docker compose --env-file .env.gcp -f docker-compose.gcp.yml logs --tail=100 gateway frontend playback
```

```bash
curl -kI https://localhost
```

```bash
gcloud compute instances describe yousac-vm \
  --zone=us-central1-a \
  --format='value(status)'
```

```bash
gcloud compute instances describe yousac-vm \
  --zone=us-central1-a \
  --format='value(networkInterfaces[0].accessConfigs[0].natIP)'
```
