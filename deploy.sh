#!/usr/bin/env bash
set -euo pipefail

# 사용: ./deploy.sh <IMAGE_TAG>
IMAGE_TAG="${1:?IMAGE_TAG required}"

REGION="ap-northeast-2"
ECR_REGISTRY="501479502338.dkr.ecr.${REGION}.amazonaws.com"
DEPLOY_DIR="/home/ubuntu/community-frontend"
SERVICE_NAME="community-frontend"

cd "${DEPLOY_DIR}"

aws ecr get-login-password --region "${REGION}" \
  | docker login --username AWS --password-stdin "${ECR_REGISTRY}"

export IMAGE_TAG
docker compose pull "${SERVICE_NAME}"
docker compose up -d --wait --wait-timeout 120 "${SERVICE_NAME}"

# 배포 실패 시 원인 파악을 위해 로그를 남기고 종료
if ! docker ps --filter "name=${SERVICE_NAME}" --filter "status=running" --format '{{.Names}}' | grep -q "${SERVICE_NAME}"; then
  docker compose logs --tail=50 "${SERVICE_NAME}" || true
  exit 1
fi

docker image prune -f >/dev/null 2>&1 || true