import { T } from '../libs/types/common';
import { NextFunction, Request, Response } from 'express';
import MemberService from '../models/Member.service';
import { AdminRequest, LoginInput, MemberInput } from '../libs/types/member';
import { MemberType } from '../libs/enums/member.enum';
import Errors, { HttpCode, Message } from '../libs/Errors';

const memberService = new MemberService;

const adminController: T = {};

adminController.getUsers = async (req: Request, res: Response) => {
    try{
        console.log("getUsers");
        const result = await memberService.getUsers();

        res.json({data: result});
    }catch(err){
        console.log("Error, getUsers:", err);
        res.redirect('/admin/login');
    }
};

adminController.updateChosenUser = async (req: Request, res: Response) => {
    try{
        console.log("updateChosenUser");
        const result = await memberService.updateChosenUser(req.body)

        res.status(HttpCode.OK).json({data: result});
    }catch(err){
        console.log("Error, updateChosenUser:", err);
        if(err instanceof Errors) res.status(err.code).json(err);
        else res.status(Errors.standard.code).json(Errors.standard);
    }
}

export default adminController;