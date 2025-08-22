import { Router } from "express";
const router = Router();
import memberController from './controllers/member.controller';

/** SPA-USERS */
router.post('/signup', memberController.signup);
router.post('/login', memberController.login);

/** Table */


export default router;