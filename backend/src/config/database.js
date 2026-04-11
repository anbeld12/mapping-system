const { Pool } = require("pg");

// En Vercel, las variables de entorno ya están inyectadas. 
// Solo usamos dotenv para desarrollo local.
if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is missing. Database operations will fail.");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    // Configuración estándar para Supabase
    rejectUnauthorized: false
  },
  // Optimización para serverless
  max: 1, 
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client', err);
});

module.exports = pool;