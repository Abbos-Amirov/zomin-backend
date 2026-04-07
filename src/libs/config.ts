import type { CookieOptions } from "express";
import mongoose from "mongoose";

export const MORGAN_FORMAT = `:method :url :response-time [:status] \n`;
export const AUTH_TIMER_MEMBER = 6;
export const AUTH_TIMER_TABLE = 0.5;

/**
 * Member `accessToken` cookie: localhost uchun `COOKIE_DOMAIN` va `COOKIE_SECURE` ni bo'sh qoldiring.
 * Production (cross-site): COOKIE_DOMAIN=.navruz.food va COOKIE_SECURE=true
 */
export function getMemberAuthCookieOptions(maxAge: number): CookieOptions {
  const domain = process.env.COOKIE_DOMAIN?.trim();
  const secure = process.env.COOKIE_SECURE === "true";
  const opts: CookieOptions = {
    maxAge,
    httpOnly: true,
    path: "/",
    secure,
    sameSite: secure ? "none" : "lax",
  };
  if (domain) opts.domain = domain;
  return opts;
}

export const shapeIntoMongooseObjectId = (target: any) => {
  return typeof target === "string"
    ? new mongoose.Types.ObjectId(target)
    : target;
};
