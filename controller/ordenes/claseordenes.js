const { getConnection, getFromRedis } = require('../../dbconfig');
const { logYellow, logBlue } = require('../../fuctions/logsCustom');

// Clase Ordenes
class Ordenes {
  constructor({
    did = "",
    didEnvio = "",
    didCliente = "",
    didCuenta = "",
    status = "",
    flex = 0,
    number = "",
    observaciones = "",
    armado = 0,
    descargado = 0,
    fecha_armado = null,
    quien_armado = "",
    idEmpresa = null
  } = {}) {
    this.did = did;
    this.didEnvio = didEnvio;
    this.didCliente = didCliente;
    this.didCuenta = didCuenta;
    this.status = status;
    this.flex = flex;
    this.number = number;
    this.observaciones = observaciones;
    this.armado = armado;
    this.descargado = descargado;
    this.fecha_armado = fecha_armado;
    this.quien_armado = quien_armado;
    this.idEmpresa = String(idEmpresa);
  }

  // Método para convertir a JSON
  toJSON() {
    return JSON.stringify(this);
  }

  // Método para insertar en la base de datos
  async insert() {
    const redisKey = 'empresasData';
    console.log("Buscando clave de Redis:", redisKey);

    try {
      const empresasDataJson = await getFromRedis(redisKey);
      const empresasDB = empresasDataJson;

      const empresa = empresasDB ? empresasDB[this.idEmpresa] : null;

      if (!empresa) {
        throw new Error(`Configuración no encontrada en Redis para empresa con ID: ${this.idEmpresa}`);
      }

      console.log("Configuración de la empresa encontrada:", empresa);

      const connection = await getConnection(this.idEmpresa);

      if (this.did === null) {
        return this.createNewRecord(connection);
      } else {
        return this.checkAndUpdateDid(connection);
      }
    } catch (error) {
      console.error("Error en el método insert:", error.message);
      throw {
        status: 500,
        response: {
          estado: false,
          error: -1,
        },
      };
    }
  }

  // Verificar y actualizar el 'did'
  checkAndUpdateDid(connection) {
    const checkDidQuery = 'SELECT id FROM ordenes WHERE did = ?';
    return new Promise((resolve, reject) => {
      connection.query(checkDidQuery, [this.did], (err, results) => {
        if (err) {
          return reject(err);
        }

        if (results.length > 0) {
          const updateQuery = 'UPDATE ordenes SET superado = 1 WHERE did = ?';
          connection.query(updateQuery, [this.did], (updateErr) => {
            if (updateErr) {
              return reject(updateErr);
            }
            this.createNewRecord(connection).then(resolve).catch(reject);
          });
        } else {
          this.createNewRecord(connection).then(resolve).catch(reject);
        }
      });
    });
  }

  // Crear un nuevo registro en la tabla 'ordenes'
  createNewRecord(connection) {
    const columnsQuery = 'DESCRIBE ordenes';

    return new Promise((resolve, reject) => {
      connection.query(columnsQuery, (err, results) => {
        if (err) {
          return reject(err);
        }

        const tableColumns = results.map((column) => column.Field);
        const filteredColumns = tableColumns.filter((column) => this[column] !== undefined);
        const values = filteredColumns.map((column) => this[column]);
        const insertQuery = `INSERT INTO ordenes (${filteredColumns.join(', ')}) VALUES (${filteredColumns.map(() => '?').join(', ')})`;

        logYellow(`Insert Query: ${JSON.stringify(insertQuery)}`)
        logBlue(`Values: ${JSON.stringify(values)}`)
        connection.query(insertQuery, values, (err, results) => {
          if (err) {
            return reject(err);
          }

          const insertId = results.insertId; // Guardamos el ID de la orden insertada
          this.insertItems(connection, insertId).then(() => {
            resolve({ insertId });
          }).catch(reject);
        });
      });
    });
  }

  // Método para insertar items en la tabla 'ordenes_items'
  async insertItems(connection, didOrden) {
    // Aquí puedes definir los items que deseas insertar. Por ejemplo:
    const items = [
      {
        codigo: 'ITEM001',
        imagen: 'imagen1.png',
        descripcion: 'Descripción del item 1',
        ml_id: 'ML001',
        dimensions: '10x10x10',
        cantidad: 5,
        variacion: 'Color: Rojo',
        seller_sku: 'SKU001',
        descargado: 0,
        superado: 0,
        elim: 0
      },
      // Agrega más items según sea necesario
    ];

    const insertPromises = items.map(item => {
      const insertQuery = `INSERT INTO ordenes_items (didOrden, codigo, imagen, descripcion, ml_id, dimensions, cantidad, variacion, seller_sku, descargado, superado, elim) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
      const values = [
        didOrden,
        item.codigo,
        item.imagen,
        item.descripcion,
        item.ml_id,
        item.dimensions,
        item.cantidad,
        item.variacion,
        item.seller_sku,
        item.descargado,
        item.superado,
        item.elim
      ];

      return new Promise((resolve, reject) => {
        connection.query(insertQuery, values, (err, results) => {
          if (err) {
            return reject(err);
          }
          resolve(results.insertId);
        });
      });
    });

    return Promise.all(insertPromises); // Espera a que se inserten todos los items
  }
}

module.exports = Ordenes;
