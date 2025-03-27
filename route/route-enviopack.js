const express=require("express");   
const enviospack=express.Router();
const Enviospack=require("../controller/enviospack/clase-enviospack")
const enviospackDestinatario=require("../controller/enviospack/clase-enviospack_destinario")
const enviospackRemitente=require("../controller/enviospack/clase-enviospack_remitente")
const validateToken = require('../middleware/token'); //
const { redisClient,getConnection } = require('../dbconfig');




const validateData=require("../middleware/middleware")




enviospack.post("/flujoenviospack", async (req, res) => {
    const data = req.body;
  

    try {
        const empresasDataJson = await redisClient.get('empresasData');
        const empresasDB = JSON.parse(empresasDataJson); // Parsear el JSON
     
        


        // Verificar si la empresa con id 4 existe
        const empresaId = data.idempresa.toString(); // El ID de la empresa que quieres buscar
        const empresa = empresasDB[empresaId]; // Acceder directamente a la empresa con el id

        if (!empresa) {
            return res.status(404).send({
                success: false,
                message: 'Hubo un error al procesar el registro.',
                error: -2
            });
        }

        // Validar datos requeridos del destinatario
        const { provincia, domicilio, localidad } = data.data.destinatario || {};
        if (!provincia || !domicilio || !localidad) {
            return res.status(400).send({
                success: false,

                error: -1
            });
            
        }

        console.log("Empresa encontrada:", empresa);
        const enviosPack = new Enviospack(
            data.data.did,
            data.data.fecha,
            data.data.observacion,
            data.data.condventa,
            data.quien,
            data.idempresa
        );

        const resultado = await enviosPack.insert();
        const insertId = resultado.did;
        console.log("Este es el insert id :", insertId);

        console.log(enviosPack);

        if (data.data.destinatario) {
            const enviospackdestinatario = new enviospackDestinatario(
                insertId,
                data.data.destinatario.destinatario,
                data.data.destinatario.cuil,
                data.data.destinatario.telefono,
                data.data.destinatario.email,
                data.data.destinatario.provincia,
                data.data.destinatario.localidad,
                data.data.destinatario.domicilio,
                data.data.destinatario.cp,
                data.data.destinatario.observacion,
                data.idempresa
            );

            await enviospackdestinatario.insert();
        }

        if (data.data.remitente) {
            const enviospackremitente = new enviospackRemitente(
                insertId,
                data.data.remitente.remitente,
                data.data.remitente.telefono,
                data.data.remitente.email,
                data.data.remitente.provincia,
                data.data.remitente.localidad,
                data.data.remitente.domicilio,
                data.data.remitente.cp,
                data.idempresa
            );

            await enviospackremitente.insert();
        }

        return res.status(200).send({
            estado: true,
            didEnvio: insertId
        });
    } catch (error) {
        console.error("Error durante la inserción:", error);
        return res.status(500).send({
            estado: false,
            error: -1
        });
    }
});



enviospack.post("/api2/filtrarEnviospack", async (req, res) => {
    const { provincia, localidad, destinatario, remitente, fechaDesde, fechaHasta, idempresa, page = 1 } = req.body;

    
    const allowedLimits = [15,15, 50, 100, 200, 'all'];
    const resultsLimit = allowedLimits.includes(limit) ? limit : 15;

    try {
       
        const connection = await getConnection(idempresa);

        
        let query = `
            SELECT e.*, r.*, d.*
            FROM enviospack e
            LEFT JOIN enviospack_remitente r ON e.did = r.didEnvio
            LEFT JOIN enviospack_destinatario d ON e.did = d.didEnvio
            WHERE 1=1
        `;
        const params = [];

        if (provincia) {
            query += ' AND (r.provincia = ? OR d.provincia = ?)';
            params.push(provincia);
            params.push(provincia);
        }
        if (localidad) {
            query += ' AND (r.localidad = ? OR d.localidad = ?)';
            params.push(localidad);
            params.push(localidad);
        }
        if (destinatario) {
            query += ' AND d.destinatario LIKE ?';
            params.push(`%${destinatario}%`);
        }
        if (remitente) {
            query += ' AND r.quien LIKE ?';
            params.push(`%${remitente}%`);
        }
        if (fechaDesde) {
            query += ' AND e.fecha >= ?';
            params.push(fechaDesde);
        }
        if (fechaHasta) {
            query += ' AND e.fecha <= ?';
            params.push(fechaHasta);
        }

        // Añadir cláusula LIMIT y OFFSET para la paginación
        if (resultsLimit !== 'all') {
            query += ' LIMIT ? OFFSET ?';
            params.push(resultsLimit, (page - 1) * resultsLimit);
        }

        // Ejecutar la consulta en la base de datos
        connection.query(query, params, (error, resultados) => {
            if (error) {
                console.error("Error durante el filtrado:", error);
                return res.status(500).send({
                    success: false,
                    error: -1
                });
            }

            return res.status(200).send({
                success: true,
                data: resultados
            });
        });

        // Cerrar la conexión
        connection.end();
    } catch (error) {
        console.error("Error durante el filtrado:", error);
        return res.status(500).send({
            success: false,
            error: -1
        });
    }
});


