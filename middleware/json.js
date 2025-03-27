function verificarCamposRequeridos(requeridos) {
    return (req, res, next) => {
        const data = req.body;

        // Función recursiva para verificar si las claves anidadas existen
        function verificarClave(obj, clave) {
            const claves = clave.split('.'); // Separa las claves anidadas con punto
            let valor = obj;

            for (let i = 0; i < claves.length; i++) {
                if (valor && valor.hasOwnProperty(claves[i])) {
                    valor = valor[claves[i]];
                } else {
                    return false; // Si alguna clave no existe, retorna false
                }
            }
            return true; // Si todas las claves existen, retorna true
        }

        // Iterar sobre todas las claves requeridas y verificar
        for (let campo of requeridos) {
            if (!verificarClave(data, campo)) {
                return res.status(400).json({
                    message: `Falta el campo obligatorio: ${campo}`
                });
            }
        }

        // Si todos los campos están presentes, continua con la ejecución
        next();
    };
}

module.exports = verificarCamposRequeridos;
