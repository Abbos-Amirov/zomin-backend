import express from 'express';
import path from 'path';
import routerAdmin from './router-admin';
import morgan from 'morgan';
import { MORGAN_FORMAT } from './libs/config';
import router from './router';

import session from 'express-session';
import ConnectMongoDB from 'connect-mongodb-session';
import { T } from './libs/types/common';



// Entrance
const app = express();
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({extended: true}));
app.use(express.json());
app.use(morgan(MORGAN_FORMAT));

const MongoDBStore = ConnectMongoDB(session);
const store = new MongoDBStore({
    uri: String(process.env.MONGO_URI),
    collection: 'sessions'
});

// Sessions
app.use(require('express-session')({
  secret: String(process.env.SESSION_SECRET),
  cookie: {
    maxAge: 1000 * 60 * 60 * 3
  },
  store: store,
  resave: true,
  saveUninitialized: true
}));

app.use(function(req, res, next){
    const sessionInstace = req.session as T;
    res.locals.member = sessionInstace.member;
    next();
})

// Views
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Routers
app.use('/admin', routerAdmin); 
app.use('/', router);



export default app;