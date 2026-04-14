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
  PURGE_ORDERS_CRITERIA = "Provide valid memberId and/or customerPhone",
  INVALID_TABLE_ID = "tableId is required or invalid",
  NOT_TABLE = "No table found for this QR code",
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
