import express from 'express';
import path from 'path';




// Entrance
const app = express();
app.use(express.static(path.join(__dirname, 'public')));



// Sessions

// Views

// Router

export default app;