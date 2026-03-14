const express = require("express");
const router = express.Router();
const neighborhoodController = require("../controllers/neighborhoodController");

router.get("/", neighborhoodController.getNeighborhoods);
router.post("/", neighborhoodController.createNeighborhood);
router.put("/:id", neighborhoodController.updateNeighborhood);
router.delete("/:id", neighborhoodController.deleteNeighborhood);

// Asignación de cuadras
router.post("/:id/blocks", neighborhoodController.assignBlocks);

module.exports = router;
