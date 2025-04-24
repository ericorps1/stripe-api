import { pool } from "../db.js";
import nodemailer from 'nodemailer';
import { Tedis } from "tedis";
import dotenv from "dotenv";
import { getDatosGrupo } from "../api/api.js";
import { response } from "express";
dotenv.config();

const state = { dbcust: null, dbsec: null, session: null };

export const enviarCorreo = async (destinatario, titulo, mensaje) => {

  const contentHTML = `
    <html>
      <head>
        <title>Plataforma ENDE</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            background-color: #f5f5f5;
          }
          h1 {
            color: #333333;
          }
          ul {
            list-style: none;
            padding: 0;
          }
          li {
            margin-bottom: 10px;
          }
          p {
            margin-top: 20px;
          }
        </style>
      </head>
      <body>
        <h1>AHJ Informa</h1>
        <p>${mensaje}</p>

      </body>
    </html>
  `;

  let transporter = nodemailer.createTransport({
    host: 'mail.ahjende.com',
    port: 465,
    secure: true,
    auth: {
      user: 'plataforma@ahjende.com',
      pass: 'Anjunabeats_10'
    },
    tls: {
      rejectUnauthorized: false
    }
  });

  try {
    let info = await transporter.sendMail({
      from: 'plataforma@ahjende.com',
      to: destinatario,
      subject: titulo,
      html: contentHTML
    });

    console.log('Email sent:', info.response);
  } catch (error) {
    console.error('Error sending email:', error);
  }
};

export const sendEmail = async (datos) => {
  const { name, email, phone, matricula } = datos;

  const contentHTML = `
  <!DOCTYPE html>
  <html lang="es">
  <head>
    <meta charset="UTF-8">
    <title>Bienvenido/a a AHJ - ENDE</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        background-color: #f5f5f5;
        line-height: 1.5;
      }
      .header {
        background-color: #003843;
        color: #003843;
        padding: 20px;
        text-align: center;
      }
      .logo {
        max-width: 200px;
        height: auto;
        display: block;
        margin: 0 auto;
      }
      .content {
        padding: 20px;
        background-color: #f8f8f8;
        border-radius: 10px;
        box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.2);
      }
      .card {
        background-color: #fff;
        padding: 20px;
        border-radius: 10px;
        transition: box-shadow 0.3s ease-in-out;
      }
      .card:hover {
        box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.5);
      }
      .datos-alumno {
        margin-bottom: 20px;
      }
      .datos-alumno strong {
        font-weight: bold;
      }
      .eslogan {
        text-align: center;
        font-style: italic;
        color: #0097B5;
        margin-top: 20px;
      }
      .platform-link {
        display: inline-block;
        margin-top: 20px;
        background-color: #003843;
        color: #fff;
        padding: 10px 20px;
        border-radius: 5px;
        text-decoration: none;
        font-weight: bold;
        text-decoration: underline;
      }
      .credentials {
        margin-top: 20px;
        padding: 10px;
        background-color: #fff;
        border-radius: 5px;
        font-size: 14px;
        line-height: 1.5;
      }
      .content p {
        border-bottom: 2px solid #ccc;
        padding-bottom: 10px;
      }
      .emoji {
        font-size: 24px;
        margin-right: 5px;
      }
    </style>
  </head>
  <body>
    <div class="header">
      <img class="logo" src="https://lh3.googleusercontent.com/HzodaZ9MDOP58YA3znLNUiJMVjKeVi5wu-_ZBkRZT33WMuj-iqknlmIb7DFTSKNrXp0=w2400" alt="Logo AHJ - ENDE">
      <h3 style="color: white;">Escuela de Negocios y Desarrollo Empresarial</h3>
    </div>

    <div class="content">
      <div class="card">
        <h2><span class="emoji">🎉</span>Bienvenido/a a AHJ - ENDE<span class="emoji">🎉</span></h2>
        <p><span class="emoji">👋</span>Estimado/a <strong>${name}</strong>,</p>
        <p><span class="emoji">🎓</span>Te damos la bienvenida a nuestro Centro de Desarrollo Empresarial (CDE), donde construimos líderes con visión empresarial.</p>
        
        <div class="datos-alumno">
          <p><span class="emoji">📝</span>Tus datos de inscripción son los siguientes:</p>
          <ul>
            <li><strong>Matrícula:</strong> ${matricula}</li>
            <li><strong>Correo:</strong> ${email}</li>
          </ul>
        </div>
        
        <p><span class="emoji">🌟</span>Esperamos que tengas una experiencia educativa enriquecedora y exitosa con nosotros.</p>
      
        <div class="credentials">
          <p><span class="emoji">🔐</span>Tu cuenta de acceso a la <a style="text-align: center; color: #003843; font-weight: bold; text-decoration: underline;" href="https://plataforma.ahjende.com/">Plataforma Escolar</a></p>
          <ul>
            <li><strong>Usuario:</strong> Tu usuario es tu matrícula</li>
            <li><strong>Contraseña:</strong> Tu contraseña es tu número telefónico</li>
          </ul>
        </div>
      </div>
    </div>
  </body>
  </html>


  `;

  let transporter = nodemailer.createTransport({
    host: 'mail.ahjende.com',
    port: 465,
    secure: true,
    auth: {
      user: 'plataforma@ahjende.com',
      pass: 'Anjunabeats_10'
    },
    tls: {
      rejectUnauthorized: false
    }
  });

  try {
    let info = await transporter.sendMail({
      from: 'plataforma@ahjende.com',
      to: email,
      subject: '💙 AHJ ENDE - Plataforma',
      html: contentHTML
    });

    console.log('Email sent:', info.response);
  } catch (error) {
    console.error('Error sending email:', error);
  }
};