enviospack.post("/api2/eliminados", async (req, res) => {
    const { provincia, localidad, destinatario, remitente, fechaDesde, fechaHasta, idempresa, page = 1, limit = 15 } = req.body;

    const allowedLimits = [15, 15, 50, 100, 200, 'all'];
    const resultsLimit = allowedLimits.includes(limit) ? limit : 15;

    try {
        const connection = await getConnection(idempresa);

        // Consulta SQL con filtros de 'elim = 1' en las tres tablas
        let query = `
            SELECT e.*, r.*, d.*
            FROM enviospack e
            LEFT JOIN enviospack_remitente r ON e.did = r.didEnvio
            LEFT JOIN enviospack_destinatario d ON e.did = d.didEnvio
            WHERE (e.elim = 1 OR r.elim = 1 OR d.elim = 1)  
        `;
        const params = [];

        if (provincia) {
            query += ' AND (r.provincia = ? OR d.provincia = ?)';
            params.push(provincia);
            params.push(provincia);
        }
        if (localidad) {
            query += ' AND (r.localidad = ? OR d.localidad = ?)';
            params.push(localidad);
            params.push(localidad);
        }
        if (destinatario) {
            query += ' AND d.destinatario LIKE ?';
            params.push(`%${destinatario}%`);
        }
        if (remitente) {
            query += ' AND r.quien LIKE ?';
            params.push(`%${remitente}%`);
        }
        if (fechaDesde) {
            query += ' AND e.fecha >= ?';
            params.push(fechaDesde);
        }
        if (fechaHasta) {
            query += ' AND e.fecha <= ?';
            params.push(fechaHasta);
        }

        // Añadir cláusula LIMIT y OFFSET para la paginación
        if (resultsLimit !== 'all') {
            query += ' LIMIT ? OFFSET ?';
            params.push(resultsLimit, (page - 1) * resultsLimit);
        }

        // Ejecutar la consulta en la base de datos
        connection.query(query, params, (error, resultados) => {
            if (error) {
                console.error("Error durante el filtrado:", error);
                return res.status(500).send({
                    success: false,
                    error: -1
                });
            }

            return res.status(200).send({
                success: true,
                data: resultados
            });
        });

        // Cerrar la conexión
        connection.end();
    } catch (error) {
        console.error("Error durante el filtrado:", error);
        return res.status(500).send({
            success: false,
            error: -1
        });
    }
});


enviospack.post("/api2/cambiarEliminados", async (req, res) => {
    const { did, idempresa } = req.body;  // did es el identificador del envio a actualizar

    let connection; // Inicializa la variable de conexión aquí

    try {
        // Conexión a la base de datos
        connection = await getConnection(idempresa);

        // Iniciar una transacción
        await connection.beginTransaction();

        // Actualizar 'elim' de 1 a 0 en la tabla 'enviospack' donde did coincida
        let query = `UPDATE enviospack SET elim = 0 WHERE did = ? AND elim = 1`;
        await connection.query(query, [did]);

        // Actualizar 'elim' de 1 a 0 en la tabla 'enviospack_remitente' donde didEnvio coincida
        query = `UPDATE enviospack_remitente SET elim = 0 WHERE didEnvio = ? AND elim = 1`;
        await connection.query(query, [did]);

        // Actualizar 'elim' de 1 a 0 en la tabla 'enviospack_destinatario' donde didEnvio coincida
        query = `UPDATE enviospack_destinatario SET elim = 0 WHERE didEnvio = ? AND elim = 1`;
        await connection.query(query, [did]);

        // Commit de la transacción
        await connection.commit();

        // Respuesta exitosa
        return res.status(200).send({
            success: true,
            message: 'Los registros fueron actualizados correctamente.'
        });
    } 
    catch (error) {
        // Si ocurre un error, hacemos rollback de la transacción
        if (connection) {
            await connection.rollback();
        }

        console.error("Error al actualizar los registros:", error);
        return res.status(500).send({
            success: false,
            message: 'Error al actualizar los registros.',
            error: error.message
        });
    } 
    finally {
        // Asegurarse de cerrar la conexión, sin importar si hubo éxito o error
        if (connection) {
            await connection.end(); // Cerrar la conexión al final
        }
    }
});





module.exports = enviospack;
