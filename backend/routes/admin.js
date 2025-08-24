const express = require('express');
const LeaveRequest = require('../models/LeaveRequest');
const User = require('../models/User');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { body, validationResult, param } = require('express-validator');

const router = express.Router();

// Get system statistics
router.get('/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // Get counts
    const totalUsers = await User.countDocuments();
    const totalStudents = await User.countDocuments({ role: 'student' });
    const totalCaretakers = await User.countDocuments({ role: 'caretaker' });
    const totalWardens = await User.countDocuments({ role: 'warden' });
    const totalAdmins = await User.countDocuments({ role: 'admin' });

    const totalLeaveRequests = await LeaveRequest.countDocuments();
    const pendingRequests = await LeaveRequest.countDocuments({ status: 'pending' });
    const approvedRequests = await LeaveRequest.countDocuments({ status: 'approved' });
    const rejectedRequests = await LeaveRequest.countDocuments({ status: 'rejected' });

    // Get recent activity
    const recentRequests = await LeaveRequest.find()
      .populate('student', 'name email studentId department')
      .populate('approvedBy', 'name role')
      .sort({ createdAt: -1 })
      .limit(10);

    // Get department-wise statistics
    const departmentStats = await LeaveRequest.aggregate([
      {
        $lookup: {
          from: 'users',
          localField: 'student',
          foreignField: '_id',
          as: 'studentInfo'
        }
      },
      {
        $unwind: '$studentInfo'
      },
      {
        $group: {
          _id: '$studentInfo.department',
          totalRequests: { $sum: 1 },
          approved: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] } },
          rejected: { $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] } },
          pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } }
        }
      },
      {
        $sort: { totalRequests: -1 }
      }
    ]);

    // Get monthly statistics for current year
    const currentYear = new Date().getFullYear();
    const monthlyStats = await LeaveRequest.aggregate([
      {
        $match: {
          createdAt: {
            $gte: new Date(currentYear, 0, 1),
            $lt: new Date(currentYear + 1, 0, 1)
          }
        }
      },
      {
        $group: {
          _id: { $month: '$createdAt' },
          totalRequests: { $sum: 1 },
          approved: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] } },
          rejected: { $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] } }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    res.json({
      stats: {
        users: {
          total: totalUsers,
          students: totalStudents,
          caretakers: totalCaretakers,
          wardens: totalWardens,
          admins: totalAdmins
        },
        leaveRequests: {
          total: totalLeaveRequests,
          pending: pendingRequests,
          approved: approvedRequests,
          rejected: rejectedRequests
        }
      },
      departmentStats,
      monthlyStats,
      recentRequests: recentRequests.map(req => ({
        id: req._id,
        student: req.student,
        status: req.status,
        type: req.type,
        fromDate: req.fromDate,
        toDate: req.toDate,
        createdAt: req.createdAt,
        approvedBy: req.approvedBy
      }))
    });

  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch system statistics' 
    });
  }
});

// Get all users with pagination
router.get('/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const role = req.query.role;
    const search = req.query.search;

    const query = {};
    
    if (role) {
      query.role = role;
    }
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { studentId: { $regex: search, $options: 'i' } }
      ];
    }

    const totalUsers = await User.countDocuments(query);
    const totalPages = Math.ceil(totalUsers / limit);

    const users = await User.find(query)
      .select('-__v')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({
      users: users.map(user => ({
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        studentId: user.studentId,
        department: user.department,
        year: user.year,
        hostel: user.hostel,
        roomNumber: user.roomNumber,
        isActive: user.isActive,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt
      })),
      pagination: {
        currentPage: page,
        totalPages,
        totalUsers,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch users' 
    });
  }
});

// Update user role
router.put('/users/:id/role', [
  authenticateToken,
  requireAdmin,
  param('id').isMongoId().withMessage('Valid user ID is required'),
  body('role').isIn(['student', 'caretaker', 'warden', 'admin']).withMessage('Valid role is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        errors: errors.array() 
      });
    }

    const { id } = req.params;
    const { role } = req.body;

    const user = await User.findById(id);
    
    if (!user) {
      return res.status(404).json({ 
        error: 'User not found' 
      });
    }

    // Prevent admin from changing their own role
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ 
        error: 'You cannot change your own role' 
      });
    }

    user.role = role;
    await user.save();

    res.json({
      message: 'User role updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({ 
      error: 'Failed to update user role' 
    });
  }
});

// Toggle user active status
router.put('/users/:id/status', [
  authenticateToken,
  requireAdmin,
  param('id').isMongoId().withMessage('Valid user ID is required'),
  body('isActive').isBoolean().withMessage('Valid status is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        errors: errors.array() 
      });
    }

    const { id } = req.params;
    const { isActive } = req.body;

    const user = await User.findById(id);
    
    if (!user) {
      return res.status(404).json({ 
        error: 'User not found' 
      });
    }

    // Prevent admin from deactivating themselves
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ 
        error: 'You cannot deactivate your own account' 
      });
    }

    user.isActive = isActive;
    await user.save();

    res.json({
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isActive: user.isActive
      }
    });

  } catch (error) {
    console.error('Toggle user status error:', error);
    res.status(500).json({ 
      error: 'Failed to update user status' 
    });
  }
});