export const addDataMatricula = async (alumno_id, cde, gpoacadId, plantel_id, modalidad, programa_id) => {
  // try {
    const [rows] = await pool.query(
      "INSERT INTO matriculas(alumno_id, grupo_id, plantel_id, modalidad, programa_id) VALUES (?, ?, ?, ?, ?)",
      [alumno_id, gpoacadId, plantel_id, modalidad, programa_id]
    );

    const matricula_id = rows.insertId;

    const [rows2] = await pool.query("SELECT matricula FROM matriculas WHERE (alumno_id = ?) AND (matricula IS NOT NULL)", [
      alumno_id,
    ]);

    const total_rows = rows2[0];
    // console.log(matricula_id);
    if( total_rows == undefined ){
      
      const matricula = await generarMatricula( cde, matricula_id );
      
      const datos = {
        name: "Erick Sergio Valenzuela Aguilar",
        email: "ericorps1@gmail.com",
        phone: "5518292351",
        matricula: matricula
      };
      
      await sendEmail( datos );

      return matricula;

    } else {
      const matricula = rows2[0].matricula;
      
      const [result] = await pool.query(
        "UPDATE matriculas SET matricula = ? WHERE matricula_id = ?",
        [matricula, matricula_id]
      );

      const datos = {
        name: "Erick Sergio Valenzuela Aguilar",
        email: "ericorps1@gmail.com",
        phone: "5518292351",
        matricula: matricula
      };
      
      await sendEmail( datos );

      return matricula;
    }

  // } catch (error) {
    
  //   throw new Error("Hubo un error");
  // }
};

export const generarMatricula = async (cde, matricula_id) => { 
  const fecha = new Date();
  const anio = fecha.getFullYear().toString().slice(-2);
  const mes = ('0' + (fecha.getMonth() + 1)).slice(-2);

  const matriculasTotales = await pool.query("SELECT matricula FROM matriculas ORDER BY matricula_id DESC;", []);
  const numeroFilas = matriculasTotales[0].length;

  let matricula = "";

  if( numeroFilas > 1 ){

    const matriculasExistentesAux = await pool.query("SELECT matricula FROM matriculas ORDER BY matricula_id DESC LIMIT 1 OFFSET 1;", []);

    const matriculasExistentes = matriculasExistentesAux[0][0].matricula;
    // primero extraemos el último elemento que tiene el valor más grande
    let matricula_auxiliar = matriculasExistentes;

    // recortar la cadena de derecha a izquierda con los últimos 5 valores
    matricula_auxiliar = matricula_auxiliar.slice((matriculasExistentes.length-1) - 4);
    // parsearla a entero
    matricula_auxiliar = parseInt( matricula_auxiliar );

    // incremento unitario
    matricula_auxiliar = matricula_auxiliar+1;

    // adicionar de ceros
    matricula_auxiliar = String(matricula_auxiliar).padStart(5, '0');

    matricula = cde.toLowerCase().slice(0, 2) + anio + mes + matricula_auxiliar;

  } else {
    matricula = cde.toLowerCase().slice(0, 2) + anio + mes + "00001";
  }
  
  const [result] = await pool.query(
    "UPDATE matriculas SET matricula = UPPER(?) WHERE matricula_id = ?",
    [matricula, matricula_id]
  );

  return matricula;
};

