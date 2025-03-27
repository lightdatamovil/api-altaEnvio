const { getConnection, getFromRedis, executeQuery } = require('../../dbconfig');
const { logYellow, logBlue } = require('../../fuctions/logsCustom');

// Clase EnviosDireccionesRemitente
class EnviosDireccionesRemitente {
  constructor(did = "", didEnvio = "", calle = "", numero = "", address_line = "", cp = "", localidad = "", provincia = "", pais = "", latitud = "", 
    longitud = "", obs = "", quien = "", company = "",connection = null) {
    this.did = did;
    this.didEnvio = didEnvio;
    this.calle = calle;
    this.numero = numero;
    this.address_line = address_line || `${calle} ${numero}`; // Si no se pasa address_line, se genera a partir de calle y numero
    this.cp = cp;

    this.localidad = localidad;
    this.provincia = provincia;
    this.pais = pais;
    this.latitud = latitud;
    this.longitud = longitud;
    this.obs = obs;
    this.quien = quien;
    this.autofecha = new Date().toISOString().slice(0, 19).replace('T', ' '); // Asignando la fecha y hora actual
    this.company = company; 
    this.connection = connection // Asegurándose de que idEmpresa sea siempre un string
  }

  // Método para convertir a JSON
  toJSON() {
    return JSON.stringify(this);
  }

  // Método para insertar en la base de datos
  async insert() {
    try {
        if (this.didEnvio === null) {
            // Si `didEnvio` es null, crear un nuevo registro
            return this.createNewRecord(this.connection);
        } else {
            // Si `didEnvio` no es null, verificar si ya existe y manejarlo
            return this.checkAndUpdateDidEnvio(this.connection);
        }
    } catch (error) {
        console.error("Error en el método insert:", error.message);

        // Lanzar un error con el formato estándar
        throw {
            status: 500,
            response: {
                estado: false,
                error: -1,
            },
        };
    }
}

async checkAndUpdateDidEnvio(connection) {
    try {
        const checkDidEnvioQuery = 'SELECT id FROM envios_direcciones_remitente WHERE didEnvio = ?';
        const results = await executeQuery(connection, checkDidEnvioQuery, [this.didEnvio]);

        if (results.length > 0) {
            // Si `didEnvio` ya existe, actualizarlo
            const updateQuery = 'UPDATE envios_direcciones_remitente SET superado = 1 WHERE didEnvio = ?';
            await executeQuery(connection, updateQuery, [this.didEnvio]);

            // Crear un nuevo registro con el mismo `didEnvio`
            return this.createNewRecord(connection);
        } else {
            // Si `didEnvio` no existe, crear un nuevo registro directamente
            return this.createNewRecord(connection);
        }
    } catch (error) {
        throw error;
    }
}

async createNewRecord(connection) {
    try {
        const columnsQuery = 'DESCRIBE envios_direcciones_remitente';
        const results = await executeQuery(connection, columnsQuery, []);

        const tableColumns = results.map((column) => column.Field);
        const filteredColumns = tableColumns.filter((column) => this[column] !== undefined);

        const values = filteredColumns.map((column) => this[column]);
        const insertQuery = `INSERT INTO envios_direcciones_remitente (${filteredColumns.join(', ')}) VALUES (${filteredColumns.map(() => '?').join(', ')})`;


        const insertResult = await executeQuery(connection, insertQuery, values);
        return { insertId: insertResult.insertId };
    } catch (error) {
        throw error;
    }
}



}

module.exports = EnviosDireccionesRemitente;
