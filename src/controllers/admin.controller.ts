import { T } from '../libs/types/common';
import { Request, Response } from 'express';
import MemberService from '../models/Member.service';
import { MemberInput } from '../libs/types/member';
import { MemberType } from '../libs/enums/member.enum';
import Errors, { Message } from '../libs/Errors';

const memberService = new MemberService;

const adminController: T = {};

adminController.goHome = (req: Request, res: Response) => {
    try{
        console.log("goHome");
        res.send("goHome");
    }
    catch(err){
        console.log("Error, goHome: ", err);
        res.redirect('/admin');
    }
};

adminController.getSignup = (req: Request, res: Response) => {
    try{
        console.log("getSignup");
        res.send("getSignup");
    }
    catch(err){
        console.log("Error, getSignup: ", err);
        res.redirect('/admin');
    }
};

adminController.getLogin = (req: Request, res: Response) => {
    try{
        console.log("getLogin");
        res.send("getLogin");
    }
    catch(err){
        console.log("Error, getLogin: ", err);
        res.redirect('/admin');
    }
};

adminController.processSignup = async (req: Request, res: Response) => {
    try{
        console.log("processSignup");

        const newMember: MemberInput = req.body;
        newMember.memberType = MemberType.RESTAURANT;
        const result = await memberService.processSignup(newMember);
        // TODO AUTHENTICATION

        res.json({result: result});
    }
    catch(err){
        console.log("Error, processSignup: ", err);
        const message =
         err instanceof Errors ? err.message : Message.SOMETHING_WENT_WRONG;
        res.send(
            `<script> alert("${message}"); window.location.replace('/admin/signup')</script>`
        );
    }
};

adminController.processLogin = (req: Request, res: Response) => {
    try{
        console.log("processLogin");
        res.send("processLogin");
    }
    catch(err){
        console.log("Error, processLogin: ", err);
        res.redirect('/admin/login');
    }
};

export default adminController;