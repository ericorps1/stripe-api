import express from "express";
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import fileUpload from 'express-fileupload';
import dotenv from "dotenv";
import stripeRoutes from "./routes/pagos.routes.js";

dotenv.config();

const app = express();

// ✅ Middlewares globales normales
app.use(cors());
app.use(helmet());
app.use(compression());
app.use(express.json()); // ahora sí compatible con curl, Postman, etc.
app.use(express.urlencoded({ extended: false }));
app.use(fileUpload());

// ✅ Ruta test
app.get('/', (req, res) => {
    res.send('API Stripe - terminal_stripe');
});

// ✅ Ruta de Webhook Stripe — si la usas
app.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
    // aquí puedes usar req.rawBody si Stripe lo requiere
    res.sendStatus(200);
});

// ✅ Todas tus rutas de negocio
app.use('/api', stripeRoutes);

export default app;
