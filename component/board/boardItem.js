import { padTo2Digits, resolveImageUrl } from '../../utils/function.js';

const DEFAULT_PROFILE_IMAGE = '/public/profile_default.svg';

const escapeHtml = value =>
    String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');

const formatDate = date => {
    const dateObj = new Date(date);
    if (Number.isNaN(dateObj.getTime())) return '';

    const year = dateObj.getFullYear();
    const month = dateObj.getMonth() + 1;
    const day = dateObj.getDate();

    return `${year}.${padTo2Digits(month)}.${padTo2Digits(day)}`;
};

const truncate = (value, maxLength = 140) => {
    const text = String(value ?? '').trim();
    if (text.length <= maxLength) return text;
    return `${text.slice(0, maxLength).trim()}…`;
};

const BoardItem = ({
    postId,
    date,
    title,
    content,
    imageUrl,
    viewCount,
    profileImageUrl,
    writer,
    commentCount,
    likeCount,
}) => {
    if (!postId || !date || !title || !writer) return '';

    const formattedDate = formatDate(date);
    const resolvedProfileImageUrl = resolveImageUrl(
        profileImageUrl,
        DEFAULT_PROFILE_IMAGE,
    );
    const resolvedPostImageUrl = resolveImageUrl(imageUrl, null);
    const safeTitle = escapeHtml(title);
    const safeWriter = escapeHtml(writer);
    const safeContent = escapeHtml(truncate(content));

    const meta = `
                <div class="photoCardMeta">
                    <img src="${resolvedProfileImageUrl}" alt="${safeWriter} 프로필" loading="lazy" />
                    <span class="writer">${safeWriter}</span>
                    <span class="date">${formattedDate}</span>
                </div>`;

    const info = `
                <div class="info">
                    <span>좋아요 ${likeCount ?? 0}</span>
                    <span>댓글 ${commentCount ?? 0}</span>
                    <span>조회 ${viewCount ?? 0}</span>
                </div>`;

    const card = resolvedPostImageUrl
        ? `<article class="boardItem hasPhoto">
            <figure class="photoCardMedia"><img src="${resolvedPostImageUrl}" alt="${safeTitle}" loading="lazy" /></figure>
            <div class="photoCardOverlay">
                <h2 class="title">${safeTitle}</h2>
                ${meta}
                ${info}
            </div>
        </article>`
        : `<article class="boardItem isTextOnly">
            <div class="photoCardBody">
                <h2 class="title">${safeTitle}</h2>
                ${safeContent ? `<p class="excerpt">${safeContent}</p>` : ''}
                ${meta}
                ${info}
            </div>
        </article>`;

    return `
    <a href="/html/board.html?id=${postId}" aria-label="${safeTitle} 게시글 보기">
        ${card}
    </a>
`;
};

export default BoardItem;
