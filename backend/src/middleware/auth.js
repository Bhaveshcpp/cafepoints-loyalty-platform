const { verifyToken } = require("../utils/token");

function requireAuth(req, res, next) {
  const token = req.cookies?.token || (req.headers.authorization || "").replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Not authenticated" });

  try {
    req.user = verifyToken(token); // { sub, role, shop }
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired session" });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Forbidden: insufficient role" });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };
