import { Router } from "express";
const router = Router();
import memberController from './controllers/member.controller';

/** MEMBER */
router.post("/member/login", memberController.login);
router.post("/member/signup", memberController.signup);
router.post("/member/logout", memberController.logout);
/** Table */


export default router;