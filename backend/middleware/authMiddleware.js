const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
  const token = req.header('Authorization');
  if (!token) return res.status(401).json({ message: 'No token, authorization denied' });

  try {
    // Allows "Bearer <token>" or just "<token>"
    const pureToken = token.replace('Bearer ', '');
    const decoded = jwt.verify(pureToken, process.env.JWT_SECRET);
    
    req.user = decoded; // { userId, role }
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};
