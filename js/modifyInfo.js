import { checkNickname } from '../api/signupRequest.js';
import Dialog from '../component/dialog/dialog.js';
import Header from '../component/header/header.js';
import {
    authCheck,
    prependChild,
    getServerUrl,
    resolveImageUrl,
    validNickname,
} from '../utils/function.js';
import { userModify, userDelete } from '../api/modifyInfoRequest.js';
import { uploadImageWithPresignedUrl } from '../api/imageRequest.js';

const emailTextElement = document.querySelector('#id');
const nicknameInputElement = document.querySelector('#nickname');
const profileInputElement = document.querySelector('#profile');
const withdrawBtnElement = document.querySelector('#withdrawBtn');
const nicknameHelpElement = document.querySelector(
    '.inputBox p[name="nickname"]',
);
const resultElement = document.querySelector('.inputBox p[name="result"]');
const modifyBtnElement = document.querySelector('#signupBtn');
const profilePreview = document.querySelector('#profilePreview');
const removeProfileButton = document.querySelector('#removeProfileButton');
const authDataReponse = await authCheck();
const authData = await authDataReponse.json();
// 추가한 부분: userId 추가
const currentUserId = authData.data.user_id;
const changeData = {
    nickname: authData.data.nickname,
    profile_image_url: authData.data.profile_image_url,
};

const DEFAULT_PROFILE_IMAGE = '../public/image/profile/default.jpg';
const HTTP_OK = 200;
const HTTP_NO_CONTENT = 204;
let isProfileUploading = false;

const setData = data => {
    if (data.profile_image_url === null) {
        profilePreview.src = DEFAULT_PROFILE_IMAGE;
        if (removeProfileButton) removeProfileButton.style.display = 'none';
    } else {
        profilePreview.src = resolveImageUrl(
            data.profile_image_url,
            DEFAULT_PROFILE_IMAGE,
        );
        if (removeProfileButton) removeProfileButton.style.display = 'flex';

        localStorage.setItem('profile_image_url', data.profile_image_url);
    }

    emailTextElement.textContent = data.email;
    nicknameInputElement.value = data.nickname;
};

const observeData = () => {
    const button = document.querySelector('#signupBtn');
  
    const hasChanges =
      authData.data.nickname !== changeData.nickname ||
      authData.data.profile_image_url !==
        changeData.profile_image_url;
  
    if (hasChanges && !isProfileUploading) {
      button.disabled = false;
      button.style.backgroundColor = '#7F6AEE';
    } else {
      button.disabled = true;
      button.style.backgroundColor = '#ACA0EB';
    }
  };

const changeEventHandler = async (event, uid) => {
    const button = document.querySelector('#signupBtn');
    if (uid == 'nickname') {
        const value = event.target.value;
        const isValidNickname = validNickname(value);
        const helperElement = nicknameHelpElement;
        let isComplete = false;
        if (value == '' || value == null) {
            helperElement.textContent = '*닉네임을 입력해주세요.';
        } else if (!isValidNickname) {
            helperElement.textContent =
                '*닉네임은 2~10자의 영문자, 한글 또는 숫자만 사용할 수 있습니다. 특수 문자와 띄어쓰기는 사용할 수 없습니다.';
        } else {
            const { status } = await checkNickname(value);
            if (status === HTTP_OK) {
                helperElement.textContent = '';
                isComplete = true;
            } else if (authData.data.nickname === value) {
                helperElement.textContent = '';
                button.disabled = true;
                button.style.backgroundColor = '#ACA0EB';
                return;
            } else {
                helperElement.textContent = '*중복된 닉네임 입니다.';
                button.disabled = true;
                button.style.backgroundColor = '#ACA0EB';
                return;
            }
        }
        if (isComplete) {
            changeData.nickname = value;
        } else {
            changeData.nickname = authData.data.nickname;
        }
    } else if (uid == 'profile') {
        const file = event.target.files[0];
      
        if (!file) {
          return;
        }
      
        isProfileUploading = true;
        profileInputElement.disabled = true;
        observeData();
      
        try {
          const { imageUrl } =
            await uploadImageWithPresignedUrl({
              type: 'profile',
              file,
            });
      
          localStorage.setItem(
            'profile_image_url',
            imageUrl,
          );
      
          changeData.profile_image_url = imageUrl;
      
          profilePreview.src = resolveImageUrl(
            imageUrl,
            DEFAULT_PROFILE_IMAGE,
          );
      
          if (removeProfileButton) {
            removeProfileButton.style.display = 'flex';
          }
        } catch (error) {
          console.error(
            '프로필 이미지 업로드 실패:',
            error,
          );
      
          profileInputElement.value = '';
      
          Dialog(
            '프로필 이미지',
            '이미지 업로드에 실패했습니다.',
          );
        } finally {
          isProfileUploading = false;
          profileInputElement.disabled = false;
        }
    }
    observeData();
};

