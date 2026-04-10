const express = require("express");
const router = express.Router();

const houseController = require("../controllers/houseController");

router.post("/", houseController.createHouse);
router.post("/generate", houseController.generateHouses);
router.post("/generate-by-width", houseController.generateHousesByWidth);
router.get("/", houseController.getHouses);

module.exports = router;

