// controllers/stripe.controller.js - Versión limpia sin Pay with Link
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
            
            // Verificar que la cuenta existe y está activa
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
        
        // ✅ CONFIGURACIÓN LIMPIA DEL PAYMENT INTENT SIN PAY WITH LINK
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
            payment_method_types: ['card'],
            payment_method_options: {
                card: {
                    // ✅ ESTO EVITA QUE APAREZCA PAY WITH LINK
                    capture_method: 'automatic'
                }
            }
        };
        
        // ✅ AGREGAR MSI SOLO SI APLICA
        if (monto >= 1300000) {
            paymentIntentOptions.payment_method_options.card.installments = {
                enabled: true
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

// Obtener PaymentIntent desde clientSecret
export const obtenerPaymentIntent = async (req, res) => {
    try {
        const { clientSecret, cuenta_stripe } = req.body;
        
        if (!clientSecret) {
            return res.status(400).json({
                success: false,
                message: 'El clientSecret es requerido'
            });
        }
        
        if (!clientSecret.includes('_secret_') || !clientSecret.startsWith('pi_')) {
            return res.status(400).json({
                success: false,
                message: 'Formato de clientSecret inválido',
                codigo: 'invalid_client_secret_format'
            });
        }
        
        const paymentIntentId = clientSecret.split('_secret')[0];
        
        if (!paymentIntentId || paymentIntentId.length < 10) {
            return res.status(400).json({
                success: false,
                message: 'No se pudo extraer el ID del PaymentIntent',
                codigo: 'invalid_payment_intent_id'
            });
        }
        
        let paymentIntent;
        
        if (cuenta_stripe && cuenta_stripe.startsWith('acct_')) {
            console.log(`🔍 Consultando PaymentIntent ${paymentIntentId} en cuenta conectada: ${cuenta_stripe}`);
            
            try {
                paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
                    stripeAccount: cuenta_stripe
                });
                console.log(`✅ PaymentIntent encontrado en cuenta conectada: ${paymentIntent.id}`);
            } catch (accountError) {
                console.error('Error al consultar en cuenta conectada:', accountError);
                return res.status(400).json({
                    success: false,
                    message: 'No se pudo consultar el PaymentIntent en la cuenta especificada',
                    codigo: 'account_query_failed',
                    errorDetail: accountError.message
                });
            }
        } else {
            console.log(`🔍 Consultando PaymentIntent ${paymentIntentId} en cuenta master`);
            paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
            console.log(`✅ PaymentIntent encontrado en cuenta master: ${paymentIntent.id}`);
        }
        
        if (!paymentIntent) {
            return res.status(404).json({
                success: false,
                message: 'PaymentIntent no encontrado',
                codigo: 'payment_intent_not_found'
            });
        }
        
        const paymentInfo = {
            id: paymentIntent.id,
            amount: paymentIntent.amount,
            currency: paymentIntent.currency,
            status: paymentIntent.status,
            description: paymentIntent.description || null,
            metadata: paymentIntent.metadata || {},
            created: paymentIntent.created,
            client_secret: paymentIntent.client_secret
        };
        
        // Información de MSI si existe
        try {
            if (paymentIntent.payment_method_options?.card?.installments?.plan) {
                const installmentPlan = paymentIntent.payment_method_options.card.installments.plan;
                paymentInfo.msi = {
                    enabled: true,
                    months: installmentPlan.count || 0,
                    plan: installmentPlan
                };
            } else {
                paymentInfo.msi = {
                    enabled: false,
                    months: 0
                };
            }
        } catch (msiError) {
            console.log('⚠️ Error al procesar información MSI:', msiError.message);
            paymentInfo.msi = {
                enabled: false,
                months: 0
            };
        }
        
        // Información del cargo si el pago fue exitoso
        try {
            if (paymentIntent.status === 'succeeded' && paymentIntent.charges?.data && paymentIntent.charges.data.length > 0) {
                const charge = paymentIntent.charges.data[0];
                paymentInfo.charge = {
                    id: charge.id,
                    amount: charge.amount,
                    currency: charge.currency,
                    paid: charge.paid,
                    payment_method: charge.payment_method || null,
                    receipt_url: charge.receipt_url || null,
                    created: charge.created
                };
                
                if (charge.payment_method_details?.card?.installments) {
                    const chargeInstallments = charge.payment_method_details.card.installments;
                    paymentInfo.charge.msi = {
                        plan: chargeInstallments.plan || null,
                        count: chargeInstallments.count || 0
                    };
                }
            }
        } catch (chargeError) {
            console.log('⚠️ Error al procesar información del cargo:', chargeError.message);
        }
        
        console.log(`📊 Información del PaymentIntent: Estado=${paymentIntent.status}, Monto=${paymentIntent.amount/100} ${paymentIntent.currency.toUpperCase()}`);
        
        return res.json({
            success: true,
            paymentIntent: paymentInfo,
            esRespuestaCompleta: true,
            consultadoEn: cuenta_stripe ? 'cuenta_conectada' : 'cuenta_master',
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('❌ Error al obtener PaymentIntent:', error);
        
        let errorMessage = 'Error interno del servidor';
        let errorCode = 'unknown';
        
        if (error.code === 'resource_missing') {
            errorMessage = 'PaymentIntent no encontrado';
            errorCode = 'resource_missing';
        } else if (error.code === 'invalid_request_error') {
            errorMessage = 'Solicitud inválida';
            errorCode = 'invalid_request_error';
        } else if (error.message) {
            errorMessage = error.message;
            errorCode = error.code || 'stripe_error';
        }
        
        return res.status(400).json({
            success: false,
            message: errorMessage,
            codigo: errorCode,
            errorType: error.type || 'unknown',
            errorDetail: error.detail || 'No disponible'
        });
    }
};

// Webhook para manejar eventos de Stripe
export const webhookStripe = async (req, res) => {
    try {
        const sig = req.headers['stripe-signature'];
        
        if (sig && req.rawBody) {
            try {
                const stripeAccount = req.headers['stripe-account'];
                
                const event = stripe.webhooks.constructEvent(
                    req.rawBody,
                    sig,
                    process.env.STRIPE_WEBHOOK_SECRET
                );
                
                console.log(`📨 Webhook recibido: ${event.type} ${stripeAccount ? `(cuenta: ${stripeAccount})` : '(cuenta master)'}`);
                
                switch (event.type) {
                    case 'payment_intent.succeeded':
                        const paymentIntent = event.data.object;
                        console.log('✅ PaymentIntent exitoso:', paymentIntent.id);
                        
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
                        console.log(`💵 Monto: ${paymentIntent.amount / 100} ${paymentIntent.currency.toUpperCase()}`);
                        break;
                        
                    case 'payment_intent.payment_failed':
                        const failedPayment = event.data.object;
                        console.log('❌ Pago fallido:', failedPayment.id);
                        const errorMessage = failedPayment.last_payment_error?.message || 'Error desconocido';
                        console.log('🔍 Motivo del fallo:', errorMessage);
                        
                        if (stripeAccount) {
                            console.log(`🏪 Fallo en cuenta conectada: ${stripeAccount}`);
                        }
                        break;
                        
                    case 'charge.succeeded':
                        const charge = event.data.object;
                        console.log('💳 Cargo exitoso:', charge.id);
                        
                        if (charge.payment_method_details?.card?.installments) {
                            const chargeInstallments = charge.payment_method_details.card.installments;
                            console.log('📅 MSI en cargo:', {
                                plan: chargeInstallments.plan || 'No especificado',
                                meses: chargeInstallments.count || 0
                            });
                        }
                        
                        if (stripeAccount) {
                            console.log(`💰 Cargo directo en cuenta conectada: ${stripeAccount}`);
                        }
                        break;
                        
                    case 'account.updated':
                        const account = event.data.object;
                        console.log(`🔄 Cuenta conectada actualizada: ${account.id}`);
                        console.log(`📊 Estado: charges_enabled=${account.charges_enabled}, payouts_enabled=${account.payouts_enabled}`);
                        break;
                        
                    default:
                        console.log(`ℹ️ Evento no manejado: ${event.type}`);
                        if (stripeAccount) {
                            console.log(`🏪 Desde cuenta conectada: ${stripeAccount}`);
                        }
                }
                
                res.status(200).json({ received: true });
            } catch (error) {
                console.error('❌ Error al verificar webhook:', error);
                return res.status(400).send(`Webhook Error: ${error.message}`);
            }
        } else {
            // Notificación manual desde frontend
            const { paymentIntentId, status, email, name, cuentaStripe } = req.body;
            
            if (!paymentIntentId || !status) {
                return res.status(400).json({
                    success: false,
                    message: 'Faltan datos requeridos'
                });
            }
            
            if (status === 'succeeded') {
                console.log(`📱 Notificación manual - ID: ${paymentIntentId}, Email: ${email}`);
                
                if (cuentaStripe && cuentaStripe.startsWith('acct_')) {
                    try {
                        console.log(`🔍 Verificando PaymentIntent en cuenta conectada: ${cuentaStripe}`);
                        
                        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
                            stripeAccount: cuentaStripe
                        });
                        
                        console.log(`✅ PaymentIntent verificado: ${paymentIntent.id} - Estado: ${paymentIntent.status}`);
                        
                        if (paymentIntent.status === 'succeeded') {
                            console.log(`💰 Monto: ${paymentIntent.amount / 100} ${paymentIntent.currency.toUpperCase()}`);
                            
                            if (paymentIntent.payment_method_options?.card?.installments?.plan) {
                                const meses = paymentIntent.payment_method_options.card.installments.plan.count;
                                console.log(`📅 Pago a ${meses} meses sin intereses`);
                            }
                        }
                        
                    } catch (retrieveError) {
                        console.error(`❌ Error al verificar PaymentIntent en cuenta ${cuentaStripe}:`, retrieveError.message);
                    }
                } else {
                    console.log('📱 Notificación manual para cuenta master');
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