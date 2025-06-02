// controllers/stripe.controller.js - Versión corregida
import Stripe from 'stripe';
import dotenv from 'dotenv';

dotenv.config();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Crear un Payment Intent
export const crearPaymentIntent = async (req, res) => {
    let cuentaDestino = '';
    let esCuentaConectada = false;
    
    try {
        const { monto, descripcion, metadata, cuenta_stripe } = req.body;
        
        if (!monto) {
            return res.status(400).json({
                success: false,
                message: 'El monto es requerido'
            });
        }
        
        cuentaDestino = cuenta_stripe || '';
        
        if (cuentaDestino && cuentaDestino.startsWith('acct_')) {
            esCuentaConectada = true;
            
            // ✅ NUEVO: Verificar que la cuenta existe y está activa
            try {
                const account = await stripe.accounts.retrieve(cuentaDestino);
                
                if (!account.charges_enabled || !account.payouts_enabled) {
                    return res.status(400).json({
                        success: false,
                        message: 'La cuenta conectada no está completamente configurada',
                        codigo: 'account_incomplete',
                        errorDetail: {
                            charges_enabled: account.charges_enabled,
                            payouts_enabled: account.payouts_enabled,
                            requirements: account.requirements
                        }
                    });
                }
                
                console.log(`✅ Cuenta conectada validada: ${cuentaDestino}`);
                
            } catch (accountError) {
                console.error('Error al verificar cuenta conectada:', accountError);
                return res.status(400).json({
                    success: false,
                    message: 'Cuenta conectada no válida o no encontrada',
                    codigo: 'account_invalid',
                    errorDetail: accountError.message
                });
            }
        }
        
        const paymentIntentOptions = {
            amount: monto,
            currency: 'mxn',
            description: descripcion || 'Pago AHJ ENDE',
            metadata: {
                ...metadata || {},
                montoOriginal: monto / 100,
                entorno: process.env.NODE_ENV || 'development',
                cuentaDestino: cuentaDestino || 'master'
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
        
        let paymentIntent;
        if (esCuentaConectada) {
            console.log(`🔄 Creando PaymentIntent directo en cuenta: ${cuentaDestino}`);
            
            paymentIntent = await stripe.paymentIntents.create(paymentIntentOptions, {
                stripeAccount: cuentaDestino
            });
            
            console.log(`✅ PaymentIntent creado en cuenta conectada: ${paymentIntent.id}`);
        } else {
            console.log('🔄 Creando PaymentIntent en cuenta master');
            paymentIntent = await stripe.paymentIntents.create(paymentIntentOptions);
            console.log(`✅ PaymentIntent creado en cuenta master: ${paymentIntent.id}`);
        }
        
        return res.json({
            success: true,
            clientSecret: paymentIntent.client_secret,
            id: paymentIntent.id,
            destino: esCuentaConectada ? 'Cuenta Conectada (directo)' : 'Cuenta Principal',
            cuentaId: cuentaDestino,
            esCuentaConectada: esCuentaConectada,
            msiOptions: monto >= 1600000 ? [3, 6, 9, 12] : (monto >= 1300000 ? [3, 6] : []),
            msiEnabled: monto >= 1300000,
            entorno: process.env.NODE_ENV || 'development'
        });
        
    } catch (error) {
        console.error('❌ Error al crear payment intent:', error);
        
        let errorMessage = error.message;
        let errorCode = error.code || 'unknown';
        
        if (error.code === 'account_invalid') {
            errorMessage = 'La cuenta de la sucursal no es válida';
        } else if (error.code === 'account_inactive') {
            errorMessage = 'La cuenta de la sucursal no está activa';
        } else if (error.code === 'insufficient_permissions') {
            errorMessage = 'Permisos insuficientes para acceder a la cuenta';
        }
        
        return res.status(500).json({
            success: false,
            message: errorMessage,
            codigo: errorCode,
            errorType: error.type,
            errorDetail: error.detail,
            entorno: process.env.NODE_ENV || 'development',
            cuentaDestino: cuentaDestino,
            esCuentaConectada: esCuentaConectada,
            fullError: {
                code: error.code,
                type: error.type,
                message: error.message,
                detail: error.detail,
                decline_code: error.decline_code,
                param: error.param
            }
        });
    }
};

// ✅ WEBHOOK CORREGIDO para manejar cuentas conectadas
export const webhookStripe = async (req, res) => {
    try {
        const sig = req.headers['stripe-signature'];
        
        if (sig && req.rawBody) {
            try {
                const event = stripe.webhooks.constructEvent(
                    req.rawBody,
                    sig,
                    process.env.STRIPE_WEBHOOK_SECRET
                );
                
                console.log(`📨 Webhook recibido: ${event.type}`);
                
                switch (event.type) {
                    case 'payment_intent.succeeded':
                        const paymentIntent = event.data.object;
                        console.log('✅ PaymentIntent exitoso:', paymentIntent.id);
                        
                        // ✅ Detectar si es cuenta conectada
                        const stripeAccount = req.headers['stripe-account'];
                        if (stripeAccount) {
                            console.log(`💰 Pago directo en cuenta conectada: ${stripeAccount}`);
                        } else {
                            console.log('💰 Pago en cuenta master');
                        }
                        
                        let msiDetails = 'Pago único';
                        if (paymentIntent.payment_method_options?.card?.installments?.plan) {
                            const installmentPlan = paymentIntent.payment_method_options.card.installments.plan;
                            const count = installmentPlan.count || 0;
                            msiDetails = `Pago a ${count} meses sin intereses`;
                        }
                        
                        console.log(`📊 Detalle del pago: ${msiDetails}`);
                        break;
                        
                    case 'payment_intent.payment_failed':
                        const failedPayment = event.data.object;
                        console.log('❌ Pago fallido:', failedPayment.id);
                        const errorMessage = failedPayment.last_payment_error?.message || 'Error desconocido';
                        console.log('🔍 Motivo del fallo:', errorMessage);
                        break;
                        
                    default:
                        console.log(`ℹ️ Evento no manejado: ${event.type}`);
                }
                
                res.status(200).json({ received: true });
            } catch (error) {
                console.error('❌ Error al verificar webhook:', error);
                return res.status(400).send(`Webhook Error: ${error.message}`);
            }
        } else {
            // ✅ CORREGIDO: Notificación manual desde frontend
            const { paymentIntentId, status, email, name, cuentaStripe } = req.body;
            
            if (!paymentIntentId || !status) {
                return res.status(400).json({
                    success: false,
                    message: 'Faltan datos requeridos'
                });
            }
            
            if (status === 'succeeded') {
                console.log(`📱 Notificación manual - ID: ${paymentIntentId}, Email: ${email}`);
                
                // ✅ NUEVO: Si viene con cuenta stripe, intentar recuperar el PaymentIntent
                if (cuentaStripe && cuentaStripe.startsWith('acct_')) {
                    try {
                        console.log(`🔍 Verificando PaymentIntent en cuenta conectada: ${cuentaStripe}`);
                        
                        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
                            stripeAccount: cuentaStripe
                        });
                        
                        console.log(`✅ PaymentIntent verificado: ${paymentIntent.id} - Estado: ${paymentIntent.status}`);
                        
                        if (paymentIntent.status === 'succeeded') {
                            console.log(`💰 Monto: ${paymentIntent.amount / 100} ${paymentIntent.currency.toUpperCase()}`);
                            
                            // MSI info si existe
                            if (paymentIntent.payment_method_options?.card?.installments?.plan) {
                                const meses = paymentIntent.payment_method_options.card.installments.plan.count;
                                console.log(`📅 Pago a ${meses} meses sin intereses`);
                            }
                        }
                        
                    } catch (retrieveError) {
                        console.error(`❌ Error al verificar PaymentIntent en cuenta ${cuentaStripe}:`, retrieveError.message);
                        // No fallar aquí, continuar con el proceso normal
                    }
                }
                
                const timestamp = new Date().getTime().toString().slice(-6);
                const randomStr = Math.random().toString(36).substring(2, 5).toUpperCase();
                const reference = `AHJ-${timestamp}-${randomStr}`;
                
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
        console.error('❌ Error general en webhook:', error);
        return res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
};