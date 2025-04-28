const Module = require("module");
const Envios = require("../controller/envios/clase-envios");
const EnviosCobranza = require("../controller/envios/Clase-envios_cobranza");
const EnviosDireccionesDestino = require("../controller/envios/clase-envios_direcciones_destino");
const EnviosItems = require("../controller/envios/clase-envios_items");
const EnviosLogisticaInversa = require("../controller/envios/clase-envios_logisticainversa");
const EnviosObservaciones = require("../controller/envios/clase-envios_observaciones");
const EnviosDireccionesRemitente = require("../controller/envios/clase-envios_remitente");
const EnviosFlex = require("../controller/envios/clase-enviosflex");
const Ordenes = require("../controller/ordenes/claseordenes");
const { logYellow, logGreen, logPurple, logBlue } = require("../fuctions/logsCustom");
const { error } = require("console");
const sendToShipmentStateMicroService = require("../fuctions/sendToshipmentStateMicroservice");
const { json } = require("stream/consumers");





async function AltaEnvio(company, connection, data) {
    try {
        if (!data.data || !data.data.enviosDireccionesDestino || 
            !data.data.enviosDireccionesDestino.calle || 
         
            !data.data.enviosDireccionesDestino.cp 
         ) {
            
           return false
            }
        
            
        

        const email = data.data.destination_receiver_email;
        delete data.data.destination_receiver_email;
        console.log("Todos los campos son válidos.");
        
        if (email) {
            data.data.destination_receiver_email = email;
        }

        try {
            let insertId;

            if (data.data.flex === 1) {
                const envioflex = new EnviosFlex(
                    data.data.did,
                    data.data.ml_shipment_id,
                    data.data.ml_vendedor_id,
                    data.data.ml_qr_seguridad,
                    data.data.didCliente,
                    data.data.didCuenta,
                    data.data.elim,
                    company.did,
                    connection,
                    data.data.estado_envio || 0 ,
                );

                const resultado = await envioflex.insert();
                insertId = resultado.did;
                console.log("Registro insertado con ID:", insertId);
            } else {
                // Solo insertar en ordenes si fulfillment es 0
                if (data.data.fullfillment === 1) {
                    const orden = new Ordenes({
                        did: data.data.did || 0,
                        didEnvio: insertId,
                        didCliente: data.data.didCliente,
                        didCuenta: data.data.didCuenta,
                        status: "Pendiente",
                        flex: data.data.flex,
                        number: `ORD-${new Date().getTime()}`,
                        observaciones: data.data.observaciones || "",
                        armado: 0,
                        descargado: 0,
                        fecha_armado: null,
                        quien_armado: "2",
                        idEmpresa: company.did,
                        connection: connection
                    });
              
                    logYellow(`${JSON.stringify(orden)} insertando orden`);
                    const resultadoOrden = await orden.insert();
                }

                // Establecer elim en 52 si fulfillment es 0
                if (data.data.fullfillment === 1) {
                    data.data.elim = 52; // Modificar el campo elim
                }

                const envio = new Envios(data.data, company, connection);
                const resultado = await envio.insert();
                insertId = resultado.did;
                console.log(envio, "envio");
                console.log(data.data, "data"); 
                
                
     
                logGreen(`Registro insertado con did: ${insertId}`);

                // Validación y creación de EnviosCobranza
                if (data.data.envioscobranza) {
                    const cobranza = new EnviosCobranza(
                        insertId,
                        data.data.envioscobranza.didCampoCobranza,
                        data.data.envioscobranza.valor,
                        data.data.envioscobranza.quien,
                        0,
                        company,
                        connection
                    );
                    await cobranza.insert();
                }

                // Validación y creación de EnviosLogisticaInversa
                if (data.data.enviosLogisticaInversa) {
                    const logisticaInversa = new EnviosLogisticaInversa(
                        insertId,
                        data.data.enviosLogisticaInversa.didCampoLogistica,
                        data.data.enviosLogisticaInversa.valor,
                        data.data.enviosLogisticaInversa.quien,
                        company,
                        connection
                    );
                    await logisticaInversa.insert();
                }

                // Validación y creación de EnviosObservaciones
                if (data.data.enviosObservaciones) {
                    const observacionDefault = data.data.enviosObservaciones.observacion || "";

                    const observaciones = new EnviosObservaciones(
                        insertId,
                        observacionDefault,
                        data.data.enviosObservaciones.quien,
                        data.data.enviosObservaciones.desde,
                        company,
                        connection
                    );
                    await observaciones.insert();
                }

                // Validación y creación de EnviosDireccionesDestino
                if (data.data.enviosDireccionesDestino) {
                    const direccionDestino = new EnviosDireccionesDestino(
                        data.data.enviosDireccionesDestino.did,
                        insertId,
                        data.data.enviosDireccionesDestino.calle,
                        data.data.enviosDireccionesDestino.numero,
                        data.data.enviosDireccionesDestino.address_line || `${data.data.enviosDireccionesDestino.calle} ${data.data.enviosDireccionesDestino.numero}`,
                        data.data.enviosDireccionesDestino.cp,
                        data.data.enviosDireccionesDestino.ciudad,
                        data.data.enviosDireccionesDestino.localidad,
                        data.data.enviosDireccionesDestino.provincia,
                        data.data.enviosDireccionesDestino.pais || "Argentina",
                        data.data.enviosDireccionesDestino.latitud,
                        data.data.enviosDireccionesDestino.longitud,
                        data.data.enviosDireccionesDestino.quien,
                        company,
                        data.data.enviosDireccionesDestino.destination_comments,
                        data.data.enviosDireccionesDestino.delivery_preference,
                        data.data.enviosDireccionesDestino.conHorario,
                        data.data.enviosDireccionesDestino.prioridad,
                        connection
                    );
                    await direccionDestino.insert();
                }

                // Validación y creación de EnviosDireccionesRemitente
                if (data.data.enviosDireccionesRemitente) {
                    const direccionRemitente = new EnviosDireccionesRemitente(
                        data.data.enviosDireccionesRemitente.did,
                        insertId,
                        data.data.enviosDireccionesRemitente.calle,
                        data.data.enviosDireccionesRemitente.numero,
                        data.data.enviosDireccionesRemitente.calle + data.data.enviosDireccionesRemitente.numero,
                        data.data.enviosDireccionesRemitente.cp,
                        data.data.enviosDireccionesRemitente.localidad,
                        data.data.enviosDireccionesRemitente.provincia,
                        data.data.enviosDireccionesRemitente.pais || "Argentina",
                        data.data.enviosDireccionesRemitente.latitud,
                        data.data.enviosDireccionesRemitente.longitud,
                        data.data.enviosDireccionesRemitente.obs || 'observaciones light data',
                        data.data.enviosDireccionesRemitente.quien,
                        company,
                        connection
                    );
                    await direccionRemitente.insert();
                }

                // Validación y creación de EnviosItems
                if (data.data.enviosItems) {
                    const enviosItems = new EnviosItems(
                        insertId,
                        data.data.enviosItems.codigo,
                        data.data.enviosItems.imagen,
                        data.data.enviosItems.descripcion,
                        data.data.enviosItems.ml_id,
                        data.data.enviosItems.dimensions,
                        data.data.enviosItems.cantidad,
                        data.data.enviosItems.variacion,
                        data.data.enviosItems.seller_sku,
                        data.data.enviosItems.descargado,
                        data.data.enviosItems.autofecha,
                        data.data.enviosItems.superado,
                        data.data.enviosItems.elim,
                        company,
                        connection
                    );
                    await enviosItems.insert(); // Asegúrate de que `insert()` esté definido en EnviosItems
                }

           let respuesta= await sendToShipmentStateMicroService(company.did, data.data.quien, insertId,data.data.estado);
           console.log(respuesta,"respuesta");
           
                logPurple("FINAL");
                return {
                    success: true,
                    insertId: insertId}
            }

         
        } catch (error) {
            
            console.error("Error durante la inserción:", error);
          return false
        }
    } catch (error) {
        console.error("Error en la función principal:", error);
        return false
    }
}

module.exports = {
    AltaEnvio
};
