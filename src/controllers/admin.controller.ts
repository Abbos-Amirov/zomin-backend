import { T } from '../libs/types/common';
import { Request, Response } from 'express';
import MemberService from '../models/Member.service';
import { LoginInput, MemberInput } from '../libs/types/member';
import { MemberType } from '../libs/enums/member.enum';
import Errors, { HttpCode, Message } from '../libs/Errors';

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

adminController.processLogin = async (req: Request, res: Response) => {
    try{
        console.log("processLogin");
        const input: LoginInput = req.body;
        const result = await memberService.processLogin(input);
        console.log("result>", result);
        // TODO AUTHENTICATION
        
        res.json({result: result});
    }
    catch(err){
        console.log("Error, processLogin: ", err);
        const message = 
        err instanceof Errors ? err.message : Message.SOMETHING_WENT_WRONG;
        res.send(
            `<script> alert("${message}"); window.location.replace('/admin/login')</script>`
        );
    }
};

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
        console.log(req.body)
        const result = await memberService.updateChosenUser(req.body)

        res.status(HttpCode.OK).json({data: result});
    }catch(err){
        console.log("Error, updateChosenUser:", err);
        if(err instanceof Errors) res.status(err.code).json(err);
        else res.status(Errors.standard.code).json(Errors.standard);
    }
}

export default adminController;