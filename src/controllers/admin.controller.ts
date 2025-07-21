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

export default adminController;