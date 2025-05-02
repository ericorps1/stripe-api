// Middleware para preservar el body raw para webhooks de Stripe
export const rawBodyMiddleware = (req, res, next) => {
    // Solo lo preservamos si es la ruta de webhook y content-type es application/json
    if (req.originalUrl.includes('/webhook') && 
        req.headers['content-type'] === 'application/json') {
        
        let rawBody = '';
        req.on('data', (chunk) => {
            rawBody += chunk.toString();
        });
        
        req.on('end', () => {
            if (rawBody) {
                req.rawBody = rawBody;
            }
            next();
        });
    } else {
        next();
    }
};