export const getDataPagos = async (pagoId) => {
  try {
    const [rows] = await pool.query("SELECT * FROM pagos WHERE pago_id = ?", [
      pagoId
    ]);
    
    // Pago encontrado
    return rows;

  } catch (error) {
    // Error al obtener el pago
    throw new Error("Hubo un error");
  }
};

export const getHttpStatusMessage = (statusCode) => {
  switch (statusCode) {
    case 100:
      return 'Continue';
    case 101:
      return 'Switching Protocols';
    case 200:
      return 'Success';
    case 201:
      return 'Created';
    case 202:
      return 'Accepted';
    case 203:
      return 'Non-Authoritative Information';
    case 204:
      return 'No Content';
    case 205:
      return 'Reset Content';
    case 206:
      return 'Partial Content';
    case 300:
      return 'Multiple Choices';
    case 301:
      return 'Moved Permanently';
    case 302:
      return 'Found';
    case 303:
      return 'See Other';
    case 304:
      return 'Not Modified';
    case 307:
      return 'Temporary Redirect';
    case 308:
      return 'Permanent Redirect';
    case 400:
      return 'Bad Request';
    case 401:
      return 'Unauthorized';
    case 403:
      return 'Forbidden';
    case 404:
      return 'Data Not Found';
    case 405:
      return 'Method Not Allowed';
    case 406:
      return 'Not Acceptable';
    case 407:
      return 'Proxy Authentication Required';
    case 408:
      return 'Request Timeout';
    case 409:
      return 'Conflict';
    case 410:
      return 'Gone';
    case 411:
      return 'Length Required';
    case 412:
      return 'Precondition Failed';
    case 413:
      return 'Payload Too Large';
    case 414:
      return 'URI Too Long';
    case 415:
      return 'Unsupported Media Type';
    case 416:
      return 'Range Not Satisfiable';
    case 417:
      return 'Expectation Failed';
    case 418:
      return "I'm a teapot";
    case 422:
      return 'Unprocessable Entity';
    case 425:
      return 'Too Early';
    case 426:
      return 'Upgrade Required';
    case 428:
      return 'Precondition Required';
    case 429:
      return 'Too Many Requests';
    case 431:
      return 'Request Header Fields Too Large';
    case 451:
      return 'Unavailable For Legal Reasons';
    case 500:
      return 'Internal Server Error';
    case 501:
      return 'Not Implemented';
    case 502:
      return 'Bad Gateway';
    case 503:
      return 'Service Unavailable';
    case 504:
      return 'Gateway Timeout';
    case 505:
      return 'HTTP Version Not Supported';
    case 506:
      return 'Variant Also Negotiates';
    case 507:
      return 'Insufficient Storage';
    case 508:
      return 'Loop Detected';
    case 510:
      return 'Not Extended';
    case 511:
      return 'Network Authentication Required';
    default:
      return '';
  }
};

export const obtenerExtension = (nombreArchivo) => {
  const extension = nombreArchivo.split('.').pop(); // Obtener la extensión
  return "." + extension; // Devolver solo la extensión
};

export async function obtenerPagoDesdeDB(pagoId) {
  try {
    const [rows] = await pool.query("SELECT * FROM pagos WHERE pago_id = ?", [
      pagoId,
    ]);

    if (rows.length <= 0) {
      // Pago no encontrado
      return null;
    }

    // Pago encontrado
    return rows[0];

  } catch (error) {
    // Error al obtener el pago
    throw new Error("Error al obtener el pago desde la base de datos");
  }
}

export const getDateTimeLog = () => {
  var datetime = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString();
  let timestamp = datetime.split('T')[0].concat(' ').concat(datetime.split('T')[1].split('.')[0]);
  return timestamp;
};

export const getDateLog = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getDbSec = () => {
  return state.dbsec;
}

export const auth = async (req) => {
  let _auth = req.headers;
  if (!_auth.authorization || _auth.authorization.indexOf('Bearer ') === -1) {
      return false;
  }else{
      //Verify auth credentials
      let _clientauth =  _auth.authorization.split(' ')[1];
      let _security = await getDbSec().hget(process.env.APP_REDIS_MAP, "bearer");
      return _clientauth === _security;
  }
};

export const conexionRedis = async () => {

  let secnx = new Tedis({host: process.env.APP_REDIS_HOST, port: process.env.APP_REDIS_PORT, password: process.env.APP_REDIS_PWD});

  secnx.on('error', err =>{
      throw new Error(err)
  });
  secnx.on('timeout', async () =>{
      throw new Error(process.env.TIMEOUTERROR);
  })
  secnx.on("connect", async () => {
    
      // console.log("Success")
  })
  state.dbsec = secnx;

  return state.dbsec.id;
}

