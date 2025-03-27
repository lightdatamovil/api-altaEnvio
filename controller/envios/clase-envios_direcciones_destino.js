const { getConnection, getFromRedis, executeQuery } = require('../../dbconfig');
const { logYellow, logBlue } = require('../../fuctions/logsCustom');

// Clase EnviosDireccionesDestino
class EnviosDireccionesDestino {
  constructor(did = "", didEnvio, calle = null, numero = null, address_line = null, cp = null,ciudad = "", localidad = "", provincia = "", pais = "", latitud = "", longitud = "", 
    quien = null, company = null,destination_comments="",delivery_preference="",conHorario="",prioridad="",connection = null) {

    
    this.did = did;
    this.didEnvio = didEnvio;
    this.calle = calle;
    this.numero = numero;
    this.address_line = calle+numero; // Asegúrate de que 'calle' sea un objeto con 'numero'
    this.cp = cp;
    this.ciudad = ciudad;
    this.localidad = localidad;
    this.provincia = provincia;
    this.pais = pais;
    this.latitud = latitud;
    this.longitud = longitud;
    this.company = company; // Asegurarse de que idEmpresa sea siempre un string
    this.quien = quien || 0;
    this.destination_comments=destination_comments;
    this.delivery_preference=delivery_preference;
    this.conHorario=conHorario;
    this.prioridad=prioridad;
    this.connection = connection

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
        const checkDidEnvioQuery = 'SELECT id FROM envios_direcciones_destino WHERE didEnvio = ?';
   
      
        
        const results = await executeQuery(connection, checkDidEnvioQuery, [this.didEnvio],true);

        if (results.length > 0) {
            // Si `didEnvio` ya existe, actualizarlo
            const updateQuery = 'UPDATE envios_direcciones_destino SET superado = 1 WHERE didEnvio = ?';
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
        const columnsQuery = 'DESCRIBE envios_direcciones_destino';
        const results = await executeQuery(connection, columnsQuery, []);

        const tableColumns = results.map((column) => column.Field);
        const filteredColumns = tableColumns.filter((column) => this[column] !== undefined);

        const values = filteredColumns.map((column) => this[column]);
        const insertQuery = `INSERT INTO envios_direcciones_destino (${filteredColumns.join(', ')}) VALUES (${filteredColumns.map(() => '?').join(', ')})`;

       // logYellow(`Insert Query: ${JSON.stringify(insertQuery)}`);
        //logBlue(`Values: ${JSON.stringify(values)}`);

        const insertResult = await executeQuery(connection, insertQuery, values);
        return { insertId: insertResult.insertId };
    } catch (error) {
        throw error;
    }
}

}

module.exports = EnviosDireccionesDestino;
