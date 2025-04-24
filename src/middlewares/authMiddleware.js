import dotenv from "dotenv";
import { auth, getHttpStatusMessage } from "../functions/funciones.js";
dotenv.config();


const verifySecurityKey = async (req, res, next) => {
    const authHeader = await auth(req);
    // console.log(authHeader);

    if(!authHeader){
      // JSON INVALIDO
      return res.status(401).json({ 
        "status": 401,
        "message": getHttpStatusMessage(401),
        "data": "" 
      });
      // FIN JSON INVALIDO
    }
    next();
};

export default verifySecurityKey;