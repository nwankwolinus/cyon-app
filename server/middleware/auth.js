// middleware/auth.js
const { isTokenBlacklisted } = require('../utils/tokenBlacklist');
const jwt = require('jsonwebtoken');

function auth(req, res, next) {
  const authHeader = req.header('Authorization'); // Expect "Bearer <token>"

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ msg: 'No token, authorization denied' });
  }

  const token = authHeader.split(" ")[1];

  // Check if token is blacklisted
  if (isTokenBlacklisted(token)) {
    return res.status(401).json({ msg: 'Token has been blacklisted' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, role }
    next();
  } catch (err) {
    return res.status(401).json({ msg: 'Token is not valid' });
  }
}

// ✅ Export the middleware function, NOT router
module.exports = auth;
