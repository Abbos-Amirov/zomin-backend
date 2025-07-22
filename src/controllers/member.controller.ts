import { LoginInput, MemberInput } from "../libs/types/member";
import { T } from "../libs/types/common";
import { Request, Response } from "express";
import { Member } from "../libs/types/member";
import Errors from "../libs/Errors";
import MemberService from "../models/Member.service";

const memberService = new MemberService();

const memberController: T = {};

memberController.signup = async (req: Request, res: Response)=>{
    try{
        console.log("signup")
        const newMember: MemberInput = req.body,
         result: Member = await memberService.signup(newMember);
         // TODO: TOKENS AUTHENTICATION
        res.json({member: result});
    } catch(err){
        console.log("Error, signup:", err);
        if(err instanceof Errors) res.status(err.code).json(err);
        else res.status(Errors.standard.code).json(Errors.standard);
    }
};

memberController.login = async (req: Request, res: Response)=>{
    try{
        console.log("login")
        const input: LoginInput = req.body,
         result = await memberService.login(input);
         // TODO: TOKENS AUTHENTICATION
        res.json({member: result});
    } catch(err){
        console.log("Error, login:", err);
         if(err instanceof Errors) res.status(err.code).json(err);
        else res.status(Errors.standard.code).json(Errors.standard);
    }
};

export default memberController;