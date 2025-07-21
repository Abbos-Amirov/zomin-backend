import { T } from '../libs/types/common';
import { Request, Response } from 'express';



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

adminController.processSignup = (req: Request, res: Response) => {
    try{
        console.log("processSignup");
        res.send("processSignup");
    }
    catch(err){
        console.log("Error, processSignup: ", err);
        res.redirect('/admin/signup');
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