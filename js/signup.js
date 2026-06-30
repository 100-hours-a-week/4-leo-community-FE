import Dialog from '../component/dialog/dialog.js';
import Header from '../component/header/header.js';
import {
    authCheckReverse,
    prependChild,
    validEmail,
    validPassword,
    validNickname,
} from '../utils/function.js';
import {
    userSignup,
    checkEmail,
    checkNickname,
} from '../api/signupRequest.js';
import { 
    uploadImageWithPresignedUrl 
} from '../api/imageRequest.js';

const MAX_PASSWORD_LENGTH = 20;
const HTTP_OK = 200;
const HTTP_CREATED = 201;
const DEBOUNCE_DELAY = 400;

const signupData = {
    email: '',
    password: '',
    passwordCheck: '',
    nickname: '',
    profile_image_url: '',
};

let isProfileUploading = false;
let emailCheckTimeoutId = null;
let nicknameCheckTimeoutId = null;

const getSignupData = () => {
    const { email, password, passwordCheck, nickname, profile_image_url } =
        signupData;

    if (!email || !password || !passwordCheck || !nickname || !profile_image_url) {
        Dialog('필수 입력 사항', '모든 값을 입력해주세요.');
        return;
    }

    if (isProfileUploading) {
        Dialog('프로필 이미지', '이미지 업로드가 끝난 뒤 다시 시도해주세요.');
        return;
    }

    sendSignupData();
};

const sendSignupData = async () => {
    const { passwordCheck, ...props } = signupData;

    if (props.password.length > MAX_PASSWORD_LENGTH) {
        Dialog('비밀번호', '비밀번호는 20자 이하로 입력해주세요.');
        return;
    }
    // signupData를 서버로 전송
    const { status, code } = await userSignup(props);

    // 응답이 성공적으로 왔을 경우
    if (status === HTTP_CREATED) {
        location.href = '/html/login.html';
    } else {
        if (code === 'email_already_exists') {
            Dialog('회원 가입 실패', '이미 사용 중인 이메일입니다.');
        } else if (code === 'nickname_already_exists') {
            Dialog('회원 가입 실패', '이미 사용 중인 닉네임입니다.');
        } else if (code === 'invalid_register_request') {
            Dialog('회원 가입 실패', '입력값을 확인해주세요.');
        } else {
            Dialog('회원 가입 실패', '잠시 뒤 다시 시도해 주세요.');
        }
    }
};

const signupClick = () => {
    // signup 버튼 클릭 시
    const signupBtn = document.querySelector('#signupBtn');
    signupBtn.addEventListener('click', getSignupData);
};

const changeEventHandler = async (event, uid) => {
    if (uid === 'profile') {
        const file = event.target.files[0];
        const helperElement = document.querySelector(
            `.inputBox p[name="${uid}"]`,
        );

        signupData.profile_image_url = '';

        if (!file) {
            helperElement.textContent = '*프로필 이미지를 업로드해주세요.';
            observeSignupData();
            return;
        }

        const formData = new FormData();
        formData.append('image', file);

        isProfileUploading = true;
        helperElement.textContent = '*이미지 업로드 중입니다.';
        observeSignupData();

        try {
            const { ok, data, code } = await fileUpload(formData);

            if (!ok || !data?.image_url) {
                signupData.profile_image_url = '';
                helperElement.textContent =
                    code === 'unsupported_image_type'
                        ? '*지원하지 않는 이미지 형식입니다.'
                        : '*이미지 업로드에 실패했습니다.';
                return;
            }

            signupData.profile_image_url = data.image_url;
            helperElement.textContent = '';
        } catch (error) {
            signupData.profile_image_url = '';
            helperElement.textContent = '*이미지 업로드에 실패했습니다.';
        } finally {
            isProfileUploading = false;
            observeSignupData();
        }
    }
};

