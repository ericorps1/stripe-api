// controllers/stripe.controller.js
import Stripe from 'stripe';
import dotenv from 'dotenv';

dotenv.config();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Crear un Payment Intent
export const crearPaymentIntent = async (req, res) => {
    try {
        const { monto, descripcion, metadata } = req.body;
        
        if (!monto) {
            return res.status(400).json({
                success: false,
                message: 'El monto es requerido'
            });
        }
        
        // Creamos el payment intent con Stripe
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(monto * 100), // Stripe usa centavos
            currency: 'mxn',
            description: descripcion || 'Pago SICAM',
            metadata: metadata || {},
            automatic_payment_methods: {
                enabled: true,
            },
        });
        
        res.json({
            success: true,
            clientSecret: paymentIntent.client_secret,
            id: paymentIntent.id
        });
        
    } catch (error) {
        console.error('Error al crear payment intent:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Webhook de Stripe
export const webhookStripe = async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;
    
    try {
        // Verificar firma del webhook
        event = stripe.webhooks.constructEvent(
            req.rawBody,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET
        );
        
        // Manejar eventos
        switch (event.type) {
            case 'payment_intent.succeeded':
                const paymentIntent = event.data.object;
                console.log('PaymentIntent exitoso:', paymentIntent.id);
                // Aquí puedes enviar los datos a tu sistema SICAM
                break;
                
            case 'payment_intent.payment_failed':
                const failedPayment = event.data.object;
                console.log('Pago fallido:', failedPayment.id);
                break;
                
            default:
                console.log(`Evento no manejado: ${event.type}`);
        }
        
        res.status(200).json({ received: true });
        
    } catch (error) {
        console.error('Error en webhook:', error);
        res.status(400).send(`Webhook Error: ${error.message}`);
    }
};