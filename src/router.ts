import { Router } from "express";
const router = Router();
import memberController from './controllers/member.controller';
import tableCallController from "./controllers/tableCall.controller";

/** SPA-USERS */
router.post('/signup', memberController.signup);
router.post('/login', memberController.login);


/** Table */
// TableCall
router
.post(
  '/call/create', 
  tableCallController.createNewTableCall
);

export default router;