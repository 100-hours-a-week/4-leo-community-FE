import { getServerUrl } from '../utils/function.js';
import { requestJson } from '../utils/request.js';

const STATUS_RETRY_COUNT = 20;
const STATUS_RETRY_DELAY_MS = 500;

const sleep = milliseconds =>
  new Promise(resolve => setTimeout(resolve, milliseconds));

const requestPresignedUrl = (type, file, signupProfile) => {
  const path = signupProfile
    ? '/images/presigned-url/signup-profile'
    : '/images/presigned-url';

  const body = signupProfile
    ? {
        content_type: file.type,
        file_size: file.size,
      }
    : {
        type,
        content_type: file.type,
        file_size: file.size,
      };

  return requestJson(`${getServerUrl()}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(body),
  });
};

const putImageToS3 = async (uploadUrl, file) => {
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': file.type,
    },
    body: file,
  });

  if (!response.ok) {
    throw new Error(`S3 이미지 업로드 실패: ${response.status}`);
  }
};

const requestImageStatus = (
  originalKey,
  processedKey,
  signupProfile,
) => {
  const path = signupProfile
    ? '/images/status/signup-profile'
    : '/images/status';

  return requestJson(`${getServerUrl()}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({
      original_key: originalKey,
      processed_key: processedKey,
    }),
  });
};

const waitForProcessedImage = async (
  originalKey,
  processedKey,
  signupProfile,
) => {
  for (let retry = 0; retry < STATUS_RETRY_COUNT; retry += 1) {
    const { ok, data } = await requestImageStatus(
      originalKey,
      processedKey,
      signupProfile,
    );

    if (!ok) {
      throw new Error('이미지 처리 상태 확인 실패');
    }

    if (data?.ready) {
      return data.image_url;
    }

    await sleep(STATUS_RETRY_DELAY_MS);
  }

  throw new Error('이미지 변환 시간이 초과되었습니다.');
};

export const uploadImageWithPresignedUrl = async ({
  type,
  file,
  signupProfile = false,
}) => {
  const { ok, data } = await requestPresignedUrl(
    type,
    file,
    signupProfile,
  );

  if (
    !ok ||
    !data?.upload_url ||
    !data?.original_key ||
    !data?.processed_key
  ) {
    throw new Error('Presigned URL 발급 실패');
  }

  await putImageToS3(data.upload_url, file);

  const imageUrl = await waitForProcessedImage(
    data.original_key,
    data.processed_key,
    signupProfile,
  );

  return {
    imageUrl,
    originalKey: data.original_key,
    processedKey: data.processed_key,
  };
};