import Dialog from '../component/dialog/dialog.js';
import Header from '../component/header/header.js';
import {
    authCheck,
    getQueryString,
    getServerUrl,
    prependChild,
    resolveImageUrl,
} from '../utils/function.js';
import {
    createPost,
    updatePost,
    getBoardItem,
} from '../api/board-writeRequest.js';
import { 
    uploadImageWithPresignedUrl 
} from '../api/imageRequest.js';

const HTTP_OK = 200;
const HTTP_CREATED = 201;

const MAX_TITLE_LENGTH = 26;
const MAX_CONTENT_LENGTH = 1500;

const DEFAULT_PROFILE_IMAGE = '/public/profile_default.svg';

const submitButton = document.querySelector('#submit');
const titleInput = document.querySelector('#title');
const contentInput = document.querySelector('#content');
const imageInput = document.querySelector('#image');
const imagePreviewText = document.getElementById('imagePreviewText');
const uploadDrop = document.querySelector('.uploadDrop');
const imagePreview = document.getElementById('imagePreview');
const uploadEmpty = document.getElementById('uploadEmpty');
let localPreviewUrl = null;
const contentHelpElement = document.querySelector(
    '.inputBox p[name="content"]',
);

const boardWrite = {
    title: '',
    content: '',
};

let isModifyMode = false;
let modifyData = {};

const observeSignupData = () => {
    const { title, content } = boardWrite;
    if (!title || !content || title === '' || content === '') {
        submitButton.disabled = true;
        submitButton.style.opacity = '0.42';
    } else {
        submitButton.disabled = false;
        submitButton.style.opacity = '1';
    }
};

// 엘리먼트 값 가져오기 title, content
const getBoardData = () => {
    return {
        title: boardWrite.title,
        content: boardWrite.content,
        image_url:
            localStorage.getItem('postFileUrl') === null
                ? null
                : localStorage.getItem('postFileUrl'),
    };
};

// 버튼 클릭시 이벤트
const addBoard = async () => {
    const boardData = getBoardData();

    // boardData가 false일 경우 함수 종료
    if (!boardData) return Dialog('게시글', '게시글을 입력해주세요.');

    if (boardData.title.length > MAX_TITLE_LENGTH)
        return Dialog('게시글', '제목은 26자 이하로 입력해주세요.');

    if (!isModifyMode) {
        const { ok, status, data } = await createPost(boardData);
        if (!ok) throw new Error('서버 응답 오류');

        if (status === HTTP_CREATED) {
            localStorage.removeItem('postFileUrl');
            window.location.href = `/html/board.html?id=${data.post.post_id}`;
        } else {
            const helperElement = contentHelpElement;
            helperElement.textContent = '제목, 내용을 모두 작성해주세요.';
        }
    } else {
        // 게시글 작성 api 호출
        const postId = getQueryString('postId');
        const setData = {
            ...boardData,
        };

        const { ok, status } = await updatePost(postId, setData);
        if (!ok) throw new Error('서버 응답 오류');

        if (status === HTTP_OK) {
            localStorage.removeItem('postFileUrl');
            window.location.href = `/html/board.html?id=${postId}`;
        } else {
            Dialog('게시글', '게시글 수정 실패');
        }
    }
};
const changeEventHandler = async (event, uid) => {
    if (uid == 'title') {
        const value = event.target.value;
        const helperElement = contentHelpElement;
        if (!value || value == '') {
            boardWrite[uid] = '';
            helperElement.textContent = '제목을 입력해주세요.';
        } else if (value.length > MAX_TITLE_LENGTH) {
            helperElement.textContent = '제목은 26자 이하로 입력해주세요.';
            titleInput.value = value.substring(0, MAX_TITLE_LENGTH);
            boardWrite[uid] = value.substring(0, MAX_TITLE_LENGTH);
        } else {
            boardWrite[uid] = value;
            helperElement.textContent = '';
        }
    } else if (uid == 'content') {
        const value = event.target.value;
        const helperElement = contentHelpElement;
        if (!value || value == '') {
            boardWrite[uid] = '';
            helperElement.textContent = '내용을 입력해주세요.';
        } else if (value.length > MAX_CONTENT_LENGTH) {
            helperElement.textContent = '내용은 1500자 이하로 입력해주세요.';
            contentInput.value = value.substring(0, MAX_CONTENT_LENGTH);
            boardWrite[uid] = value.substring(0, MAX_CONTENT_LENGTH);
        } else {
            boardWrite[uid] = value;
            helperElement.textContent = '';
        }
    } else if (uid == 'image') {
        const file = event.target.files[0];
      
        if (!file) {
          return;
        }
      
        imageInput.disabled = true;
        submitButton.disabled = true;

        if (localPreviewUrl) {
            URL.revokeObjectURL(localPreviewUrl);
        }
        localPreviewUrl = URL.createObjectURL(file);
        if (imagePreview && uploadDrop) {
            imagePreview.src = localPreviewUrl;
            uploadDrop.classList.add('hasImage');
        }
        if (imagePreviewText !== null) {
            imagePreviewText.textContent = '업로드 처리 중...';
            imagePreviewText.style.display = 'block';
        }
      
        try {
          const { imageUrl } = await uploadImageWithPresignedUrl({
            type: 'post',
            file,
          });
      
          localStorage.setItem('postFileUrl', imageUrl);
      
          if (imagePreviewText !== null) {
            imagePreviewText.textContent = '선택한 사진 지우기';
            imagePreviewText.style.display = 'block';
          }
        } catch (error) {
          console.error('이미지 업로드 실패:', error);
      
          imageInput.value = '';
          if (uploadDrop) uploadDrop.classList.remove('hasImage');
          if (imagePreview) imagePreview.removeAttribute('src');
      
          Dialog(
            '이미지 업로드',
            '이미지 업로드에 실패했습니다.',
          );
        } finally {
          imageInput.disabled = false;
        }
    } else if (uid === 'imagePreviewText') {
        localStorage.removeItem('postFileUrl');
        imageInput.value = '';
        imagePreviewText.style.display = 'none';
        if (uploadDrop) uploadDrop.classList.remove('hasImage');
        if (imagePreview) imagePreview.removeAttribute('src');
        if (localPreviewUrl) {
            URL.revokeObjectURL(localPreviewUrl);
            localPreviewUrl = null;
        }
        }

    observeSignupData();
};
// 수정모드시 사용하는 게시글 단건 정보 가져오기
const getBoardModifyData = async postId => {
    const { ok, data } = await getBoardItem(postId);
    if (!ok) throw new Error('서버 응답 오류');
    return data.post;
};

