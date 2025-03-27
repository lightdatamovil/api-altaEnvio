const { getConnection, getFromRedis } = require('../../dbconfig');
const { logYellow, logBlue } = require('../../fuctions/logsCustom');

class Enviospack {
  constructor(did, fecha, observacion, condventa, quien, idempresa) {
    this.did = did;
    this.fecha = fecha;
    this.observacion = observacion;
    this.condventa = condventa;
    this.quien = quien;
    this.idempresa = String(idempresa); // Asegúrate de que el idempresa sea un string
  }

  toJSON() {
    return JSON.stringify(this);
  }

  async insert() {
    const redisKey = 'empresasData'; // La clave en Redis que contiene todas las empresas
    console.log("Buscando clave de Redis:", redisKey);

    try {
        // Obtener todas las empresas desde Redis
        const empresasDataJson = await getFromRedis(redisKey);
        const empresasDB = empresasDataJson; // Esto ya debería ser un objeto

        // Verificar si la empresa en la posición idempresa existe
        const empresa = empresasDB ? empresasDB[this.idempresa] : null;

        if (!empresa) {
            throw new Error(`Configuración no encontrada en Redis para empresa con ID: ${this.idempresa}`);
        }

        console.log("Configuración de la empresa encontrada:", empresa);

        // Utilizamos la configuración de la empresa para obtener la conexión
        const connection = await getConnection(this.idempresa);

        if (this.did === 0) {
            // Caso `did === 0`: Crear un nuevo registro y actualizar el campo `did`
            return this.createNewRecordWithIdUpdate(connection);
        } else {
            // Caso `did !== 0`: Chequear y actualizar
            return this.checkAndUpdateDid(connection);
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


  checkAndUpdateDid(connection) {
    const checkDidQuery = 'SELECT id FROM enviospack WHERE did = ?';
    return new Promise((resolve, reject) => {
      connection.query(checkDidQuery, [this.did], (err, results) => {
        if (err) {
          return reject(err);
        }

        if (results.length > 0) {
          // Actualizar el registro anterior marcándolo como `superado = 1`
          const updateSuperadoQuery = 'UPDATE enviospack SET superado = 1 WHERE did = ?';
          connection.query(updateSuperadoQuery, [this.did], (updateErr) => {
            if (updateErr) {
              return reject(updateErr);
            }

            // Crear un nuevo registro con el mismo `did`
            this.createNewRecord(connection, this.did, resolve, reject);
          });
        } else {
          // Si el `did` no existe, simplemente crear un nuevo registro
          this.createNewRecord(connection, this.did, resolve, reject);
        }
      });
    });
  }

  createNewRecordWithIdUpdate(connection) {
    const columnsQuery = 'DESCRIBE enviospack';

    return new Promise((resolve, reject) => {
      connection.query(columnsQuery, (err, results) => {
        if (err) {
          return reject(err);
        }

        const tableColumns = results.map((column) => column.Field);
        const filteredColumns = tableColumns.filter((column) => this[column] !== undefined);

        const values = filteredColumns.map((column) => this[column]);
        const insertQuery = `INSERT INTO enviospack (${filteredColumns.join(', ')}) VALUES (${filteredColumns.map(() => '?').join(', ')})`;
        logYellow(`Insert Query: ${JSON.stringify(insertQuery)}`)
        logBlue(`Values: ${JSON.stringify(values)}`)
        connection.query(insertQuery, values, (err, results) => {
          if (err) {
            return reject(err);
          }

          const insertId = results.insertId;
          console.log("ID insertado:", insertId);

          // Actualizamos el campo `did` con el `insertId`
          const updateDidQuery = 'UPDATE enviospack SET did = ? WHERE id = ?';
          connection.query(updateDidQuery, [insertId, insertId], (updateErr) => {
            if (updateErr) {
              return reject(updateErr);
            }

            console.log(`Campo did actualizado a ${insertId} para el registro con ID ${insertId}`);
            resolve({ insertId: insertId, did: insertId });
          });
        });
      });
    });
  }

  createNewRecord(connection, did, resolve, reject) {
    const columnsQuery = 'DESCRIBE enviospack';

    connection.query(columnsQuery, (err, results) => {
      if (err) {
        return reject(err);
      }

      const tableColumns = results.map((column) => column.Field);
      const filteredColumns = tableColumns.filter((column) => this[column] !== undefined);

      const values = filteredColumns.map((column) => this[column]);
      const insertQuery = `INSERT INTO enviospack (${filteredColumns.join(', ')}) VALUES (${filteredColumns.map(() => '?').join(', ')})`;

      console.log('Insert Query:', insertQuery);
      console.log('Values:', values);

      connection.query(insertQuery, values, (err, results) => {
        if (err) {
          return reject(err);
        }

        const insertId = results.insertId;
        console.log("Nuevo registro creado con ID:", insertId);

        if (did === 0 || did === '0') {
          const updateDidQuery = 'UPDATE enviospack SET did = ? WHERE id = ?';
          connection.query(updateDidQuery, [insertId, insertId], (updateErr) => {
            if (updateErr) {
              return reject(updateErr);
            }

            console.log(`Campo did actualizado a ${insertId} para el registro con ID ${insertId}`);
            resolve({ insertId: insertId, did: insertId });
          });
        } else {
          resolve({ insertId: insertId, did: did });
        }
      });
    });
  }
}

module.exports = Enviospack;
