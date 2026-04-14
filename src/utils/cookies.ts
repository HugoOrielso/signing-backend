import { Response, CookieOptions } from "express";
import jwt from "jsonwebtoken";

const isProd = process.env.NODE_ENV === "production";

export const ACCESS_COOKIE_NAME = isProd
  ? "__Secure-admin_accessToken"
  : "admin_accessToken";

export const REFRESH_COOKIE_NAME = isProd
  ? "__Secure-admin_refreshToken"
  : "admin_refreshToken";

const getBaseCookieOptions = (): CookieOptions => ({
  httpOnly: true,
  secure: isProd,
  sameSite: "lax",
  path: "/",
});

export const getAccessCookieName = () => ACCESS_COOKIE_NAME;
export const getRefreshCookieName = () => REFRESH_COOKIE_NAME;

export const getAccessCookieOptions = (): CookieOptions => ({
  ...getBaseCookieOptions(),
  maxAge: 15 * 60 * 1000, // 15 minutos
});

export const getRefreshCookieOptions = (): CookieOptions => ({
  ...getBaseCookieOptions(),
  maxAge: 8 * 60 * 60 * 1000, // 8 horas
});

export const clearAccessCookieOptions = (): CookieOptions => ({
  ...getBaseCookieOptions(),
  maxAge: 0,
});

export const clearRefreshCookieOptions = (): CookieOptions => ({
  ...getBaseCookieOptions(),
  maxAge: 0,
});

export const setAuthCookies = (
  res: Response,
  accessToken: string,
  refreshToken: string
) => {
  res.cookie(getAccessCookieName(), accessToken, getAccessCookieOptions());
  res.cookie(getRefreshCookieName(), refreshToken, getRefreshCookieOptions());
};

export const clearAuthCookies = (res: Response) => {
  res.clearCookie(getAccessCookieName(), clearAccessCookieOptions());
  res.clearCookie(getRefreshCookieName(), clearRefreshCookieOptions());
};

export interface AccessTokenPayload {
  id: string;
  email: string;
  role: string;
}

export const verifyAccessToken = (token: string): AccessTokenPayload => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_ACCESS_SECRET no está definido");
  }

  const decoded = jwt.verify(token, secret);

  if (typeof decoded === "string") {
    throw new Error("Token inválido");
  }

  return decoded as AccessTokenPayload;
};