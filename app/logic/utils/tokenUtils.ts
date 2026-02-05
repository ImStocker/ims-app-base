function atob(inp: string): string {
  if (import.meta.server) {
    return Buffer.from(inp, 'base64').toString('binary');
  } else {
    return window.atob(inp);
  }
}

export type BaseTokenInfo = {
  sub: string;
  iat: number;
  exp: number;
};

export function decodeTokenInfo<T extends BaseTokenInfo>(token: string): T {
  const tokenParts = token.toString().split('.');

  if (!tokenParts[1]) {
    throw new Error('Bad token');
  }
  const tokenInfoBase64 = tokenParts[1].replace(/-/g, '+').replace(/_/g, '/');
  const tokenInfoJson = decodeURIComponent(
    atob(tokenInfoBase64)
      .split('')
      .map((c) => {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      })
      .join(''),
  );

  const res = JSON.parse(tokenInfoJson) as T;
  if (typeof res.iat !== 'number' || typeof res.exp !== 'number') {
    throw new Error('Bad token');
  }

  return res;
}
