import express from "express";
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import fileUpload from 'express-fileupload';
import dotenv from "dotenv";
import stripeRoutes from "./routes/pagos.routes.js";

dotenv.config();

const app = express();

// Configuración CORS completa
const corsOptions = {
  origin: ['https://plataforma.ahjende.com', 'http://localhost:3000'], // Dominios permitidos 
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204
};

// Aplicar CORS con opciones específicas
app.use(cors(corsOptions));

// Resto de middlewares
app.use(helmet());
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(fileUpload());

// Ruta test
app.get('/', (req, res) => {
    res.send('API Stripe - terminal_stripe');
});

// Agregar la ruta webhook-stripe explícitamente
app.post('/webhook-stripe', express.json(), (req, res) => {
    // Tu lógica aquí para procesar el pago con Stripe
    res.status(200).json({ 
        success: true, 
        reference: `AHJ-${Math.random().toString(36).substring(2, 9).toUpperCase()}`
    });
});

// Ruta de Webhook Stripe original
app.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
    // aquí puedes usar req.rawBody si Stripe lo requiere
    res.sendStatus(200);
});

// Todas tus rutas de negocio
app.use('/api', stripeRoutes);

export default app;