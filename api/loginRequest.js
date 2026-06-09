import { getServerUrl } from '../utils/function.js';
import { requestJson } from '../utils/request.js';

export const userLogin = async (email, password) => {
    const result = await requestJson(`${getServerUrl()}/auth`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
            email: email,
            password: password,
        }),
    });
    return result;
};
