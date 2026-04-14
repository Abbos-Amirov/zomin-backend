import twilio from "twilio";
import Errors, { HttpCode, Message } from "./Errors";

/** `.env` dan o‘qiydi: trim, atrofdagi `"`/`'` ni olib tashlaydi */
function envClean(key: string): string {
  const raw = process.env[key];
  if (raw == null) return "";
  return raw
    .trim()
    .replace(/^["']|["']$/g, "")
    .trim();
}

/**
 * Twilio E.164: Koreya (+82), mobil odatda `010-xxxx-xxxx`.
 * Ichki `010…` → `+8210…` (birinchi `0` tashlanadi — xalqaro format).
 */
export function normalizePhoneForSms(raw: string): string {
  let p = raw.replace(/[\s-]/g, "");
  if (p.startsWith("+")) {
    if (p.startsWith("+82")) return p;
    return p;
  }
  if (p.startsWith("00")) return "+" + p.slice(2);
  if (p.startsWith("998")) return "+" + p;
  /** `821012345678` */
  if (p.startsWith("82") && /^\d{11,13}$/.test(p)) {
    return "+" + p;
  }
  /** `01012345678` → `+821012345678` */
  if (/^010\d{8}$/.test(p)) {
    return "+82" + p.slice(1);
  }
  /** `1012345678` (0 yo‘q, 10 ta) */
  if (/^10\d{8}$/.test(p)) {
    return "+82" + p;
  }
  /** boshqa `01x` mobil (011, 016, …) */
  if (/^01[016789]\d{7,8}$/.test(p)) {
    return "+82" + p.slice(1);
  }
  if (/^\d{10,12}$/.test(p)) return "+82" + p;
  /** faqat raqamlar — `82` / bosh `0` ni normalize qilish */
  if (/^\d+$/.test(p)) {
    let n = p.startsWith("82") ? p.slice(2) : p;
    if (n.startsWith("0")) n = n.slice(1);
    return "+82" + n;
  }
  return p;
}

/** `from` raqami yoki Twilio Messaging Service SID (`MG…`) */
function twilioSender(): {
  from?: string;
  messagingServiceSid?: string;
} {
  const a = envClean("TWILIO_FROM_NUMBER");
  const b = envClean("TWILIO_PHONE_NUMBER");
  const raw = a || b;
  if (!raw) return {};
  if (raw.startsWith("MG")) return { messagingServiceSid: raw };
  return { from: normalizePhoneForSms(raw) };
}

function twilioErrMeta(err: unknown): {
  code?: number;
  msg?: string;
  moreInfo?: string;
} {
  if (!err || typeof err !== "object") return {};
  const o = err as Record<string, unknown>;
  const codeRaw = o.code;
  const code =
    typeof codeRaw === "number"
      ? codeRaw
      : typeof codeRaw === "string" && /^\d+$/.test(codeRaw)
        ? Number(codeRaw)
        : undefined;
  const msg = typeof o.message === "string" ? o.message : undefined;
  const moreInfo =
    typeof o.moreInfo === "string"
      ? o.moreInfo
      : typeof o.more_info === "string"
        ? o.more_info
        : undefined;
  if (code !== undefined || msg || moreInfo) return { code, msg, moreInfo };
  const cause = o.cause;
  if (cause && typeof cause === "object") return twilioErrMeta(cause);
  return {};
}

function formatTwilioDetail(meta: ReturnType<typeof twilioErrMeta>): string {
  const parts: string[] = [];
  if (meta.code !== undefined) parts.push(`Twilio code ${meta.code}`);
  if (meta.msg) parts.push(meta.msg);
  if (meta.moreInfo) parts.push(meta.moreInfo);
  return parts.join(" | ") || "Unknown Twilio error";
}

export async function sendTwilioSms(to: string, body: string): Promise<void> {
  const sid = envClean("TWILIO_ACCOUNT_SID");
  const token = envClean("TWILIO_AUTH_TOKEN");
  const sender = twilioSender();
  if (!sid || !token || (!sender.from && !sender.messagingServiceSid)) {
    throw new Errors(HttpCode.INTERNAL_SERVER_ERROR, Message.TWILIO_NOT_CONFIGURED);
  }
  const client = twilio(sid, token);
  const normalizedTo = normalizePhoneForSms(to);
  try {
    await client.messages.create({
      body,
      to: normalizedTo,
      ...sender,
    });
  } catch (err) {
    const meta = twilioErrMeta(err);
    const detail = formatTwilioDetail(meta);
    console.error("Twilio sendTwilioSms failed:", {
      ...meta,
      to: normalizedTo,
      err,
    });

    if (meta.code === 20003 || meta.code === 20001) {
      throw new Errors(HttpCode.UNAUTHORIZED, Message.SMS_AUTH_FAILED, detail);
    }

    if (
      meta.code === 21408 ||
      meta.code === 21610 ||
      meta.code === 63007 ||
      meta.code === 63038
    ) {
      throw new Errors(HttpCode.FORBIDDEN, Message.SMS_GEO_PERMISSION, detail);
    }

    if (meta.code === 21211 || meta.code === 21614) {
      throw new Errors(HttpCode.BAD_REQUEST, Message.SMS_INVALID_TO, detail);
    }
    if (meta.code === 21608) {
      throw new Errors(HttpCode.FORBIDDEN, Message.SMS_UNVERIFIED_TRIAL, detail);
    }
    if (meta.code === 21606 || meta.code === 21212) {
      throw new Errors(HttpCode.BAD_REQUEST, Message.SMS_FROM_INVALID, detail);
    }

    throw new Errors(HttpCode.INTERNAL_SERVER_ERROR, Message.SMS_SEND_FAILED, detail);
  }
}
