import { getServerUrl } from '../utils/function.js';
import { requestJson } from '../utils/request.js';

export const getPosts = (cursor = 0, size = 10) => {
    const result = requestJson(
        `${getServerUrl()}/posts?cursor=${cursor}&size=${size}`,
        {
            credentials: 'include',
        },
    );
    return result;
};

export const searchPosts = (keyword, offset = 0, limit = 5, sort = 'recent') => {
    const query = new URLSearchParams({
        keyword,
        offset,
        limit,
        sort,
    });
    const result = requestJson(
        `${getServerUrl()}/v1/posts/search?${query.toString()}`,
        {
            credentials: 'include',
        },
    );
    return result;
};
