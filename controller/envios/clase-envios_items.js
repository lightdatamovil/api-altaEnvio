const { getConnection, getFromRedis, executeQuery } = require('../../dbconfig');
const { logYellow, logBlue } = require('../../fuctions/logsCustom');

class EnviosItems {
  constructor(didEnvio = "", codigo = "", imagen = "", descripcion = "", ml_id = "", dimensions = "", cantidad = "",
      variacion = "", seller_sku = "", descargado = "", autofecha = "", superado = "", elim = null, company = null,connection = null) {

      this.didEnvio = didEnvio;
      this.codigo = codigo;
      this.imagen = imagen;
      this.descripcion = descripcion;
      this.ml_id = ml_id;
      this.dimensions = dimensions;
      this.cantidad = cantidad;
      this.variacion = variacion;
      this.seller_sku = seller_sku;
      this.descargado = descargado;
      this.autofecha = new Date().toISOString();
      this.superado = superado;

      this.elim = elim || 0;
      this.company = company; 
      this.connection = connection
      // Asegurarse de que idEmpresa sea siempre un string
  }

  toJSON() {
    return JSON.stringify(this);
  }

  async insert() {
    try {
        if (this.didEnvio === "") {
            // Si `didEnvio` está vacío, crear un nuevo registro
            return this.createNewRecord(this.connection);
        } else {
            // Si `didEnvio` no está vacío, verificar si ya existe y manejarlo
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
        const checkDidEnvioQuery = 'SELECT id FROM envios_items WHERE didEnvio = ?';
        const results = await executeQuery(connection, checkDidEnvioQuery, [this.didEnvio]);

        if (results.length > 0) {
            // Si `didEnvio` ya existe, actualizarlo
            const updateQuery = 'UPDATE envios_items SET superado = 1 WHERE didEnvio = ?';
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
        const columnsQuery = 'DESCRIBE envios_items';
        const results = await executeQuery(connection, columnsQuery, []);

        const tableColumns = results.map((column) => column.Field);
        const filteredColumns = tableColumns.filter((column) => this[column] !== undefined);

        const values = filteredColumns.map((column) => this[column]);
        const insertQuery = `INSERT INTO envios_items (${filteredColumns.join(', ')}) VALUES (${filteredColumns.map(() => '?').join(', ')})`;

        logYellow("Insert Query", insertQuery);
        logBlue("Values:", values);

        const insertResult = await executeQuery(connection, insertQuery, values);
        return { insertId: insertResult.insertId };
    } catch (error) {
        throw error;
    }
}

}

module.exports = EnviosItems;