const sendModifyData = async () => {
    const button = document.querySelector('#signupBtn');

    if (!button.disabled) {
        if (changeData.nickname === '') {
            Dialog('필수 정보 누락', '닉네임을 입력해주세요.');
        } else {
            const { status } = await userModify(currentUserId, changeData);

            if (status === HTTP_OK) {
                localStorage.removeItem('profile_image_url');
                saveToastMessage('수정완료');
                location.href = '/html/modifyInfo.html';
            } else {
                localStorage.removeItem('profile_image_url');
                saveToastMessage('수정실패');
                location.href = '/html/modifyInfo.html';
            }
        }
    }
};

// 회원 탈퇴
const deleteAccount = async () => {
    const callback = async () => {
        const { status } = await userDelete(currentUserId);

        if (status === HTTP_NO_CONTENT) {
            try {
                await fetch(`${getServerUrl()}/auth`, {
                    method: 'DELETE',
                    credentials: 'include',
                });
            } catch (error) {
                console.error('로그아웃 요청 실패:', error);
            }
            location.href = '/html/login.html';
        } else {
            Dialog('회원 탈퇴 실패', '회원 탈퇴에 실패했습니다.');
        }
    };

    Dialog(
        '회원탈퇴 하시겠습니까?',
        '작성된 게시글과 댓글은 삭제 됩니다.',
        callback,
    );
};

const addEvent = () => {
    nicknameInputElement.addEventListener('change', event =>
        changeEventHandler(event, 'nickname'),
    );
    profileInputElement.addEventListener('change', event =>
        changeEventHandler(event, 'profile'),
    );
    if (removeProfileButton) {
        removeProfileButton.addEventListener('click', () => {
            localStorage.removeItem('profile_image_url');
            profilePreview.src = DEFAULT_PROFILE_IMAGE;
            changeData.profile_image_url = null;
            profileInputElement.value = '';
            removeProfileButton.style.display = 'none';
            observeData();
        });
    }
    modifyBtnElement.addEventListener('click', async () => sendModifyData());
    withdrawBtnElement.addEventListener('click', async () => deleteAccount());
};

const showToast = (message, duration = 3000, callback = null) => {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.classList.add('toastMessage');
    toast.textContent = message;

    container.appendChild(toast);

    // 메시지를 보여주기
    setTimeout(() => {
        toast.style.opacity = 1;
        // 조금 더 위로 올라가는 효과를 줄 수 있음
        toast.style.bottom = '30px';
    }, 100);

    // 메시지 숨기기 및 콜백 실행
    setTimeout(() => {
        toast.style.opacity = 0;
        // 원래 위치로 돌아가며 사라지는 효과
        toast.style.bottom = '20px';
        setTimeout(() => {
            // 페이드 아웃이 끝난 후 요소 제거
            toast.remove();
            // 콜백 함수가 있으면 실행
            if (callback) callback();
        }, 500); // CSS transition 시간에 맞춰 설정
    }, duration);
};

const saveToastMessage = message => {
    sessionStorage.setItem('toastMessage', message);
};

// 토스트 메시지 표시 및 저장소에서 삭제
const displayToastFromStorage = () => {
    const message = sessionStorage.getItem('toastMessage');
    if (message) {
        showToast(message, 3000, () => {
            // 메시지 삭제
            sessionStorage.removeItem('toastMessage');
        }); // 메시지를 표시하는 기존 함수 사용
    }
};

const init = () => {
    const profileImage =
        resolveImageUrl(authData.data.profile_image_url, DEFAULT_PROFILE_IMAGE);

    prependChild(document.body, Header('커뮤니티', 2, profileImage));
    setData(authData.data);
    observeData();
    addEvent();
    displayToastFromStorage();
};

init();
