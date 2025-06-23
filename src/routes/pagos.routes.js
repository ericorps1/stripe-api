// routes/stripe.routes.js
import { Router } from "express";
import { 
    crearPaymentIntent, 
    obtenerPaymentIntent,
    webhookStripe 
} from "../controllers/pagos.controller.js";

const router = Router();

// Rutas para Stripe
router.post('/crear-payment-intent', crearPaymentIntent);
router.post('/obtener-payment-intent', obtenerPaymentIntent); // ✅ NUEVA RUTA
router.post('/webhook-stripe2', webhookStripe);

export default router;