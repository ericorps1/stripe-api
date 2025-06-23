// routes/stripe.routes.js
import { Router } from "express";
import { 
    crearPaymentIntent, 
    webhookStripe 
} from "../controllers/pagos.controller.js";

const router = Router();

// Rutas para Stripe
router.post('/crear-payment-intent', crearPaymentIntent);
router.post('/webhook-stripe2', webhookStripe); // ✅ AGREGAR ESTA LÍNEA

export default router;