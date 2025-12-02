// Author: HinHin
const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
    // Lấy token từ header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            success: false,
            message: 'Access denied. No token provided.'
        });
    }
    
    const token = authHeader.split(' ')[1];
    
    try {
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-jwt-secret-key-iot-smart-home-2025');
        req.user = decoded;
        next();
    } catch (error) {
        console.error('Token verification error:', error);
        return res.status(401).json({
            success: false,
            message: 'Invalid or expired token'
        });
    }
};

module.exports = authMiddleware;