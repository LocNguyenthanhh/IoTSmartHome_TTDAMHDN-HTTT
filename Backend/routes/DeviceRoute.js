// Author: NTLoc
// Example from chatGPT

const express = require('express');
const router = express.Router();
const { getDevices, updateDevice } = require('../controllers/DeviceController');

router.get('/', getDevices);          // GET /api/devices
router.patch('/:id', updateDevice);   // PATCH /api/devices/:id

module.exports = router;
