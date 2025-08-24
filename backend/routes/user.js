const express = require('express');
const User = require('../models/User');
const LeaveRequest = require('../models/LeaveRequest');
const { authenticateToken, requireOwnershipOrAdmin } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// Get user profile
router.get('/profile', authenticateToken, async (req, res) => {
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
        emergencyContact: user.emergencyContact,
        isActive: user.isActive,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch profile' 
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
    delete updateData.studentId;
    delete updateData.year;

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

// Get user dashboard data
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    let dashboardData = {};

    if (user.role === 'student') {
      // Student dashboard
      const pendingRequests = await LeaveRequest.countDocuments({
        student: user._id,
        status: 'pending'
      });

      const approvedRequests = await LeaveRequest.countDocuments({
        student: user._id,
        status: 'approved'
      });

      const rejectedRequests = await LeaveRequest.countDocuments({
        student: user._id,
        status: 'rejected'
      });

      const recentRequests = await LeaveRequest.find({
        student: user._id
      })
      .sort({ createdAt: -1 })
      .limit(5);

      dashboardData = {
        pendingRequests,
        approvedRequests,
        rejectedRequests,
        recentRequests: recentRequests.map(req => ({
          id: req._id,
          fromDate: req.fromDate,
          toDate: req.toDate,
          reason: req.reason,
          type: req.type,
          status: req.status,
          createdAt: req.createdAt,
          duration: req.duration
        }))
      };
    } else if (user.canApproveLeaves()) {
      // Approver dashboard
      const pendingRequests = await LeaveRequest.countDocuments({
        status: 'pending'
      });

      const urgentRequests = await LeaveRequest.countDocuments({
        status: 'pending',
        isUrgent: true
      });

      const todayRequests = await LeaveRequest.countDocuments({
        status: 'pending',
        fromDate: {
          $gte: new Date(new Date().setHours(0, 0, 0, 0)),
          $lt: new Date(new Date().setHours(23, 59, 59, 999))
        }
      });

      const recentApprovals = await LeaveRequest.find({
        approvedBy: user._id
      })
      .populate('student', 'name email studentId department')
      .sort({ approvedAt: -1 })
      .limit(5);

      dashboardData = {
        pendingRequests,
        urgentRequests,
        todayRequests,
        recentApprovals: recentApprovals.map(req => ({
          id: req._id,
          student: req.student,
          status: req.status,
          type: req.type,
          fromDate: req.fromDate,
          toDate: req.toDate,
          approvedAt: req.approvedAt,
          remarks: req.remarks
        }))
      };
    }

    res.json({
      dashboardData
    });

  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch dashboard data' 
    });
  }
});

// Get user statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    let stats = {};

    if (user.role === 'student') {
      // Student statistics
      const totalRequests = await LeaveRequest.countDocuments({
        student: user._id
      });

      const approvedRequests = await LeaveRequest.countDocuments({
        student: user._id,
        status: 'approved'
      });

      const rejectedRequests = await LeaveRequest.countDocuments({
        student: user._id,
        status: 'rejected'
      });

      const pendingRequests = await LeaveRequest.countDocuments({
        student: user._id,
        status: 'pending'
      });

      const dayLeaves = await LeaveRequest.countDocuments({
        student: user._id,
        status: 'approved',
        type: 'day'
      });

      const homeLeaves = await LeaveRequest.countDocuments({
        student: user._id,
        status: 'approved',
        type: 'home'
      });

      // Calculate total leave days
      const approvedLeaves = await LeaveRequest.find({
        student: user._id,
        status: 'approved'
      });

      let totalDays = 0;
      approvedLeaves.forEach(leave => {
        const duration = Math.ceil((leave.toDate - leave.fromDate) / (1000 * 60 * 60 * 24)) + 1;
        totalDays += duration;
      });

      stats = {
        totalRequests,
        approvedRequests,
        rejectedRequests,
        pendingRequests,
        dayLeaves,
        homeLeaves,
        totalDays,
        approvalRate: totalRequests > 0 ? ((approvedRequests / totalRequests) * 100).toFixed(1) : 0
      };
    } else if (user.canApproveLeaves()) {
      // Approver statistics
      const totalApproved = await LeaveRequest.countDocuments({
        approvedBy: user._id,
        status: 'approved'
      });

      const totalRejected = await LeaveRequest.countDocuments({
        approvedBy: user._id,
        status: 'rejected'
      });

      const pendingToReview = await LeaveRequest.countDocuments({
        status: 'pending'
      });

      const urgentPending = await LeaveRequest.countDocuments({
        status: 'pending',
        isUrgent: true
      });

      // Monthly statistics for current year
      const currentYear = new Date().getFullYear();
      const monthlyStats = await LeaveRequest.aggregate([
        {
          $match: {
            approvedBy: user._id,
            approvedAt: {
              $gte: new Date(currentYear, 0, 1),
              $lt: new Date(currentYear + 1, 0, 1)
            }
          }
        },
        {
          $group: {
            _id: { $month: '$approvedAt' },
            approved: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] } },
            rejected: { $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] } }
          }
        },
        {
          $sort: { _id: 1 }
        }
      ]);

      stats = {
        totalApproved,
        totalRejected,
        pendingToReview,
        urgentPending,
        totalProcessed: totalApproved + totalRejected,
        approvalRate: (totalApproved + totalRejected) > 0 ? ((totalApproved / (totalApproved + totalRejected)) * 100).toFixed(1) : 0,
        monthlyStats
      };
    }

    res.json({
      stats
    });

  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch statistics' 
    });
  }
});

// Search users (for approvers to find students)
router.get('/search', [
  authenticateToken,
  requireOwnershipOrAdmin()
], async (req, res) => {
  try {
    const { query, role } = req.query;
    const searchQuery = {};

    if (query) {
      searchQuery.$or = [
        { name: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } },
        { studentId: { $regex: query, $options: 'i' } }
      ];
    }

    if (role) {
      searchQuery.role = role;
    }

    // Limit results for performance
    const users = await User.find(searchQuery)
      .select('name email studentId department year hostel roomNumber')
      .limit(10)
      .sort({ name: 1 });

    res.json({
      users: users.map(user => ({
        id: user._id,
        name: user.name,
        email: user.email,
        studentId: user.studentId,
        department: user.department,
        year: user.year,
        hostel: user.hostel,
        roomNumber: user.roomNumber
      }))
    });

  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ 
      error: 'Failed to search users' 
    });
  }
});

// Get user by ID (for approvers to view student details)
router.get('/:id', [
  authenticateToken,
  requireOwnershipOrAdmin()
], async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id)
      .select('-__v');

    if (!user) {
      return res.status(404).json({ 
        error: 'User not found' 
      });
    }

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
        emergencyContact: user.emergencyContact,
        isActive: user.isActive,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt
      }
    });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch user' 
    });
  }
});

module.exports = router;
