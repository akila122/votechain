const jwt = require("jsonwebtoken");
const authRoutes = [
  { path: "/registration_approval", method: "POST" },
  { path: "/add_voting", method: "POST" },
  { path: "/voting_options", method: "POST" },
  { path: "/add_vote", method: "POST" },
  { path: "/close_voting", method: "POST"},
  {path: "/voting_results", method: "POST"}
];

function isAuthRequired(httpMethod, url) {
  for (let routeObj of authRoutes) {
    if (routeObj.method === httpMethod && routeObj.path === url) {
      return true;
    }
  }
  return false;
}

function authenticateToken(req, res, next) {
  if (isAuthRequired(req.method, req.originalUrl)) {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    if (token == null) return res.sendStatus(401);

    try {
      req.userTokenData = jwt.verify(token, process.env.JWT_KEY);
      next();
    } catch (error) {
      console.error(error);
      return res.sendStatus(403);
    }
  } else next();
}

function generateAccessToken(username) {
  return jwt.sign(username, process.env.JWT_KEY);
}

exports.authenticateToken = authenticateToken;
exports.generateAccessToken = generateAccessToken;
