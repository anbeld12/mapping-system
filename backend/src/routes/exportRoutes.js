const express = require("express");
const router = express.Router();
const exportController = require("../controllers/exportController");

router.get("/", exportController.exportData);
router.get("/report", exportController.generateReport);

module.exports = router;
