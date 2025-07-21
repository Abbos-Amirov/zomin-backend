import express from 'express';
import path from 'path';
import routerAdmin from './router-admin';

// Entrance
const app = express();
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({extended: true}));
app.use(express.json());




// Sessions

// Views
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Routers
app.use('/admin', routerAdmin); 



export default app;