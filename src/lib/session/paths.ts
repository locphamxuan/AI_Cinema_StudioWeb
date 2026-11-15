/** The login page: the proxy, pages, actions and forms all send a studio without a session here. */
export const LOGIN_PATH = '/login';

/** The login page after the API refused the session; `expired` also stops the proxy sending the studio back to `/`. */
export const EXPIRED_LOGIN_PATH = `${LOGIN_PATH}?expired=1`;