// Get all leave requests with filters
router.get('/leave-requests', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const status = req.query.status;
    const type = req.query.type;
    const department = req.query.department;
    const fromDate = req.query.fromDate;
    const toDate = req.query.toDate;

    const query = {};
    
    if (status) {
      query.status = status;
    }
    
    if (type) {
      query.type = type;
    }
    
    if (fromDate || toDate) {
      query.createdAt = {};
      if (fromDate) {
        query.createdAt.$gte = new Date(fromDate);
      }
      if (toDate) {
        query.createdAt.$lte = new Date(toDate);
      }
    }

    let leaveRequests;
    let totalRequests;

    if (department) {
      // If department filter is applied, we need to aggregate
      const pipeline = [
        {
          $lookup: {
            from: 'users',
            localField: 'student',
            foreignField: '_id',
            as: 'studentInfo'
          }
        },
        {
          $unwind: '$studentInfo'
        },
        {
          $match: {
            ...query,
            'studentInfo.department': department
          }
        },
        {
          $facet: {
            data: [
              { $skip: (page - 1) * limit },
              { $limit: limit },
              {
                $lookup: {
                  from: 'users',
                  localField: 'approvedBy',
                  foreignField: '_id',
                  as: 'approverInfo'
                }
              },
              {
                $unwind: {
                  path: '$approverInfo',
                  preserveNullAndEmptyArrays: true
                }
              }
            ],
            total: [{ $count: 'count' }]
          }
        }
      ];

      const result = await LeaveRequest.aggregate(pipeline);
      leaveRequests = result[0].data;
      totalRequests = result[0].total[0]?.count || 0;
    } else {
      // Simple query without department filter
      totalRequests = await LeaveRequest.countDocuments(query);
      
      leaveRequests = await LeaveRequest.find(query)
        .populate('student', 'name email studentId department year hostel roomNumber')
        .populate('approvedBy', 'name role')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit);
    }

    const totalPages = Math.ceil(totalRequests / limit);

    res.json({
      leaveRequests: leaveRequests.map(req => ({
        id: req._id,
        fromDate: req.fromDate,
        toDate: req.toDate,
        reason: req.reason,
        type: req.type,
        status: req.status,
        remarks: req.remarks,
        isUrgent: req.isUrgent,
        urgentReason: req.urgentReason,
        student: req.studentInfo || req.student,
        approvedBy: req.approverInfo || req.approvedBy,
        approvedAt: req.approvedAt,
        createdAt: req.createdAt,
        duration: req.duration,
        isOverdue: req.isOverdue
      })),
      pagination: {
        currentPage: page,
        totalPages,
        totalRequests,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Get leave requests error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch leave requests' 
    });
  }
});

// Generate detailed report
router.post('/reports/generate', [
  authenticateToken,
  requireAdmin,
  body('startDate').isISO8601().withMessage('Valid start date is required'),
  body('endDate').isISO8601().withMessage('Valid end date is required'),
  body('type').isIn(['summary', 'detailed', 'department', 'student']).withMessage('Valid report type is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        errors: errors.array() 
      });
    }

    const { startDate, endDate, type, department, studentId } = req.body;
    const start = new Date(startDate);
    const end = new Date(endDate);

    let report;

    switch (type) {
      case 'summary':
        report = await generateSummaryReport(start, end);
        break;
      case 'detailed':
        report = await generateDetailedReport(start, end);
        break;
      case 'department':
        if (!department) {
          return res.status(400).json({ 
            error: 'Department is required for department report' 
          });
        }
        report = await generateDepartmentReport(start, end, department);
        break;
      case 'student':
        if (!studentId) {
          return res.status(400).json({ 
            error: 'Student ID is required for student report' 
          });
        }
        report = await generateStudentReport(start, end, studentId);
        break;
      default:
        return res.status(400).json({ 
          error: 'Invalid report type' 
        });
    }

    res.json({
      message: 'Report generated successfully',
      report: {
        type,
        startDate: start,
        endDate: end,
        generatedAt: new Date(),
        data: report
      }
    });

  } catch (error) {
    console.error('Generate report error:', error);
    res.status(500).json({ 
      error: 'Failed to generate report' 
    });
  }
});

// Helper functions for reports
async function generateSummaryReport(startDate, endDate) {
  const summary = await LeaveRequest.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: null,
        totalRequests: { $sum: 1 },
        approved: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] } },
        rejected: { $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] } },
        pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
        dayLeaves: { $sum: { $cond: [{ $eq: ['$type', 'day'] }, 1, 0] } },
        homeLeaves: { $sum: { $cond: [{ $eq: ['$type', 'home'] }, 1, 0] } },
        urgentRequests: { $sum: { $cond: ['$isUrgent', 1, 0] } }
      }
    }
  ]);

  return summary[0] || {
    totalRequests: 0,
    approved: 0,
    rejected: 0,
    pending: 0,
    dayLeaves: 0,
    homeLeaves: 0,
    urgentRequests: 0
  };
}

async function generateDetailedReport(startDate, endDate) {
  return await LeaveRequest.find({
    createdAt: { $gte: startDate, $lte: endDate }
  })
  .populate('student', 'name email studentId department year')
  .populate('approvedBy', 'name role')
  .sort({ createdAt: -1 });
}

async function generateDepartmentReport(startDate, endDate, department) {
  return await LeaveRequest.aggregate([
    {
      $lookup: {
        from: 'users',
        localField: 'student',
        foreignField: '_id',
        as: 'studentInfo'
      }
    },
    {
      $unwind: '$studentInfo'
    },
    {
      $match: {
        'studentInfo.department': department,
        createdAt: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        requests: { $push: '$$ROOT' }
      }
    }
  ]);
}

async function generateStudentReport(startDate, endDate, studentId) {
  return await LeaveRequest.find({
    student: studentId,
    createdAt: { $gte: startDate, $lte: endDate }
  })
  .populate('approvedBy', 'name role')
  .sort({ createdAt: -1 });
}

module.exports = router;
