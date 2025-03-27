const crypto = require('crypto');

function generateToken(dateString) {
    return crypto.createHash('sha256').update(dateString).digest('hex');
}

function validateTokenMiddleware(req, res, next) {
    const receivedToken = req.body.token; // Obtiene el token del cuerpo de la solicitud

    if (!receivedToken) {
        return res.status(401).send({ message: 'Token no proporcionado.' });
    }

    const currentDate = new Date();
    const dateString = currentDate.toISOString().slice(0, 10).replace(/-/g, ''); // yyyy-mm-dd -> yyyymmdd
    const formattedDate = dateString.slice(6, 8) + dateString.slice(4, 6) + dateString.slice(0, 4); // ddmmYYYY
    const expectedToken = generateToken(formattedDate);

    console.log("Token esperado:", expectedToken);
    console.log("Token recibido:", receivedToken);

    if (receivedToken === expectedToken) {
        next(); // Si el token es válido, continúa
    } else {
        return res.status(401).send({ message: 'Token inválido.' });
    }
}

module.exports = validateTokenMiddleware;
