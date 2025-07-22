import { Router } from "express";
const router = Router();
import memberController from './controllers/member.controller';

router.post('/signup', memberController.signup);
router.post('/login', memberController.login);

export default router;