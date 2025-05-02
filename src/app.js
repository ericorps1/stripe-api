import express from "express";
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import fileUpload from 'express-fileupload';
import dotenv from "dotenv";
import stripeRoutes from "./routes/pagos.routes.js";
// Importar el nuevo middleware
import { rawBodyMiddleware } from "./middlewares/stripe.middleware.js";

dotenv.config();

const app = express();

// Configuración CORS completa
const corsOptions = {
  origin: ['https://plataforma.ahjende.com', 'http://localhost:3000'], 
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'stripe-signature'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));
app.use(helmet());
app.use(compression());

// Agregar middleware para preservar el body raw ANTES de express.json()
app.use(rawBodyMiddleware);

// Aplicar parsers después del middleware personalizado
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(fileUpload());

// Ruta test
app.get('/', (req, res) => {
    res.send('API Stripe - terminal_stripe');
});

// Todas tus rutas de negocio (incluye webhook-stripe)
app.use('/api', stripeRoutes);

// Ruta especial para webhooks de Stripe
// Esta ruta debe estar fuera del router y manejar el body sin procesar
app.post('/webhook', (req, res) => {
    // Redireccionar al controlador de webhook
    stripeRoutes.stack
        .filter(layer => layer.route && layer.route.path === '/webhook-stripe')
        .forEach(layer => layer.route.stack[0].handle(req, res));
});

export default app;