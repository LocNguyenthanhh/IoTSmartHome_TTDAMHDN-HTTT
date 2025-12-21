// Backend/routes/feedroute.js
const express = require('express');
const router = express.Router();
const feedController = require('../controllers/feedController.js');

router.get('/:feedKey', feedController.fetchFeedAndSave);
router.post('/:feedKey', feedController.sendCommand);

module.exports = router;