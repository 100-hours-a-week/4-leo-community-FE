#!/usr/bin/env bash
set -euo pipefail

IMAGE_TAG="${1:?IMAGE_TAG(git-hash)를 첫 번째 인자로 넘겨야 합니다}"

REGION="ap-northeast-2"
ACCOUNT_ID="501479502338"
ECR_REGISTRY="${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com"
DEPLOY_DIR="/home/ubuntu/community-frontend"
SERVICE_NAME="community-frontend"

echo "==> [1/5] 배포 시작 | tag=${IMAGE_TAG}"
cd "${DEPLOY_DIR}"

echo "==> [2/5] ECR 로그인"
aws ecr get-login-password --region "${REGION}" \
  | docker login --username AWS --password-stdin "${ECR_REGISTRY}"

echo "==> [3/5] 새 이미지 pull"
export IMAGE_TAG
docker compose pull "${SERVICE_NAME}"

echo "==> [4/5] 컨테이너 교체 (up -d)"
# --wait: 컨테이너가 healthy 될 때까지 docker compose 가 대기한다.
# --wait-timeout: 그 대기 상한(초). 이 시간 안에 healthy 못 되면 실패 처리.
docker compose up -d --wait --wait-timeout 120 "${SERVICE_NAME}"

echo "==> [5/5] 배포 검증 및 정리"
# 실행 중인지 최종 확인
if ! docker ps --filter "name=${SERVICE_NAME}" --filter "status=running" --format '{{.Names}}' | grep -q "${SERVICE_NAME}"; then
  echo "!! 배포 실패: ${SERVICE_NAME} 컨테이너가 running 상태가 아닙니다"
  docker compose logs --tail=50 "${SERVICE_NAME}" || true
  exit 1
fi

# 사용하지 않는 dangling 이미지 정리 (디스크 관리)
docker image prune -f >/dev/null 2>&1 || true

echo "==> 배포 완료 | ${SERVICE_NAME} | tag=${IMAGE_TAG}"