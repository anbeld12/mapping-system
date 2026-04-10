const express = require("express");
const cors = require("cors");
require("dotenv").config();

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

app.use("/api/blocks", blockRoutes);
app.use("/api/houses", houseRoutes);
app.use("/api/map", mapRoutes);
app.use("/api/sync", syncRoutes);
app.use("/api/neighborhoods", neighborhoodRoutes);
app.use("/api/export", exportRoutes);

module.exports = app;