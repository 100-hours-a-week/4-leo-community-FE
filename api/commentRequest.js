import { getServerUrl } from '../utils/function.js';
import { requestJson } from '../utils/request.js';

export const deleteComment = (postId, commentId) => {
    const result = requestJson(`${getServerUrl()}/comments/${commentId}`, {
        method: 'DELETE',
        credentials: 'include',
    });
    return result;
};

export const updateComment = (postId, commentId, commentContent) => {
    const result = requestJson(`${getServerUrl()}/comments/${commentId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
            content: commentContent,
        }),
    });
    return result;
};
