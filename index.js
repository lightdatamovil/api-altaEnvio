const express = require('express');
const bodyParser = require('body-parser');
const { redisClient, getFromRedis } = require('./dbconfig');
const cors = require('cors');

// Variable global para almacenar empresas
let empresasDB = null;


// Función para actualizar las empresas desde Redis
async function actualizarEmpresas() {
  try {
    const empresasDataJson = await getFromRedis('empresasData');
    empresasDB = empresasDataJson || [];
  
  } catch (error) {
    console.error('Error al actualizar empresas desde Redis:', error);
  }
}

// Configuración del servidor Express
const app = express();
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(cors({
  origin: '*', // Permite solo este origen
  methods: ['GET', 'POST'], // Limitar los métodos HTTP
  allowedHeaders: ['Content-Type'], // Permitir ciertos encabezados
}));
// Importar rutas
const router = require('./route/route-envios');
const enviospack = require('./route/route-enviopack');

// Middleware para asegurar que las empresas estén actualizadas
app.use(async (req, res, next) => {
  if (!empresasDB) {
    await actualizarEmpresas();
  }
  next();
});

// Usar las rutas
app.use('/api', router);
app.use('/api2', enviospack);
// Ruta raíz que devuelve un mensaje "Hola"
app.get('/', (req, res) => {
  res.status(200).json({
    estado: true,
    mesanje: "Hola chris"
});
});




const PORT = 13000;




// Iniciar servidor con Redis
(async () => {
  try {
    // Actualizar las empresas antes de inici
    await actualizarEmpresas();
    
    // Iniciar servidor
    app.listen(PORT, () => {
      console.log(`Servidor escuchando en http://localhost:${PORT}`);
    });
    
    // Manejar cierre del servidor
    process.on('SIGINT', async () => {
      console.log('Cerrando servidor...');
      await redisClient.disconnect();
      process.exit();
    });
  } catch (err) {
    console.error('Error al iniciar el servidor:', err);
  }
})();
