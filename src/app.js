// app.js
import express from "express";
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import fileUpload from 'express-fileupload';
import dotenv from "dotenv";
import stripeRoutes from "./routes/pagos.routes.js";

dotenv.config();

const app = express();

// Middlewares
app.use(cors());
app.use(helmet());
app.use(compression());
app.use(express.json({ 
  // Esto es necesario para webhooks de Stripe
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false }));
app.use(fileUpload());

app.get('/', (req, res) => {
    res.send('API Stripe - terminal_stripe');
});

// Routes
app.use('/api', stripeRoutes);

export default app;