export const validarEntero = (numero) => {
  return Number.isInteger(numero) && numero > 0;
};

export const validarFlotante = (numero) => {
  return Number.isFinite(numero) && numero > 0;
};

export const validarCadena = (cadena) => {
  return typeof cadena === 'string' && cadena.trim().length !== 0;
};

export const obtenerMesesPorPeriodicidad = (periodicidad) => {
  switch (periodicidad) {
    case "semestral":
      return 6;
    case "cuatrimestral":
      return 4;
    case "trimestral":
      return 3;
    case "bimestral":
      return 2;
    case "mensual":
      return 1;
    default:
      throw new Error("Periodicidad no reconocida.");
  }
}


export const sumarDias = (fecha, diasASumar) => {
  const fechaObj = new Date(fecha);
  fechaObj.setDate(fechaObj.getDate() + diasASumar);
  return fechaObj;
}

// Función para sumar un mes a una fecha dada
export const sumarUnMes = (fecha) => {
  const newDate = new Date(fecha);
  newDate.setMonth(newDate.getMonth() + 1);
  return newDate;
}

// Función para cambiar el día de una fecha
export const cambiarDiaFecha = (fecha_argumento, nuevoDia) => {
  let fecha = new Date(fecha_argumento);
  fecha.setDate(nuevoDia);
  return fecha.toISOString();
};

// Función para cambiar el formato de una fecha de JS de 2024-07-05T06:00:00.000Z a "yyyy-mm-dd"
export const formatearFecha = (fecha) => {
  const fechaObj = new Date(fecha);
  const fechaMySQL = fechaObj.toISOString().slice(0, 10);
  return fechaMySQL;
};

