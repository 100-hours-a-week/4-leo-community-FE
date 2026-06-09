import { getServerUrl } from '../utils/function.js';
import { requestJson } from '../utils/request.js';

export const changePassword = async (userId, password, passwordConfirm) => {
    const result = requestJson(`${getServerUrl()}/users/${userId}/password`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
            password,
            password_confirm: passwordConfirm,
        }),
    });
    return result;
};
