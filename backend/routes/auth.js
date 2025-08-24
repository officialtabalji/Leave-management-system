const express = require('express');
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

const router = express.Router();
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Google OAuth login
router.post('/google', async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({ 
        error: 'Google ID token is required' 
      });
    }

    // Verify Google ID token
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    const { email, name, picture, sub: googleId } = payload;

    // Check if email is from NIT Goa
    if (!email.endsWith('@nitgoa.ac.in')) {
      return res.status(403).json({ 
        error: 'Only NIT Goa email addresses are allowed (@nitgoa.ac.in)' 
      });
    }

    // Find or create user
    let user = await User.findOne({ email });

    if (!user) {
      // Create new user with default role as student
      user = new User({
        email,
        name,
        googleId,
        profilePicture: picture,
        role: 'student' // Default role for new users
      });

      await user.save();
    } else {
      // Update existing user's Google ID and profile picture
      user.googleId = googleId;
      user.profilePicture = picture;
      user.lastLogin = new Date();
      await user.save();
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profilePicture: user.profilePicture,
        studentId: user.studentId,
        department: user.department,
        year: user.year,
        hostel: user.hostel,
        roomNumber: user.roomNumber
      }
    });

  } catch (error) {
    console.error('Google OAuth error:', error);
    
    if (error.message.includes('Invalid Value')) {
      return res.status(400).json({ 
        error: 'Invalid Google ID token' 
      });
    }
    
    res.status(500).json({ 
      error: 'Authentication failed' 
    });
  }
});

// Verify token and get user profile
router.get('/verify', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    
    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profilePicture: user.profilePicture,
        studentId: user.studentId,
        department: user.department,
        year: user.year,
        hostel: user.hostel,
        roomNumber: user.roomNumber,
        contactNumber: user.contactNumber,
        emergencyContact: user.emergencyContact
      }
    });
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({ 
      error: 'Token verification failed' 
    });
  }
});

// Update user profile
router.put('/profile', [
  authenticateToken,
  body('name').optional().trim().isLength({ min: 2, max: 100 }),
  body('contactNumber').optional().matches(/^[0-9]{10}$/),
  body('department').optional().trim().isLength({ max: 100 }),
  body('hostel').optional().trim().isLength({ max: 100 }),
  body('roomNumber').optional().trim().isLength({ max: 20 }),
  body('emergencyContact.name').optional().trim().isLength({ max: 100 }),
  body('emergencyContact.relationship').optional().trim().isLength({ max: 50 }),
  body('emergencyContact.phone').optional().matches(/^[0-9]{10}$/)
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        errors: errors.array() 
      });
    }

    const user = req.user;
    const updateData = req.body;

    // Remove fields that shouldn't be updated
    delete updateData.email;
    delete updateData.role;
    delete updateData.googleId;

    // Update user profile
    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined) {
        user[key] = updateData[key];
      }
    });

    await user.save();

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profilePicture: user.profilePicture,
        studentId: user.studentId,
        department: user.department,
        year: user.year,
        hostel: user.hostel,
        roomNumber: user.roomNumber,
        contactNumber: user.contactNumber,
        emergencyContact: user.emergencyContact
      }
    });

  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ 
      error: 'Profile update failed' 
    });
  }
});

// Logout (client-side token removal)
router.post('/logout', authenticateToken, (req, res) => {
  res.json({ 
    message: 'Logout successful' 
  });
});

// Refresh token (optional - for extending session)
router.post('/refresh', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    
    // Generate new token
    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Token refreshed successfully',
      token
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ 
      error: 'Token refresh failed' 
    });
  }
});

module.exports = router;
