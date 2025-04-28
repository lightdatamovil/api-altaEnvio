const { connect } = require('amqplib');



const { logRed, logGreen } = require('./logsCustom.js');
const { formatFechaUTC3 } = require('./formatFechaUTC3.js');



const RABBITMQ_URL = "amqp://lightdata:QQyfVBKRbw6fBb@158.69.131.226:5672"
const QUEUE_ESTADOS = "srvshipmltosrvstates"
function getFechaUTC3() {
    const fecha = new Date();
    fecha.setHours(fecha.getHours() + 3); // Añade 3 horas
    return fecha.toISOString(); // Devuelve la fecha en formato ISO
}

async function sendToShipmentStateMicroService(companyId, userId, shipmentId,estado) {
    try {
        const connection = await connect(RABBITMQ_URL);
        const channel = await connection.createChannel();
        await channel.assertQueue(QUEUE_ESTADOS, { durable: true });
console.log(companyId, userId, shipmentId,estado,"cosas");

        const message = {
            didempresa: companyId,
            didenvio: shipmentId,
            estado: estado,
            subestado: null,
            estadoML: null,
            fecha: getFechaUTC3(),
            quien: userId,
            operacion: "Altamasiva"
        };

        channel.sendToQueue(QUEUE_ESTADOS, Buffer.from(JSON.stringify(message)), { persistent: true }, (err, ok) => {
            if (err) {
                logRed('❌ Error al enviar el mensaje:', err);
                console.log("llegue aca1");
            } else {
                logGreen('✅ Mensaje enviado correctamente al microservicio de estados');
                console.log("llegue aca2");
                
                
            }
            connection.close();
        });
    } catch (error) {
        logRed(`Error en sendToShipmentStateMicroService: ${error.stack}`);
        throw error;
    }
};

module.exports = sendToShipmentStateMicroService;
