const express = require("express");
const router = express.Router();

const blockController = require("../controllers/blockController");

router.post("/", blockController.createBlock);

router.get("/", blockController.getBlocks);

module.exports = router;