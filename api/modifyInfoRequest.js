import { getServerUrl } from '../utils/function.js';
import { requestJson } from '../utils/request.js';

export const userModify = async (userId, changeData) => {
    const result = await requestJson(`${getServerUrl()}/users/${userId}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(changeData),
    });
    return result;
};

export const userDelete = async userId => {
    const result = await requestJson(`${getServerUrl()}/users/${userId}`, {
        method: 'DELETE',
        credentials: 'include',
    });
    return result;
};