// 수정 모드인지 확인
const checkModifyMode = () => {
    const postId = getQueryString('postId');
    if (!postId) return false;
    return postId;
};

// 이벤트 등록
const addEvent = () => {
    submitButton.addEventListener('click', addBoard);
    titleInput.addEventListener('input', event =>
        changeEventHandler(event, 'title'),
    );
    contentInput.addEventListener('input', event =>
        changeEventHandler(event, 'content'),
    );
    imageInput.addEventListener('change', event =>
        changeEventHandler(event, 'image'),
    );
    if (imagePreviewText !== null) {
        imagePreviewText.addEventListener('click', event =>
            changeEventHandler(event, 'imagePreviewText'),
        );
    }
};

const setModifyData = data => {
    titleInput.value = data.title;
    contentInput.value = data.content;

    const fileUrl = data.image_url;

    if (fileUrl) {
        if (imagePreview && uploadDrop) {
            imagePreview.src = resolveImageUrl(fileUrl);
            uploadDrop.classList.add('hasImage');
        }
        imagePreviewText.textContent = '선택한 사진 지우기';
        imagePreviewText.style.display = 'block';
        localStorage.setItem('postFileUrl', fileUrl);
    } else {
        imagePreviewText.style.display = 'none';
    }

    boardWrite.title = data.title;
    boardWrite.content = data.content;

    observeSignupData();
};


const init = async () => {
    const dataResponse = await authCheck();
    const data = await dataResponse.json();
    const modifyId = checkModifyMode();

    const profileImage = resolveImageUrl(
        data.data.profile_image_url,
        DEFAULT_PROFILE_IMAGE,
    );

    prependChild(document.body, Header('Leo Photos', 1, profileImage));

    if (modifyId) {
        isModifyMode = true;
        modifyData = await getBoardModifyData(modifyId);

        if (!modifyData.is_author) {
            Dialog('권한 없음', '권한이 없습니다.', () => {
                window.location.href = '/';
            });
        } else {
            setModifyData(modifyData);
        }
    }

    addEvent();
};

init();
