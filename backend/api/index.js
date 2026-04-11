module.exports = (req, res) => {
  try {
    // Intentamos cargar la aplicación. Si hay un error de importación o sintaxis en src/app.js, caerá en el catch.
    const app = require('../src/app');
    
    // Si la carga fue exitosa, devolvemos la ejecución a Express
    return app(req, res);
  } catch (error) {
    console.error('Vercel Boot Error:', error);
    
    // Si estamos aquí, la función colapsó al cargar.
    // Devolvemos el error como JSON para que el usuario pueda verlo en el navegador
    res.status(500).json({
      error: 'Failed to load application',
      message: error.message,
      stack: process.env.NODE_ENV === 'production' ? null : error.stack,
      hint: 'Revisa las variables de entorno o errores de sintaxis en src/app.js'
    });
  }
};
