// controllers/stripe.controller.js
import Stripe from 'stripe';
import dotenv from 'dotenv';

dotenv.config();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Crear un Payment Intent
export const crearPaymentIntent = async (req, res) => {
    try {
        const { monto, descripcion, metadata, cuenta_stripe } = req.body;
        
        if (!monto) {
            return res.status(400).json({
                success: false,
                message: 'El monto es requerido'
            });
        }
        
        // Verificar si tenemos una cuenta de destino para Stripe Connect
        const cuentaDestino = cuenta_stripe || '';
        let esCuentaConectada = false;
        
        // Verificar si es una cuenta conectada (las cuentas conectadas comienzan con 'acct_')
        if (cuentaDestino && cuentaDestino.startsWith('acct_')) {
            esCuentaConectada = true;
        }
        
        // Opciones base para el payment intent
        const paymentIntentOptions = {
            amount: monto,
            currency: 'mxn',
            description: descripcion || 'Pago AHJ ENDE',
            metadata: {
                ...metadata || {},
                montoOriginal: monto / 100
            },
            payment_method_types: ['card']
        };
        
        // Configurar MSI según monto
        if (monto >= 1600000) {
            paymentIntentOptions.payment_method_options = {
                card: {
                    installments: {
                        enabled: true
                    }
                }
            };
        } else if (monto >= 1300000) {
            paymentIntentOptions.payment_method_options = {
                card: {
                    installments: {
                        enabled: true
                    }
                }
            };
        }
        
        // ✅ DIRECT CHARGES: Lo que dice Sam para Standard connected accounts
        let paymentIntent;
        if (esCuentaConectada) {
            // Crear PaymentIntent DIRECTAMENTE en la cuenta conectada
            paymentIntent = await stripe.paymentIntents.create(paymentIntentOptions, {
                stripeAccount: cuentaDestino  // 🔑 ESTO es Direct Charge
            });
        } else {
            // Crear PaymentIntent normal en cuenta master
            paymentIntent = await stripe.paymentIntents.create(paymentIntentOptions);
        }
        
        // Responder con información para el frontend
        return res.json({
            success: true,
            clientSecret: paymentIntent.client_secret,
            id: paymentIntent.id,
            destino: esCuentaConectada ? 'Cuenta Conectada (directo)' : 'Cuenta Principal',
            cuentaId: cuentaDestino,
            esCuentaConectada: esCuentaConectada,
            msiOptions: monto >= 1600000 ? [3, 6, 9, 12] : (monto >= 1300000 ? [3, 6] : []),
            msiEnabled: monto >= 1300000
        });
        
    } catch (error) {
        console.error('Error al crear payment intent:', error);

        console.error('🔥 ERROR COMPLETO:', error);
        console.error('🔥 ERROR CODE:', error.code);
        console.error('🔥 ERROR TYPE:', error.type);
        console.error('🔥 CUENTA DESTINO:', cuentaDestino);
        console.error('🔥 ES CUENTA CONECTADA:', esCuentaConectada);
        
        // Manejar errores específicos de cuentas conectadas
        let mensaje = error.message;
        let codigo = error.code || 'unknown';
        
        if (error.code === 'account_invalid') {
            mensaje = 'La cuenta conectada no es válida';
        } else if (error.code === 'account_inactive') {
            mensaje = 'La cuenta conectada no está activa';
        }
        
        return res.status(500).json({
            success: false,
            message: mensaje,
            codigo: codigo
        });
    }
};

// ✅ Webhook SIMPLIFICADO - ya no necesita manejar transferencias manuales
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
                        
                        // ✅ Con Direct Charges ya no necesitas transferencias manuales
                        // El dinero ya está directamente en la cuenta conectada
                        
                        // Información detallada sobre el pago a meses
                        let msiDetails = 'Pago único';
                        if (paymentIntent.payment_method_options?.card?.installments?.plan) {
                            const installmentPlan = paymentIntent.payment_method_options.card.installments.plan;
                            const count = installmentPlan.count || 0;
                            msiDetails = `Pago a ${count} meses sin intereses`;
                        }
                        
                        console.log(`✅ Pago directo registrado - ID: ${paymentIntent.id}, Tipo: ${msiDetails}`);
                        break;
                        
                    case 'payment_intent.payment_failed':
                        const failedPayment = event.data.object;
                        console.log('Pago fallido:', failedPayment.id);
                        const errorMessage = failedPayment.last_payment_error?.message || 'Error desconocido';
                        console.log('Motivo del fallo:', errorMessage);
                        break;
                        
                    case 'charge.succeeded':
                        const charge = event.data.object;
                        console.log('Cargo exitoso:', charge.id);
                        
                        // Extraer y registrar datos de MSI del cargo si existen
                        if (charge.payment_method_details?.card?.installments) {
                            const chargeInstallments = charge.payment_method_details.card.installments;
                            console.log('MSI en cargo:', {
                                plan: chargeInstallments.plan || 'No especificado',
                                meses: chargeInstallments.count || 0
                            });
                        }
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
                console.log(`Notificación manual - ID: ${paymentIntentId}, Email: ${email}, Nombre: ${name}`);
                
                // Generar referencia única
                const timestamp = new Date().getTime().toString().slice(-6);
                const randomStr = Math.random().toString(36).substring(2, 5).toUpperCase();
                const reference = `AHJ-${timestamp}-${randomStr}`;
                
                // ✅ Con Direct Charges ya no necesitas transferencias manuales aquí tampoco
                
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