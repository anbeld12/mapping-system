/**
 * Punto de entrada para Hostinger Node.js Selector.
 * Hostinger requiere un archivo en la raíz del backend para iniciar la aplicación.
 */

const app = require('./src/app');

// El puerto debe ser tomado de process.env.PORT proporcionado por Hostinger
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor iniciado correctamente en el puerto ${PORT}`);
});
