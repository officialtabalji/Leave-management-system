const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware to verify JWT token
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ 
        error: 'Access denied. No token provided.' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-__v');

    if (!user) {
      return res.status(401).json({ 
        error: 'Invalid token. User not found.' 
      });
    }

    if (!user.isActive) {
      return res.status(401).json({ 
        error: 'Account is deactivated.' 
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: 'Invalid token.' 
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token expired.' 
      });
    }
    return res.status(500).json({ 
      error: 'Token verification failed.' 
    });
  }
};

// Middleware to check if user has required role
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required.' 
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Access denied. Insufficient permissions.' 
      });
    }

    next();
  };
};

// Middleware to check if user is student
const requireStudent = requireRole(['student']);

// Middleware to check if user can approve leaves
const requireApprover = requireRole(['caretaker', 'warden', 'admin']);

// Middleware to check if user is admin
const requireAdmin = requireRole(['admin']);

// Middleware to check if user can access their own data or is admin
const requireOwnershipOrAdmin = (resourceUserIdField = 'student') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required.' 
      });
    }

    // Admin can access all data
    if (req.user.role === 'admin') {
      return next();
    }

    // Users can only access their own data
    const resourceUserId = req.params[resourceUserIdField] || req.body[resourceUserIdField];
    
    if (req.user._id.toString() !== resourceUserId) {
      return res.status(403).json({ 
        error: 'Access denied. You can only access your own data.' 
      });
    }

    next();
  };
};

// Middleware to check if user can approve specific leave request
const canApproveLeave = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required.' 
      });
    }

    if (!req.user.canApproveLeaves()) {
      return res.status(403).json({ 
        error: 'Access denied. You cannot approve leave requests.' 
      });
    }

    next();
  } catch (error) {
    return res.status(500).json({ 
      error: 'Permission check failed.' 
    });
  }
};

module.exports = {
  authenticateToken,
  requireRole,
  requireStudent,
  requireApprover,
  requireAdmin,
  requireOwnershipOrAdmin,
  canApproveLeave
};
