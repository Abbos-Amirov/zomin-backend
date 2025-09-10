import { T } from "../libs/types/common";
import { NextFunction, Request, Response } from "express";
import MemberService from "../models/Member.service";
import { ExtendedRequest, UserInquiry } from "../libs/types/member";
import { MemberType } from "../libs/enums/member.enum";
import Errors, { HttpCode, Message } from "../libs/Errors";
import AuthService from "../models/Auth.service";

const memberService = new MemberService();
const authService = new AuthService();

const adminController: T = {};

adminController.getUsers = async (req: Request, res: Response) => {
  try {
    console.log("getUsers");
    const { page, status, search, limit } = req.query;
    const inquiry: UserInquiry = {
      page: Number(page),
      limit: Number(limit),
    };
    if (status) inquiry.status = String(status);
    if (search) inquiry.search = String(search);

    const result = await memberService.getUsers(inquiry);
    res.status(HttpCode.OK).json(result);
  } catch (err) {
    console.log("Error, getUsers:", err);
    if (err instanceof Errors) res.status(err.code).json(err);
    else res.status(Errors.standard.code).json(Errors.standard);
  }
};

adminController.updateChosenUser = async (req: Request, res: Response) => {
  try {
    console.log("updateChosenUser");
    const result = await memberService.updateChosenUser(req.body);

    res.status(HttpCode.OK).json(result);
  } catch (err) {
    console.log("Error, updateChosenUser:", err);
    if (err instanceof Errors) res.status(err.code).json(err);
    else res.status(Errors.standard.code).json(Errors.standard);
  }
};

adminController.verifyAdmin = async (
  req: ExtendedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.cookies["accessToken"];
    if (token) req.member = await authService.checkAuth(token);

    if (req.member?.memberType !== MemberType.RESTAURANT)
      throw new Errors(HttpCode.UNAUTHORIZED, Message.NOT_AUTHENTICATED);

    next();
  } catch (err) {
    console.log("Error, verifyAuth:", err);
    if (err instanceof Errors) res.status(err.code).json(err);
    else res.status(Errors.standard.code).json(Errors.standard);
  }
};

export default adminController;
