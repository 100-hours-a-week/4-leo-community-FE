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

# 롤백 대비: 현재 실행 중인 컨테이너의 이미지 태그를 기록
PREVIOUS_TAG=""
if docker ps --filter "name=${SERVICE_NAME}" --format '{{.Names}}' | grep -q "${SERVICE_NAME}"; then
  CURRENT_IMAGE="$(docker inspect "${SERVICE_NAME}" --format '{{.Config.Image}}' 2>/dev/null || true)"
  PREVIOUS_TAG="${CURRENT_IMAGE##*:}"   # 이미지 문자열에서 태그 부분만 추출
fi

export IMAGE_TAG
docker compose pull "${SERVICE_NAME}"

# 새 이미지로 교체. healthy 되지 않으면 아래 롤백 로직으로
if docker compose up -d --wait --wait-timeout 120 "${SERVICE_NAME}"; then
  docker image prune -f >/dev/null 2>&1 || true
  echo "deploy success | tag=${IMAGE_TAG}"
  exit 0
fi

# ---- 여기부터 롤백 ----
echo "::warning:: deploy failed (tag=${IMAGE_TAG}). attempting rollback."
docker compose logs --tail=50 "${SERVICE_NAME}" || true

if [ -z "${PREVIOUS_TAG}" ] || [ "${PREVIOUS_TAG}" = "${IMAGE_TAG}" ]; then
  # 되돌릴 이전 태그가 없거나(첫 배포) 같은 태그면 롤백 불가
  echo "::error:: no valid previous tag to roll back to. deploy failed."
  exit 1
fi

echo "rolling back to previous tag=${PREVIOUS_TAG}"
export IMAGE_TAG="${PREVIOUS_TAG}"
docker compose pull "${SERVICE_NAME}" || true

if docker compose up -d --wait --wait-timeout 120 "${SERVICE_NAME}"; then
  echo "::warning:: rolled back to ${PREVIOUS_TAG}. new deploy (${1}) failed."
    # 배포 자체는 실패로 처리하되, 서비스는 이전 버전으로 복구된 상태
  exit 1
else
  echo "::error:: rollback to ${PREVIOUS_TAG} also failed. service may be down."
  docker compose logs --tail=50 "${SERVICE_NAME}" || true
  exit 1
fi