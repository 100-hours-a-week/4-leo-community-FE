import { resolveImageUrl, padTo2Digits } from '../../utils/function.js';
import Dialog from '../dialog/dialog.js';
import { deleteComment, updateComment } from '../../api/commentRequest.js';

const DEFAULT_PROFILE_IMAGE = '../public/image/profile/default.jpg';

const CommentItem = (data, postId) => {
    const commentId = data.comment_id;

    const CommentDelete = () => {
        Dialog(
            '댓글을 삭제하시겠습니까?',
            '삭제한 내용은 복구 할 수 없습니다.',
            async () => {
                const { ok } = await deleteComment(commentId);
                if (!ok) {
                    Dialog('삭제 실패', '댓글 삭제에 실패하였습니다.');
                    return;
                }

                location.href = '/html/board.html?id=' + postId;
            },
        );
    };

    const CommentModify = () => {
        // 댓글 내용을 보여주는 p 태그 찾기
        const p = commentInfoWrap.querySelector('p');
        if (!p) return;
        // 현재 댓글 내용 저장
        const originalContent = p.innerHTML.replace(/<br>/g, '\n');

        // textarea 생성 및 설정
        const textarea = document.createElement('textarea');
        textarea.className = 'commentEditTextarea';
        textarea.value = originalContent;
        textarea.maxLength = 1500; // 최대 글자 수 제한

        // 사용자가 입력할 때마다 글자 수 체크
        textarea.addEventListener('input', () => {
            if (textarea.value.length > 1500) {
                // 1500자를 초과하는 경우, 초과분을 자름
                textarea.value = textarea.value.substring(0, 1500);
                // 사용자에게 경고 메시지를 보여주는 방법도 고려할 수 있음
                // alert('댓글은 1500자를 초과할 수 없습니다.');
            }
        });

        const editWrap = document.createElement('div');
        editWrap.className = 'commentEditWrap';

        const editActions = document.createElement('div');
        editActions.className = 'commentEditActions';

        // 수정 완료(저장) 버튼 생성 및 설정
        const saveButton = document.createElement('button');
        saveButton.className = 'commentEditSave';
        saveButton.textContent = '저장';
        saveButton.onclick = async () => {
            if (textarea.value.length === 0) {
                Dialog('수정 실패', '댓글은 1자 이상 입력해주세요.');
                return;
            }
            // 서버로 수정된 댓글 내용 전송하는 로직
            const updatedContent = textarea.value;

            const { ok } = await updateComment(commentId, updatedContent);
            if (!ok)
                return Dialog('수정 실패', '댓글 수정에 실패하였습니다.');

            location.href = '/html/board.html?id=' + postId;
        };

        // 취소 버튼 생성 및 설정
        const cancelButton = document.createElement('button');
        cancelButton.className = 'commentEditCancel';
        cancelButton.textContent = '취소';
        cancelButton.onclick = () => {
            // textarea를 원래의 p 태그로 다시 변경
            p.innerHTML = originalContent.replace(/\n/g, '<br>'); // 원래 내용으로 복원
            commentInfoWrap.replaceChild(p, editWrap); // 편집 영역을 p로 교체
        };

        editActions.appendChild(cancelButton);
        editActions.appendChild(saveButton);
        editWrap.appendChild(textarea);
        editWrap.appendChild(editActions);

        // p 태그를 편집 영역으로 대체
        commentInfoWrap.replaceChild(editWrap, p);
    };

    const commentItem = document.createElement('div');
    commentItem.className = 'commentItem';

    const picture = document.createElement('picture');

    const img = document.createElement('img');
    img.className = 'commentImg';
    img.src = resolveImageUrl(
        data.author && data.author.profile_image_url,
        DEFAULT_PROFILE_IMAGE,
    );
    picture.appendChild(img);

    const commentInfoWrap = document.createElement('div');
    commentInfoWrap.className = 'commentInfoWrap';

    const infoDiv = document.createElement('div');
    infoDiv.className = 'commentInfoHeader';

    const h3 = document.createElement('h3');
    h3.textContent = data.author ? data.author.nickname : '';
    infoDiv.appendChild(h3);

    const h4 = document.createElement('h4');
    const date = new Date(data.created_at);
    const formattedDate = `${date.getFullYear()}-${padTo2Digits(date.getMonth() + 1)}-${padTo2Digits(date.getDate())} ${padTo2Digits(date.getHours())}:${padTo2Digits(date.getMinutes())}:${padTo2Digits(date.getSeconds())}`;
    h4.textContent = formattedDate;
    infoDiv.appendChild(h4);

    if (data.is_author) {
        const buttonWrap = document.createElement('span');

        const deleteButton = document.createElement('button');
        deleteButton.textContent = '삭제';
        deleteButton.onclick = CommentDelete;
        const modifyButton = document.createElement('button');
        modifyButton.textContent = '수정';
        modifyButton.onclick = CommentModify;

        buttonWrap.appendChild(modifyButton);
        buttonWrap.appendChild(deleteButton);

        infoDiv.appendChild(buttonWrap);
    }

    const p = document.createElement('p');
    p.innerHTML = data.content.replace(/(?:\r\n|\r|\n)/g, '<br>');

    commentInfoWrap.appendChild(infoDiv);
    commentInfoWrap.appendChild(p);

    commentItem.appendChild(picture);
    commentItem.appendChild(commentInfoWrap);

    return commentItem;
};

export default CommentItem;
