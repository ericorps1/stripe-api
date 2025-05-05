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
        
        // Configurar opciones MSI según el monto
        let installmentsConfig = { enabled: false };
        
        // Para montos menores a $13,000, no ofrecer MSI
        if (monto < 1300000) {
            installmentsConfig = { enabled: false };
        }
        // Para montos entre $13,000 y $15,999
        else if (monto >= 1300000 && monto < 1600000) {
            installmentsConfig = {
                enabled: true,
                // Limitar a planes de 3 y 6 meses
                plan: {
                    types: {
                        three_months: {
                            enabled: true
                        },
                        six_months: {
                            enabled: true
                        }
                    }
                }
            };
        }
        // Para montos de $16,000 o más
        else {
            installmentsConfig = {
                enabled: true,
                // Habilitar planes de 3, 6, 9 y 12 meses
                plan: {
                    types: {
                        three_months: {
                            enabled: true
                        },
                        six_months: {
                            enabled: true
                        },
                        nine_months: {
                            enabled: true
                        },
                        twelve_months: {
                            enabled: true
                        }
                    }
                }
            };
        }
        
        // Creamos el payment intent con Stripe
        const paymentIntent = await stripe.paymentIntents.create({
            amount: monto, // Ya está en centavos, no multiplicar nuevamente
            currency: 'mxn',
            description: descripcion || 'Pago AHJ ENDE',
            metadata: metadata || {},
            payment_method_types: ['card'],
            // Configuración de MSI basada en el monto
            payment_method_options: {
                card: {
                    installments: installmentsConfig
                }
            }
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
                        
                        // Información sobre el pago a meses (si aplica)
                        if (paymentIntent.payment_method_options?.card?.installments?.plan) {
                            const installmentPlan = paymentIntent.payment_method_options.card.installments.plan;
                            console.log('Plan de meses seleccionado:', installmentPlan.type);
                            console.log('Número de pagos:', installmentPlan.count);
                        }
                        
                        // Aquí puedes enviar los datos a tu sistema
                        break;
                        
                    case 'payment_intent.payment_failed':
                        const failedPayment = event.data.object;
                        console.log('Pago fallido:', failedPayment.id);
                        break;
                        
                    case 'charge.succeeded':
                        const charge = event.data.object;
                        console.log('Cargo exitoso:', charge.id);
                        // Los detalles del cargo también pueden incluir información sobre MSI
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
            const { paymentIntentId, status, email, name, installmentPlan } = req.body;
            
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
                
                // Información de MSI (si aplica)
                if (installmentPlan) {
                    console.log(`Plan MSI seleccionado: ${installmentPlan}`);
                }
                
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