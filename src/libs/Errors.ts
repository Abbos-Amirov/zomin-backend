export enum HttpCode {
  OK = 200,
  CREATED = 201,
  NOT_MODIFIED = 304,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  INTERNAL_SERVER_ERROR = 500,
}

export enum Message {
  SOMETHING_WENT_WRONG = "Something went wrong!",
  NO_DATA_FOUND = "No data is found!",
  CREATE_FAILED = "Create is failed!",
  UPDATE_FAILED = "Update is failed!",

  INVALID_ITEM_QUANTITY =
    "quantity must be a non-negative integer (0 removes the line)",
  ORDER_ITEM_NOT_FOUND = "Order line not found for this order",
  ORDER_NOT_EDITABLE =
    "This order cannot be changed (only PAUSE or PENDING orders can be edited)",
  ORDER_UPDATE_PAYLOAD = "Provide orderStatus and/or itemUpdates with orderId",
  ORDER_ITEM_ID_INVALID = "Each itemUpdates.orderItemId must be a valid ObjectId",
  ORDER_PATH_IDS_INVALID = "orderId and orderItemId in URL must be valid ObjectIds",

  USED_NICK_PHONE = "You are inserting already used nick ore phone",
  ADMIN_EXIST="Admin account already exists. Please sign up as a User!",
  TOKEN_CREATION_FAILED = "Token creation error!",
  NO_MEMBER_NICK = "No member with that member nick",
  BLOCKED_USER = "You have been blocked, contact restaurant!",
  WRONG_PASSWORD = "Wrong password entered, please try again",
  NOT_AUTHENTICATED = "You are not authenticated, Please login first!",
  MEMBER_ID_MISMATCH = "memberId does not match authenticated user",
  INVALID_MEMBER_ID =
    "memberId must be the member's MongoDB _id (24 hex characters), not a short number",
  CUSTOMER_PHONE_REQUIRED = "customerPhone is required (query or JSON body)",
  MEMBER_NO_PHONE_ON_PROFILE =
    "This member has no phone on file; cannot verify customerPhone",
  MEMBER_PHONE_MISMATCH =
    "customerPhone does not match this member's registered phone",
  PURGE_ORDERS_CRITERIA = "Provide valid memberId and/or customerPhone",
  ORDER_PURGE_ORDER_ID_INVALID = "orderId must be a valid ObjectId (24 hex)",
  ORDER_PURGE_ORDER_NOT_FOUND = "No order found for this orderId",
  ORDER_PURGE_ORDER_MISMATCH =
    "orderId does not belong to this memberId / customerPhone",
  CANCEL_BY_MEMBER_ORDER_ID_REQUIRED =
    "orderId is required (JSON body or query) for cancel-by-member",
  DELIVERY_TABLE_PAY_PAYLOAD =
    "Provide tableId, orderId, and orderType DELIVERY (JSON body or query)",
  DELIVERY_TABLE_PAY_ORDER_TYPE = "orderType must be DELIVERY",
  DELIVERY_TABLE_PAY_TABLE_MISMATCH =
    "orderId does not belong to this tableId for a DELIVERY order",
  DELIVERY_TABLE_PAY_NOT_UNPAID =
    "Only UNPAID orders can be marked PAID via this endpoint",
  INVALID_TABLE_ID = "tableId is required or invalid",
  NOT_TABLE = "No table found for this QR code",
  TABLE_OCCUPIED_BY_ANOTHER =
    "This table is taken by another guest. Please choose another table.",
  DUPLICATE_PRODUCT = "Bunday mahsulot (nom + o'lcham + hajm) allaqachon mavjud",
  TWILIO_NOT_CONFIGURED = "Twilio SMS is not configured (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM_NUMBER or TWILIO_PHONE_NUMBER)",
  SMS_NO_PHONE = "No phone number for this order",
  SMS_SEND_FAILED = "Failed to send SMS",
  SMS_INVALID_TO = "Invalid recipient phone number for SMS",
  SMS_UNVERIFIED_TRIAL = "Twilio trial: verify this number in Twilio Console or upgrade account",
  SMS_FROM_INVALID = "Twilio rejected the sender (FROM) number",
  SMS_GEO_PERMISSION = "Twilio: this region / number combination is not allowed for your account",
  SMS_AUTH_FAILED = "Twilio authentication failed (check ACCOUNT_SID and AUTH_TOKEN)",
}

class Errors extends Error {
  public code: HttpCode;
  public message: Message;
  /** Twilio / tashqi API xabari (faqat debug; productionda ham foydali) */
  public detail?: string;

  static standard = {
    code: HttpCode.INTERNAL_SERVER_ERROR,
    message: Message.SOMETHING_WENT_WRONG,
  };

  constructor(statusCode: HttpCode, statusMessage: Message, detail?: string) {
    super();
    this.code = statusCode;
    this.message = statusMessage;
    if (detail) this.detail = detail;
  }

  toJSON(): { code: HttpCode; message: Message; detail?: string } {
    return this.detail
      ? { code: this.code, message: this.message, detail: this.detail }
      : { code: this.code, message: this.message };
  }
}

export default Errors;
