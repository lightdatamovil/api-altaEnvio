const { getConnection, getFromRedis, executeQuery } = require('../../dbconfig');
const { logYellow, logBlue } = require('../../fuctions/logsCustom');

class EnviosFlex {
  constructor(did,
    ml_shipment_id, ml_vendedor_id, ml_qr_seguridad, didCliente,
    didCuenta, elim, idEmpresa,connection=null,estado_envio=0,exterior=0,flex=1,fecha_inicio = new Date()
  ) {
    this.did=did ?? 0
    this.ml_shipment_id = ml_shipment_id;
    this.ml_vendedor_id = ml_vendedor_id;
    this.ml_qr_seguridad = ml_qr_seguridad;
    this.didCliente = didCliente;
    this.didCuenta = didCuenta;
    this.elim = elim || 0;
    this.idEmpresa = idEmpresa;
    this.connection = connection;
    this.estado_envio=estado_envio;
    this.exterior=exterior;
    this.flex=flex;
    fecha_inicio.setHours(fecha_inicio.getHours() - 3);
    this.fecha_inicio = fecha_inicio.toISOString();
  }

  toJSON() {
    return JSON.stringify(this);
  }

  async insert() {
    try {
        if (this.did === 0 || this.did === '0') {
            return this.createNewRecordWithIdUpdate(this.connection);
        } else {
            return this.checkAndUpdateShipmentId(this.connection);
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

async checkAndUpdateShipmentId(connection) {
    try {
        const query = 'SELECT did FROM envios WHERE did = ?';
        console.log(this.did, query, "DSAD");

        const results = await executeQuery(connection, query, [this.did]);
        console.log(results);

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
        const { insertId } = await this.createNewRecord(connection, 0);

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

        const tableColumns = results.map((column) => column.Field);
        const filteredColumns = tableColumns.filter((column) => this[column] !== undefined);
        const values = filteredColumns.map((column) => this[column]);

        const insertQuery = `INSERT INTO envios (${filteredColumns.join(', ')}) VALUES (${filteredColumns.map(() => '?').join(', ')})`;
        logYellow(`Insert Query: ${JSON.stringify(insertQuery)}`);
        logBlue(`Values: ${JSON.stringify(values)}`);

        const insertResult = await executeQuery(connection, insertQuery, values);
        const insertId = insertResult.insertId;

        return { insertId, did: did || insertId };
    } catch (error) {
        throw error;
    }
}

// Función auxiliar para ejecutar consultas SQL con Promesas


}

module.exports = EnviosFlex;
