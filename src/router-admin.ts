import { Router } from "express";
import adminController from "./controllers/admin.controller";
const routerAdmin = Router();



// Admin
routerAdmin.get('/', adminController.goHome);
routerAdmin
.get('/signup', adminController.getSignup)
.post('/signup', adminController.processSignup);
routerAdmin
.get('/login', adminController.getLogin)
.post('/login', adminController.processLogin);


// Products


// User


// Table


// Call


// Dashboard

export default routerAdmin;