const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
  const authHeader = req.header('Authorization');

  if (!authHeader) {
    return res.status(401).json({
      message: 'No token, authorization denied'
    });
  }

  try {
    const rawToken = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : authHeader;

    const token = rawToken ? rawToken.trim() : '';

    if (!token || token === 'null' || token === 'undefined') {
      return res.status(401).json({
        message: 'No active login session. Please log in to continue.'
      });
    }

    const JWT_SECRETS = [
      process.env.JWT_SECRET,
      'supersecretjwtkey_nearfix2026',
      'nearfix_secret_key_2026'
    ].filter(Boolean);

    let decoded = null;
    let lastError = null;

    for (const secret of JWT_SECRETS) {
      try {
        decoded = jwt.verify(token, secret);
        if (decoded) break;
      } catch (err) {
        lastError = err;
      }
    }

    if (!decoded) {
      if (lastError && lastError.name === 'TokenExpiredError') {
        return res.status(401).json({
          message: 'Your session has expired. Please log in again.'
        });
      }
      return res.status(401).json({
        message: 'Token is not valid. Please log in again.'
      });
    }

    req.user = decoded; // { userId, role }

    next();
  } catch (err) {
    return res.status(401).json({
      message: 'Token verification failed. Please log in again.'
    });
  }
};