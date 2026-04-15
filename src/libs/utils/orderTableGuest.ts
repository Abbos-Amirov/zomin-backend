import { shapeIntoMongooseObjectId } from "../config";
import { Member } from "../types/member";

export function phoneDigits(s: string | undefined | null): string {
  return (typeof s === "string" ? s : "").replace(/\D/g, "");
}

/**
 * Stolni "band qilgan" buyurtma shu mijozga tegishlimi: `memberId` yoki telefon raqamlar.
 * Link buyurtmada `memberId` bo‘lmasligi mumkin — faqat `customerPhone`.
 */
export function isSameGuestAsOrder(
  order: { memberId?: unknown; customerPhone?: string | null | undefined },
  opts: { viewer?: Member | null; requestPhone?: string | null }
): boolean {
  const { viewer, requestPhone } = opts;
  if (viewer?._id && order.memberId) {
    try {
      const v = String(shapeIntoMongooseObjectId(viewer._id));
      const o = String(shapeIntoMongooseObjectId(order.memberId));
      if (v === o) return true;
    } catch {
      /* ignore */
    }
  }
  const op = phoneDigits(order.customerPhone);
  const rp = phoneDigits(requestPhone ?? viewer?.memberPhone);
  return op.length >= 5 && rp.length >= 5 && op === rp;
}
