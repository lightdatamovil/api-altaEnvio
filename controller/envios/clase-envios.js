const { getConnection, getFromRedis, executeQuery } = require('../../dbconfig');
const { logYellow, logBlue } = require('../../fuctions/logsCustom');

class Envios {
    constructor(data,company = null,connection = null) {
        const {
            did = 0,
            didDeposito = 1,
            gtoken = this.generateGToken(),
            flex = 0,
            turbo = 0,
            exterior = 0,
           
            fecha_inicio = new Date(),
            fechaunix = this.generateFechaUnix(),
            lote = "",
            ml_shipment_id = "",
            ml_vendedor_id = "",
            ml_venta_id = "",
            ml_pack_id = "-",
            ml_qr_seguridad = "",
            didCliente = 0,
            didCuenta,
            didServicio = 1,
            didSucursalDistribucion = 1,
            peso = "",
            volumen = "",
            bultos = 1,
            valor_declarado = "",
            monto_total_a_cobrar = "",
            tracking_method = "",
            tracking_number = "",
            fecha_venta = "",
            destination_receiver_name = " ",
            destination_receiver_phone = "",
            destination_receiver_email = "",
            destination_comments = "   ",
            delivery_preference = " ",
            quien,
            elim = 0, // Cambiado a 0 para ser modificado más adelante
        } = data;

        // Asignar valores

        this.did = did;
        this.didDeposito = didDeposito;
        this.gtoken = gtoken;
        this.flex = flex;
        this.turbo = turbo;
        this.exterior = exterior;
        fecha_inicio.setHours(fecha_inicio.getHours() - 3);
        this.fecha_inicio = fecha_inicio.toISOString();
    
        this.fechaunix = fechaunix;
        this.lote = lote;
        this.ml_shipment_id = ml_shipment_id;
        this.ml_vendedor_id = ml_vendedor_id;
        this.ml_venta_id = ml_venta_id;
        this.ml_pack_id = ml_pack_id;
        this.ml_qr_seguridad = ml_qr_seguridad;
        this.didCliente = didCliente;
        this.didCuenta = didCuenta;
        this.didServicio = didServicio;
        this.didSucursalDistribucion = didSucursalDistribucion;
        this.peso = peso;
        this.volumen = volumen;
        this.bultos = bultos;
        this.valor_declarado = valor_declarado;
        this.monto_total_a_cobrar = monto_total_a_cobrar;
        this.tracking_method = tracking_method;
        this.tracking_number = tracking_number;
        this.fecha_venta = fecha_venta;
        this.destination_receiver_name = destination_receiver_name;
        this.destination_receiver_phone = destination_receiver_phone;
        this.destination_receiver_email = destination_receiver_email;
        this.destination_comments = destination_comments;
        this.delivery_preference = delivery_preference;
        this.quien = quien;
        this.elim = elim; // Asignar aquí
        this.company = company;
        this.connection = connection
     
        
    }

    generateGToken() {
        return Math.random().toString(36).substring(2);
    }

    generateFechaUnix() {
        return Math.floor(Date.now() / 1000);
    }

    async insert() {
        
        try {
          
            
        
         

          


            // Establecer elim en 52 si es necesario
            if (this.elim === "") {
                this.elim = 52; // Cambiar a 52 si elim está vacío
            }

            if (this.did === 0 || this.did === '0') {
                return this.createNewRecordWithIdUpdate(this.connection);
            } else {
                return this.checkAndUpdateDid(this.connection);
            }
        } catch (error) {
            console.error("Error en insert:", error.message);
            throw {
                status: 500,
                response: {
                    estado: false,
                    error: -1,
                },
            };
        }
    }

    async checkAndUpdateDid(connection) {
        const query = 'SELECT id FROM envios WHERE did = ?';
        try {
            const results = await executeQuery(connection, query, [this.did]);
            if (results.length > 0) {
                const updateQuery = 'UPDATE envios SET superado = 1 WHERE did = ?';
                await executeQuery(connection, updateQuery, [this.did]);
            }
            return this.createNewRecord(connection, this.did);
        } catch (error) {
            throw error;
        }
    }
    
    async createNewRecordWithIdUpdate(connection) {
        try {
            const describeQuery = 'DESCRIBE envios';
            const results = await executeQuery(connection, describeQuery, []);
    
            const columns = results.map((col) => col.Field);
            const filteredColumns = columns.filter((col) => this[col] !== undefined);
            const values = filteredColumns.map((col) => this[col]);
    
            const insertQuery = `INSERT INTO envios (${filteredColumns.join(', ')}) VALUES (${filteredColumns.map(() => '?').join(', ')})`;

                    logYellow(`Insert Query: ${JSON.stringify(insertQuery)}`);
        logBlue(`Values: ${JSON.stringify(values)}`);
    
            const result = await executeQuery(connection, insertQuery, values);
            const insertId = result.insertId;
    
            const updateQuery = 'UPDATE envios SET did = ? WHERE id = ?';
            await executeQuery(connection, updateQuery, [insertId, insertId]);
    
            return { insertId, did: insertId };
        } catch (error) {
            throw error;
        }
    }
    
    async createNewRecord(connection, did) {
        try {
            const describeQuery = 'DESCRIBE envios';
            const results = await executeQuery(connection, describeQuery, []);
    
            const columns = results.map((col) => col.Field);
            const filteredColumns = columns.filter((col) => this[col] !== undefined);
            const values = filteredColumns.map((col) => this[col]);
    
            const insertQuery = `INSERT INTO envios (${filteredColumns.join(', ')}) VALUES (${filteredColumns.map(() => '?').join(', ')})`;
            const result = await executeQuery(connection, insertQuery, values,true);
                   logYellow(`Insert Query: ${JSON.stringify(insertQuery)}`);
        logBlue(`Values: ${JSON.stringify(values)}`);
    
            const insertId = result.insertId;
            if (did === 0 || did === '0') {
                const updateQuery = 'UPDATE envios SET did = ? WHERE id = ?';
                await executeQuery(connection, updateQuery, [insertId, insertId]);
                return { insertId, did: insertId };
            } else {
                return { insertId, did };
            }
        } catch (error) {
            throw error;
        }
    }
    
}

module.exports = Envios;
