export const parseJsonSafe = async response => {
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
        return null;
    }
    try {
        return await response.json();
    } catch (error) {
        return null;
    }
};

export const requestJson = async (url, options = {}) => {
    const response = await fetch(url, options);
    const body = await parseJsonSafe(response);
    return {
        response,
        ok: response.ok,
        status: response.status,
        code: body && (body.code || body.message) ? (body.code || body.message) : null,
        message: body && body.message ? body.message : null,
        data: body && Object.prototype.hasOwnProperty.call(body, 'data')
            ? body.data
            : null,
        body,
    };
};