const inputEventHandler = async (event, uid) => {
    if (uid === 'profile') {
        const file = event.target.files[0];
      
        const helperElement = document.querySelector(
          `.inputBox p[name="${uid}"]`,
        );
      
        signupData.profile_image_url = '';
      
        if (!file) {
          helperElement.textContent =
            '*프로필 이미지를 업로드해주세요.';
      
          observeSignupData();
          return;
        }
      
        isProfileUploading = true;
        helperElement.textContent = '*이미지 업로드 중입니다.';
        observeSignupData();
      
        try {
          const { imageUrl } =
            await uploadImageWithPresignedUrl({
              file,
              signupProfile: true,
            });
      
          signupData.profile_image_url = imageUrl;
          helperElement.textContent = '';
        } catch (error) {
          console.error('프로필 이미지 업로드 실패:', error);
      
          signupData.profile_image_url = '';
          event.target.value = '';
      
          helperElement.textContent =
            '*이미지 업로드에 실패했습니다.';
        } finally {
          isProfileUploading = false;
          observeSignupData();
        }
      } else if (uid == 'pw') {
        const value = event.target.value;
        const isValidPassword = validPassword(value);
        const helperElement = document.querySelector(
            `.inputBox p[name="${uid}"]`,
        );
        const helperElementCheck = document.querySelector(
            `.inputBox p[name="pwck"]`,
        );
        const passwordCheckInput =
            document.querySelector('#pwck')?.value || '';
    
        if (!helperElement) return;
    
        if (value == '' || value == null) {
            signupData.password = '';
            signupData.passwordCheck = '';
            helperElement.textContent = '*비밀번호를 입력해주세요.';
            helperElementCheck.textContent = '';
        } else if (!isValidPassword) {
            signupData.password = '';
            signupData.passwordCheck = '';
            helperElement.textContent =
                '*비밀번호는 8자 이상, 20자 이하이며, 대문자, 소문자, 숫자, 특수문자를 각각 최소 1개 포함해야 합니다.';
            helperElementCheck.textContent = '';
        } else {
            signupData.password = value;
            helperElement.textContent = '';
    
            if (!passwordCheckInput) {
                signupData.passwordCheck = '';
                helperElementCheck.textContent = '';
            } else if (passwordCheckInput !== value) {
                signupData.passwordCheck = '';
                helperElementCheck.textContent = '*비밀번호가 다릅니다.';
            } else {
                signupData.passwordCheck = passwordCheckInput;
                helperElementCheck.textContent = '';
            }
        }
    } else if (uid == 'pwck') {
        const value = event.target.value;
        const helperElement = document.querySelector(
            `.inputBox p[name="${uid}"]`,
        );
        const password = signupData.password;
    
        if (value == '' || value == null) {
            signupData.passwordCheck = '';
            helperElement.textContent = '*비밀번호 한번 더 입력해주세요.';
        } else if (password !== value) {
            signupData.passwordCheck = '';
            helperElement.textContent = '*비밀번호가 다릅니다.';
        } else {
            signupData.passwordCheck = value;
            helperElement.textContent = '';
        }
    } else if (uid == 'nickname') {
        const value = event.target.value.trim();
        const isValidNickname = validNickname(value);
        const helperElement = document.querySelector(
            `.inputBox p[name="${uid}"]`,
        );
    
        clearTimeout(nicknameCheckTimeoutId);
        signupData.nickname = '';
    
        if (value == '' || value == null) {
            helperElement.textContent = '*닉네임을 입력해주세요.';
            observeSignupData();
            return;
        }
    
        if (value.includes(' ')) {
            helperElement.textContent = '*뛰어쓰기를 없애주세요.';
            observeSignupData();
            return;
        }
    
        if (value.length > 10) {
            helperElement.textContent =
                '*닉네임은 최대 10자까지 작성 가능합니다.';
            observeSignupData();
            return;
        }
    
        if (!isValidNickname) {
            helperElement.textContent =
                '*닉네임에 특수 문자는 사용할 수 없습니다.';
            observeSignupData();
            return;
        }
    
        helperElement.textContent = '*닉네임 중복 확인 중입니다.';
        observeSignupData();
    
        const requestedValue = value;
    
        nicknameCheckTimeoutId = setTimeout(async () => {
            try {
                const { status } = await checkNickname(requestedValue);
    
                const currentValue =
                    document.querySelector('#nickname')?.value.trim() || '';
    
                if (currentValue !== requestedValue) {
                    return;
                }
    
                if (status === HTTP_OK) {
                    helperElement.textContent = '';
                    signupData.nickname = requestedValue;
                } else {
                    helperElement.textContent = '*중복된 닉네임 입니다.';
                    signupData.nickname = '';
                }
            } catch (error) {
                const currentValue =
                    document.querySelector('#nickname')?.value.trim() || '';
    
                if (currentValue !== requestedValue) {
                    return;
                }
    
                helperElement.textContent = '*닉네임 확인 중 오류가 발생했습니다.';
                signupData.nickname = '';
            } finally {
                observeSignupData();
            }
        }, DEBOUNCE_DELAY);
    }
    observeSignupData();
};

const addEventForInputElements = () => {
    const InputElement = document.querySelectorAll('input');
    InputElement.forEach(element => {
        const id = element.id;
        if (id === 'profile') {
            element.addEventListener('change', event =>
                changeEventHandler(event, id),
            );
        } else {
            element.addEventListener('input', event =>
                inputEventHandler(event, id),
            );
        }
    });
};

const observeSignupData = () => {
    const { email, password, passwordCheck, nickname, profile_image_url } =
        signupData;
    const button = document.querySelector('#signupBtn');

    if (
        !email ||
        !validEmail(email) ||
        !password ||
        !validPassword(password) ||
        !nickname ||
        !validNickname(nickname) ||
        !passwordCheck ||
        !profile_image_url ||
        isProfileUploading
    ) {
        button.disabled = true;
        button.style.backgroundColor = '#ACA0EB';
    } else {
        button.disabled = false;
        button.style.backgroundColor = '#7F6AEE';
    }
};

const init = async () => {
    await authCheckReverse();
    prependChild(document.body, Header('커뮤니티', 1));
    observeSignupData();
    addEventForInputElements();
    signupClick();
};

init();
