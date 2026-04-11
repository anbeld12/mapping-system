const express = require("express");
const cors = require("cors");
require("dotenv").config();
const swaggerUi = require("swagger-ui-express");
const YAML = require("yamljs");
const path = require("path");

const blockRoutes = require("./routes/blockRoutes");
const houseRoutes = require("./routes/houseRoutes");
const mapRoutes = require("./routes/mapRoutes");
const syncRoutes = require("./routes/syncRoutes");
const neighborhoodRoutes = require("./routes/neighborhoodRoutes");
const exportRoutes = require("./routes/exportRoutes");

const app = express();

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
  : '*';

const corsOptions = {
  origin: allowedOrigins,
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));

// Health check routes
app.get('/', (req, res) => res.status(200).json({ status: 'API OK', role: 'root' }));
app.get('/api', (req, res) => res.status(200).json({ status: 'API OK', role: 'api-root' }));

// Swagger UI
const swaggerDocument = YAML.load(path.join(__dirname, "../swagger.yaml"));

// Configuración especial para que Swagger UI cargue el CSS correctamente en Vercel
const CSS_URL = "https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.1.0/swagger-ui.min.css";

app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
  customCssUrl: CSS_URL
}));

app.use("/api/blocks", blockRoutes);
app.use("/api/houses", houseRoutes);
app.use("/api/map", mapRoutes);
app.use("/api/sync", syncRoutes);
app.use("/api/neighborhoods", neighborhoodRoutes);
app.use("/api/export", exportRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal Server Error", details: err.message });
});

module.exports = app;

if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}