// Función para adicionar pagos de colegiatura a un alumno recién inscrito
export const generarPagos = async (matricula, grupo_id, responsable) => {
  
  const data = await getDatosGrupo(grupo_id);
  // let inicio = "2023-07-31T06:00:00.000Z";
  let inicio = data.fechaInicio;
  let fin = data.fechaFin;
  // let periodicidad = data.planCalendario;
  let periodicidad = "Semestral";
  let duracionMensualidades = data.planDuracion;
  let precioColegiatura = data.planMensual;
  let precioCertificacion = data.precioCertificacion;

  let cde = data.cde;

  const fechaInicioAux = new Date(inicio);
  const dia = fechaInicioAux.getDate();

  let fechaInicio;
  let fechaFin;

  let fechaInicio2;
  let fechaFin2;

  // Validar si el día está entre 1 y 15
  if (dia >= 1 && dia <= 15) {
    // console.log("La fecha de inicio está entre el 1 y el 15 del mes.");
    
    // Obtener el año y el mes de la fecha
    const year = fechaInicioAux.getFullYear();
    const month = fechaInicioAux.getMonth();

    // Obtener el día 1 y 5 del mes
    fechaInicio = new Date(year, month, 1);
    fechaFin = new Date(year, month, 5);

    fechaInicio2 = sumarUnMes(fechaInicio);
    fechaFin2 = sumarUnMes(fechaFin);

  } else {

    const fechaInicioObj = new Date(fechaInicioAux);
    const diaSemana = fechaInicioObj.getDay();
    // Calcula la cantidad de días para llegar al próximo viernes (5 es el índice del viernes en JavaScript)
    const diferenciaDias = (5 - diaSemana + 7) % 7; 

    // Clonamos la fecha de inicio para no modificarla directamente
    const proximoViernesObj = new Date(fechaInicioObj);
    proximoViernesObj.setDate(fechaInicioObj.getDate() + diferenciaDias);

    const proximoViernes = proximoViernesObj.toISOString(); // Retorna el próximo viernes en formato ISO 8601 (cad

    fechaInicio = fechaInicioAux;
    fechaFin = sumarDias( proximoViernes, 7 );

    fechaInicio2 = cambiarDiaFecha(sumarUnMes(fechaInicio), 10);
    fechaFin2 = cambiarDiaFecha(fechaInicio2, 15);

  }

  //VARIABLES COLEGIATURA 1
  let monto_adeudo = precioColegiatura;
  let monto_original = precioColegiatura;
  let folio = cde;
  let concepto = "Colegiatura 1";
  // let responsable = responsable;
  let fecha_inicio = fechaInicio;
  let fecha_fin = fechaFin;
  let tipo_id = 2;
  let factura = "001";
  let visible = 1;
  // let matricula = matricula;
  // VARIABLES COLEGIATURA 1

  //INSERCION COLAGIATURA 1
  insertarPago(monto_adeudo, monto_original, folio, concepto, responsable, fecha_inicio, fecha_fin, tipo_id, factura, visible, matricula);
  // FIN INSERCION COLEGIATURA 1

  //VARIABLES COLEGIATURA 2
  monto_adeudo = precioColegiatura;
  monto_original = precioColegiatura;
  folio = cde;
  concepto = "Colegiatura 2";
  // let responsable = responsable;
  fecha_inicio = fechaInicio2;
  fecha_fin = fechaFin2;
  tipo_id = 2;
  factura = "002";
  visible = 0;
  // let matricula = matricula;
  // VARIABLES COLEGIATURA 2

  // INSERCION COLEGIATURA 2
  insertarPago(monto_adeudo, monto_original, folio, concepto, responsable, fecha_inicio, fecha_fin, tipo_id, factura, visible, matricula);
  // FIN INSERCION COLEGIATURA 2

  //VARIABLES TRAMITES
  monto_adeudo = precioCertificacion;
  monto_original = precioCertificacion;
  folio = cde;
  concepto = "Trámites";
  // let responsable = responsable;
  fecha_inicio = fechaInicio2;
  fecha_fin = fechaFin2;
  tipo_id = 3;
  factura = "Trámites";
  visible = 0;
  // let matricula = matricula;
  // VARIABLES TRAMITES

  // INSERCION TRAMITES
  insertarPago(monto_adeudo, monto_original, folio, concepto, responsable, fecha_inicio, fecha_fin, tipo_id, factura, visible, matricula);
  // FIN INSERCION TRAMITES

  // console.log( "1- cole1--- inicio: ",fechaInicio,"-- fin: ",fechaFin );
  // console.log( "2- cole2--- inicio: ",fechaInicio2,"-- fin: ",fechaFin2 );
  
  let fechaInicioColegiaturas;
  let fechaFinColegiaturas;
  
  for (var i = 0, numero = 3; i < (duracionMensualidades - 2); i++, numero++) {
    if (i == 0) {
      fechaInicioColegiaturas = cambiarDiaFecha(sumarUnMes(fechaInicio2), 1);
      fechaFinColegiaturas = cambiarDiaFecha(fechaInicioColegiaturas, 5);
    } else {
      fechaInicioColegiaturas = sumarUnMes(fechaInicioColegiaturas);
      fechaFinColegiaturas = cambiarDiaFecha(fechaInicioColegiaturas, 5);
    }
  
    // VARIABLES COLEGIATURA N
    monto_adeudo = precioColegiatura;
    monto_original = precioColegiatura;
    folio = cde;
    concepto = `Colegiatura ${numero}`;
    // let responsable = responsable;
    fecha_inicio = fechaInicioColegiaturas;
    fecha_fin = fechaFinColegiaturas;
    tipo_id = 1;
    factura = `00${numero}`;
    visible = 0;
    // let matricula = matricula;
    // VARIABLES COLEGIATURA N
  
    // INSERCION COLEGIATURA N
    insertarPago(monto_adeudo, monto_original, folio, concepto, responsable, fecha_inicio, fecha_fin, tipo_id, factura, visible, matricula);
    // FIN INSERCION COLEGIATURA N
  
    // console.log( (i+3),"-cole",(i+3),"--- inicio: ",fechaInicioColegiaturas,"-- fin: ",fechaFinColegiaturas );
  }
  
}

const insertarPago = async (monto_adeudo, monto_original, folio, concepto, responsable, fecha_inicio, fecha_fin, tipo_id, factura, visible, matricula) => {
  try {
    const [rows] = await pool.query(
      "INSERT INTO pagos(monto_adeudo, monto_original, folio, concepto, responsable, fecha_inicio, fecha_fin, tipo_id, factura, visible, matricula) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [monto_adeudo, monto_original, folio, concepto, responsable, formatearFecha(fecha_inicio), formatearFecha(fecha_fin), tipo_id, factura, visible, matricula]
    );
    
  } catch (error) {
    // Manejo del error
    console.error("Error al insertar el pago:", error);
  }
};

export const fechaMesAnnio = (dateString) => {
  const date = new Date(dateString);

  // JavaScript cuenta los meses del 0 al 11, por eso se suma 1
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear()).slice(-2);

  return `${month}/${year}`;
};

export const esFechaVigente = (dateString) => {
  const fechaObjetivo = new Date(dateString);
  const fechaActual = new Date();

  // Poner la hora, minuto, segundo y milisegundo a 0 para comparar solo la fecha
  fechaActual.setHours(0, 0, 0, 0);
  fechaObjetivo.setHours(0, 0, 0, 0);

  return fechaObjetivo >= fechaActual;
};