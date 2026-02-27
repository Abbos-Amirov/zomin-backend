import cors from "cors";
import express from 'express';
import path from 'path';
import routerAdmin from './router-admin';
import morgan from 'morgan';
import cookieParser from "cookie-parser";
import { MORGAN_FORMAT } from './libs/config';
import router from './router';


// Entrance
const app = express();
app.use(express.static(path.join(__dirname, 'public')));
app.use("/uploads", express.static("./uploads"));
app.use(express.urlencoded({extended: true}));
app.use(express.json());
// CORS: admin frontend va server manziliga ruxsat
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:4009",
  "http://localhost:5173",
  "http://localhost:5174",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
  "http://38.247.134.248",
  "http://38.247.134.248:80",
  "http://38.247.134.248:3000",
  "http://38.247.134.248:4009",
  "https://38.247.134.248",
  "https://38.247.134.248:443",
];
app.use(cors({
  credentials: true,
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true);
    }
  },
}));
app.use(cookieParser());
app.use(morgan(MORGAN_FORMAT));

// Sessions

// Views
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Routers
app.use('/admin', routerAdmin); 
app.use('/', router);

// 404 handler for API routes - prevents frontend paths from hitting backend
app.use((req, res, next) => {
  // Only handle API routes, ignore frontend paths
  if (req.path.startsWith('/member/') || 
      req.path.startsWith('/product/') || 
      req.path.startsWith('/order/') || 
      req.path.startsWith('/table/') ||
      req.path.startsWith('/admin/')) {
    res.status(404).json({ error: 'API endpoint not found' });
  } else {
    // Let Nginx handle frontend routes
    res.status(404).json({ error: 'Not found' });
  }
});

export default app;