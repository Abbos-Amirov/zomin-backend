import { Router } from "express";
import adminController from "./controllers/admin.controller";
const routerAdmin = Router();



// Admin
routerAdmin.get('/', adminController.goHome);


// Products


// User


// Table


// Call


// Dashboard

export default routerAdmin;