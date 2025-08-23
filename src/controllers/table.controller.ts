import TableService from "../models/Table.service";
import { T } from "../libs/types/common";
import { Request, Response } from "express";
import Errors, { HttpCode, Message } from "../libs/Errors";
import { TableInput, TableInquiry } from "../libs/types/table";
import AuthService from "../models/Auth.service";
import { AUTH_TIMER_TABLE } from "../libs/config";

const tableService = new TableService();
const authService = new AuthService();

const tableController: T = {};

tableController.getAllTables = async (req: Request, res: Response) => {
  try {
    console.log("getAllTables");
    const { page, status, search, limit } = req.query;
    const inquiry: TableInquiry = {
      page: Number(page),
      limit: Number(limit),
    };
    if (status) inquiry.status = String(status);
    if (search) inquiry.search = String(search);

    const data = await tableService.getAllTables(inquiry);

    res.status(HttpCode.OK).json(data);
  } catch (err) {
    console.log("Error, getAllTables:", err);
    if (err instanceof Errors) res.status(err.code).json(err);
    else res.status(Errors.standard.code).json(Errors.standard);
  }
};

tableController.createNewTable = async (req: Request, res: Response) => {
  try {
    console.log("createNewTable");

    const input: TableInput = req.body,
      result = await tableService.createNewTable(input),
      token = await authService.createTableToken(result);
    res.cookie("tableToken", token, {
      maxAge: AUTH_TIMER_TABLE * 3600 * 1000,
      httpOnly: false,
    });

    res.status(HttpCode.CREATED).json({ table: result, accessToken: token });
  } catch (err) {
    console.log("Error, createNewTable:", err);
    const message =
      err instanceof Errors ? err.message : Message.SOMETHING_WENT_WRONG;
    if (err instanceof Errors) res.status(err.code).json(err);
    else res.status(Errors.standard.code).json(Errors.standard);
  }
};

tableController.updateChosenTable = async (req: Request, res: Response) => {
  try {
    console.log("updateChosenTable");
    const id = req.params.id;

    const result = await tableService.updateChosenTable(id, req.body);
    res.status(HttpCode.OK).json(result);
  } catch (err) {
    console.log("Error, updateChosenTable:", err);
    if (err instanceof Errors) res.status(err.code).json(err);
    else res.status(Errors.standard.code).json(Errors.standard);
  }
};

export default tableController;
