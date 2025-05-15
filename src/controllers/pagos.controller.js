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
        
        // Determinar planes de MSI disponibles según el monto
        let msiOptions = [];
        let installmentsConfig = {
            enabled: false // Por defecto desactivado
        };
 
        // Configurar MSI según monto
        if (monto >= 1600000) { // ≥ $16,000 MXN
            msiOptions = [3, 6, 9, 12];
            installmentsConfig = {
                enabled: true,
                plan: {
                    // No especificamos plan por defecto, solo habilitamos
                    // El usuario elegirá el plan en el frontend
                    // después de la verificación con su tarjeta
                }
            };
        } else if (monto >= 1300000) { // ≥ $13,000 MXN
            msiOptions = [3, 6];
            installmentsConfig = {
                enabled: true,
                plan: {
                    // El usuario elegirá entre 3 o 6 en el frontend
                    // solo si su tarjeta lo soporta
                }
            };
        }
        
        // Opciones para el payment intent
        const paymentIntentOptions = {
            amount: monto,
            currency: 'mxn',
            description: descripcion || 'Pago AHJ ENDE',
            metadata: {
                ...metadata || {},
                montoOriginal: monto / 100, // Guardar monto en formato humano para referencia
                opcionesMSI: JSON.stringify(msiOptions) // Registrar qué opciones se ofrecieron
            },
            payment_method_types: ['card'],
            payment_method_options: {
                card: {
                    installments: installmentsConfig
                }
            }
        };
        
        // Crear el payment intent
        const paymentIntent = await stripe.paymentIntents.create(paymentIntentOptions);
        
        // Responder con toda la información necesaria para el frontend
        return res.json({
            success: true,
            clientSecret: paymentIntent.client_secret,
            id: paymentIntent.id,
            destino: 'cuenta_principal',
            msiOptions: msiOptions, // El frontend debe aplicar el segundo filtro con esto
            msiEnabled: installmentsConfig.enabled // Indicador claro si MSI está habilitado
        });
        
    } catch (error) {
        console.error('Error al crear payment intent:', error);
        return res.status(500).json({
            success: false,
            message: error.message,
            codigo: error.code || 'unknown'
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
                       
                       // Información detallada sobre el pago a meses (si aplica)
                       let msiDetails = 'Pago único';
                       if (paymentIntent.payment_method_options?.card?.installments?.plan) {
                           const installmentPlan = paymentIntent.payment_method_options.card.installments.plan;
                           const count = installmentPlan.count || 0;
                           msiDetails = `Pago a ${count} meses sin intereses`;
                           
                           // Registrar información completa del plan de meses
                           console.log('Detalles de MSI:', {
                               tipo: installmentPlan.type,
                               meses: count,
                               intervalo: installmentPlan.interval || 'month',
                               montoOriginal: paymentIntent.metadata?.montoOriginal || (paymentIntent.amount / 100)
                           });
                       }
                       
                       // Aquí puedes enviar los datos a tu sistema (DB, API, etc.)
                       console.log(`Registro exitoso - Pago ID: ${paymentIntent.id}, Tipo: ${msiDetails}`);
                       break;
                       
                   case 'payment_intent.payment_failed':
                       const failedPayment = event.data.object;
                       console.log('Pago fallido:', failedPayment.id);
                       // Registrar el error específico
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
           const { paymentIntentId, status, email, name, installmentPlan } = req.body;
           
           // Validar los datos recibidos
           if (!paymentIntentId || !status) {
               return res.status(400).json({
                   success: false,
                   message: 'Faltan datos requeridos'
               });
           }
           
           if (status === 'succeeded') {
               // Registrar información detallada del pago
               const msiInfo = installmentPlan 
                   ? `Plan MSI: ${installmentPlan} meses` 
                   : 'Pago único';
                   
               console.log(`Pago exitoso manual - ID: ${paymentIntentId}, Email: ${email}, Nombre: ${name}, ${msiInfo}`);
               
               // Generar referencia única con formato más estructurado
               const timestamp = new Date().getTime().toString().slice(-6);
               const randomStr = Math.random().toString(36).substring(2, 5).toUpperCase();
               const reference = `AHJ-${timestamp}-${randomStr}`;
               
               return res.status(200).json({
                   success: true,
                   reference: reference,
                   msiApplied: installmentPlan ? true : false,
                   msiPlan: installmentPlan || 0
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