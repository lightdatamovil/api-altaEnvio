const { getConnection, getFromRedis } = require('../../dbconfig');
const { logYellow, logBlue } = require('../../fuctions/logsCustom');

class enviosPackRemitente {
  constructor(didEnvio, remitente, telefono, email, provincia, localidad, domicilio, cp, idempresa) {
    this.didEnvio = didEnvio;
    this.remitente = remitente;
    this.telefono = telefono;
    this.email = email;
    this.provincia = provincia;
    this.localidad = localidad;
    this.domicilio = domicilio;
    this.cp = cp;
    this.idempresa = String(idempresa); // Asegurarse de que idempresa siempre sea un string
  }

  toJson() {
    return JSON.stringify(this);
  }

  async insert() {
    const redisKey = 'empresasData'; // La clave en Redis que contiene todas las empresas
    console.log("Buscando clave de Redis:", redisKey);

    try {
        // Obtener todas las empresas desde Redis
        const empresasDataJson = await getFromRedis(redisKey);
        const empresasDB = empresasDataJson;

        // Verificar si la empresa en la posición idempresa existe
        const empresa = empresasDB ? empresasDB[this.idempresa] : null;

        if (!empresa) {
            throw new Error(`Configuración no encontrada en Redis para empresa con ID: ${this.idempresa}`);
        }

        console.log("Configuración de la empresa encontrada:", empresa);

        // Obtener la conexión
        const connection = await getConnection(this.idempresa);

        if (this.didEnvio === 0) {
            // Si `didEnvio` es 0, simplemente crear un nuevo registro
            return this.createNewRecord(connection);
        } else {
            // Si `didEnvio` no es 0, verificar si ya existe y manejarlo
            return this.checkAndUpdateDidEnvio(connection);
        }
    } catch (error) {
        console.error("Error en el método insert:", error.message);

        // Lanzar un error con el formato estándar
        throw {
            status: 500,
            response: {
                estado: false,
                message: 'Hubo un error al procesar el registro.',
                error: -1,
                detalle: error.message, // Mensaje técnico para depuración
            },
        };
    }
}


  checkAndUpdateDidEnvio(connection) {
    const checkDidEnvioQuery = 'SELECT id FROM enviospack_remitente WHERE didEnvio = ?';
    return new Promise((resolve, reject) => {
      connection.query(checkDidEnvioQuery, [this.didEnvio], (err, results) => {
        if (err) {
          return reject(err);
        }

        if (results.length > 0) {
          // Si `didEnvio` ya existe, marcarlo como `superado = 1`
          const updateSuperadoQuery = 'UPDATE enviospack_remitente SET superado = 1 WHERE didEnvio = ?';
          connection.query(updateSuperadoQuery, [this.didEnvio], (updateErr) => {
            if (updateErr) {
              return reject(updateErr);
            }

            // Crear un nuevo registro con el mismo `didEnvio`
            this.createNewRecord(connection, resolve, reject);
          });
        } else {
          // Si `didEnvio` no existe, crear un nuevo registro directamente
          this.createNewRecord(connection, resolve, reject);
        }
      });
    });
  }

  createNewRecord(connection, resolve, reject) {
    const columnsQuery = 'DESCRIBE enviospack_remitente';

    connection.query(columnsQuery, (err, results) => {
      if (err) {
        return reject(err);
      }

      const tableColumns = results.map((column) => column.Field);
      const filteredColumns = tableColumns.filter((column) => this[column] !== undefined);

      const values = filteredColumns.map((column) => this[column]);
      const insertQuery = `INSERT INTO enviospack_remitente (${filteredColumns.join(', ')}) VALUES (${filteredColumns.map(() => '?').join(', ')})`;
      logYellow("Insert Query", insertQuery)
      logBlue("Values:", values)
      connection.query(insertQuery, values, (err, results) => {
        if (err) {
          return reject(err);
        }

        const insertId = results.insertId;
      

        resolve({ insertId: insertId });
      });
    });
  }
}

module.exports = enviosPackRemitente;
