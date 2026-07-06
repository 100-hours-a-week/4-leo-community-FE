import CommentItem from '../component/comment/comment.js';
import Dialog from '../component/dialog/dialog.js';
import Header from '../component/header/header.js';
import {
    authCheck,
    prependChild,
    padTo2Digits,
    resolveImageUrl,
} from '../utils/function.js';
import {
    getPost,
    deletePost,
    writeComment,
    getComments,
    togglePostLike,
} from '../api/boardRequest.js';

const DEFAULT_PROFILE_IMAGE = '/public/profile_default.svg';
const MAX_COMMENT_LENGTH = 1000;
const HTTP_NOT_AUTHORIZED = 401;
const HTTP_OK = 200;

const formatCount = value => {
    const count = Number(value);
    if (!Number.isFinite(count)) return value ?? '';
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toLocaleString();
};

const setLikeButtonState = (button, isLiked) => {
    button.classList.toggle('is-active', isLiked);
    button.setAttribute('aria-pressed', isLiked ? 'true' : 'false');
};

const getQueryString = name => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
};

const getBoardDetail = async postId => {
    const { ok, data } = await getPost(postId);
    if (!ok)
        return new Error('게시글 정보를 가져오는데 실패하였습니다.');
    return data.post;
};

const setBoardDetail = data => {
    // 헤드 정보
    const titleElement = document.querySelector('.title');
    const createdAtElement = document.querySelector('.createdAt');
    const imgElement = document.querySelector('.img');
    const nicknameElement = document.querySelector('.nickname');

    titleElement.textContent = data.title;
    const date = new Date(data.created_at);
    const formattedDate = `${date.getFullYear()}-${padTo2Digits(date.getMonth() + 1)}-${padTo2Digits(date.getDate())} ${padTo2Digits(date.getHours())}:${padTo2Digits(date.getMinutes())}:${padTo2Digits(date.getSeconds())}`;
    createdAtElement.textContent = formattedDate;

    imgElement.src = resolveImageUrl(
        data.author ? data.author.profile_image_url : null,
        DEFAULT_PROFILE_IMAGE,
    );

    nicknameElement.textContent = data.author ? data.author.nickname : '';

    // 바디 정보
    const contentImgElement = document.querySelector('.contentImg');
    const fileUrl = data.image_url;
    if (fileUrl) {
        const img = document.createElement('img');
        img.src = resolveImageUrl(fileUrl);
        img.alt = data.title || '게시글 이미지';
        contentImgElement.appendChild(img);
    } else {
        contentImgElement.classList.add('isEmpty');
        contentImgElement.textContent = 'No photo';
    }
    const contentElement = document.querySelector('.content');
    contentElement.textContent = data.content;

    const likeButtonElement = document.querySelector('.likeButton');
    const likeCountElement = likeButtonElement.querySelector('h3');
    let isLiked = Boolean(data.is_liked);
    let isLikeLoading = false;

    likeCountElement.textContent = formatCount(data.like_count);
    setLikeButtonState(likeButtonElement, isLiked);

    likeButtonElement.addEventListener('click', async () => {
        if (isLikeLoading) return;
        isLikeLoading = true;
    
        try {
            const { ok, status, data: likeData } = await togglePostLike(data.post_id);
    
            if (ok) {
                isLiked = likeData.is_liked;
                setLikeButtonState(likeButtonElement, isLiked);
                likeCountElement.textContent = formatCount(likeData.like_count);
            } else if (status === HTTP_NOT_AUTHORIZED) {
                window.location.href = '/html/login.html';
            } else {
                Dialog('좋아요 실패', '좋아요 처리에 실패하였습니다.');
            }
        } finally {
            isLikeLoading = false;
        }
    });

    const viewCountElement = document.querySelector('.viewCount h3');
    viewCountElement.textContent = formatCount(data.view_count);

    const commentCountElement = document.querySelector('.commentCount h3');
    commentCountElement.textContent = data.comment_count.toLocaleString();
};

const setBoardModify = async data => {
    if (data.is_author) {
        const modifyElement = document.querySelector('.hidden');
        modifyElement.classList.remove('hidden');

        const modifyBtnElement = document.querySelector('#deleteBtn');
        const postId = getQueryString('id');
        modifyBtnElement.addEventListener('click', () => {
            Dialog(
                '게시글을 삭제하시겠습니까?',
                '삭제한 내용은 복구 할 수 없습니다.',
                async () => {
                    const { ok } = await deletePost(postId);
                    if (ok) {
                        window.location.href = '/';
                    } else {
                        Dialog('삭제 실패', '게시글 삭제에 실패하였습니다.');
                    }
                },
            );
        });

        const modifyBtnElement2 = document.querySelector('#modifyBtn');
        modifyBtnElement2.addEventListener('click', () => {
            window.location.href = `/html/board-modify.html?postId=${data.post_id}`;
        });
    }
};

const getBoardComment = async id => {
    const { ok, status, data } = await getComments(id);
    if (!ok) return [];
    if (status !== HTTP_OK) return [];
    return data.comments || [];
};

const setBoardComment = (comments, postId) => {
    const commentListElement = document.querySelector('.commentList');
    if (!commentListElement) return;

    commentListElement.innerHTML = '';

    comments.forEach(comment => {
        const item = CommentItem(comment, postId);
        commentListElement.appendChild(item);
    });
};

const addComment = async () => {
    const comment = document.querySelector('textarea').value;
    const pageId = getQueryString('id');

    const { ok } = await writeComment(pageId, comment);

    if (ok) {
        window.location.reload();
    } else {
        Dialog('댓글 등록 실패', '댓글 등록에 실패하였습니다.');
    }
};

const inputComment = async () => {
    const textareaElement = document.querySelector(
        '.commentInputWrap textarea',
    );
    const commentBtnElement = document.querySelector('.commentInputBtn');

    if (textareaElement.value.length > MAX_COMMENT_LENGTH) {
        textareaElement.value = textareaElement.value.substring(
            0,
            MAX_COMMENT_LENGTH,
        );
    }
    if (textareaElement.value === '') {
        commentBtnElement.disabled = true;
        commentBtnElement.style.opacity = '0.45';
    } else {
        commentBtnElement.disabled = false;
        commentBtnElement.style.opacity = '1';
    }
};

const init = async () => {
    try {
        const data = await authCheck();
        const myInfoResult = await data.json();
        if (data.status !== HTTP_OK) {
            throw new Error('사용자 정보를 불러오는데 실패하였습니다.');
        }

        const myInfo = myInfoResult.data;
        const commentBtnElement = document.querySelector('.commentInputBtn');
        const textareaElement = document.querySelector(
            '.commentInputWrap textarea',
        );
        textareaElement.addEventListener('input', inputComment);
        commentBtnElement.addEventListener('click', addComment);
        commentBtnElement.disabled = true;
        if (data.status === HTTP_NOT_AUTHORIZED) {
            window.location.href = '/html/login.html';
        }
        const profileImage = resolveImageUrl(
            myInfo.profile_image_url,
            DEFAULT_PROFILE_IMAGE,
        );

        prependChild(document.body, Header('Leo Photos', 2, profileImage));

        const pageId = getQueryString('id');

        const pageData = await getBoardDetail(pageId);

        setBoardModify(pageData);
        setBoardDetail(pageData);

        getBoardComment(pageId).then(comments => setBoardComment(comments, pageId));
    } catch (error) {
        console.error(error);
    }
};

init();
