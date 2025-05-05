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
            amount: monto, // Ya está en centavos, no multiplicar nuevamente
            currency: 'mxn',
            description: descripcion || 'Pago AHJ ENDE',
            metadata: metadata || {},
            // Cambiado de automatic_payment_methods a payment_method_types
            payment_method_types: ['card'],
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
    try {
        // Verificar si es un webhook de Stripe (tiene la cabecera stripe-signature)
        const sig = req.headers['stripe-signature'];
        
        // Si es un webhook genuino de Stripe
        if (sig && req.rawBody) {
            try {
                const event = stripe.webhooks.constructEvent(
                    req.rawBody,
                    sig,
                    process.env.STRIPE_WEBHOOK_SECRET
                );
                
                // Manejar eventos
                switch (event.type) {
                    case 'payment_intent.succeeded':
                        const paymentIntent = event.data.object;
                        console.log('PaymentIntent exitoso:', paymentIntent.id);
                        // Aquí puedes enviar los datos a tu sistema
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
                console.error('Error al verificar webhook:', error);
                return res.status(400).send(`Webhook Error: ${error.message}`);
            }
        } 
        // Si es una notificación manual desde nuestro frontend
        else {
            const { paymentIntentId, status, email, name } = req.body;
            
            // Validar los datos recibidos
            if (!paymentIntentId || !status) {
                return res.status(400).json({
                    success: false,
                    message: 'Faltan datos requeridos'
                });
            }
            
            if (status === 'succeeded') {
                // Aquí podrías guardar los datos en tu base de datos
                console.log(`Pago exitoso manual. ID: ${paymentIntentId}, Email: ${email}, Nombre: ${name}`);
                
                // Generar referencia única
                const reference = `AHJ-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
                
                return res.status(200).json({
                    success: true,
                    reference: reference
                });
            } else {
                return res.status(400).json({
                    success: false,
                    message: 'Estado de pago no válido'
                });
            }
        }
    } catch (error) {
        console.error('Error general en webhook:', error);
        return res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
};