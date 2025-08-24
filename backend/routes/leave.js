const express = require('express');
const LeaveRequest = require('../models/LeaveRequest');
const User = require('../models/User');
const { 
  authenticateToken, 
  requireStudent, 
  requireApprover,
  canApproveLeave 
} = require('../middleware/auth');
const { body, validationResult, param } = require('express-validator');

const router = express.Router();

// Apply for leave (Student only)
router.post('/apply', [
  authenticateToken,
  requireStudent,
  body('fromDate').isISO8601().withMessage('Valid from date is required'),
  body('toDate').isISO8601().withMessage('Valid to date is required'),
  body('reason').trim().isLength({ min: 10, max: 500 }).withMessage('Reason must be between 10 and 500 characters'),
  body('type').isIn(['day', 'home']).withMessage('Valid leave type is required'),
  body('contactDetails.address').trim().isLength({ min: 10, max: 300 }).withMessage('Address must be between 10 and 300 characters'),
  body('contactDetails.phone').matches(/^[0-9]{10}$/).withMessage('Valid phone number is required'),
  body('contactDetails.emergencyContact.name').trim().isLength({ min: 2, max: 100 }).withMessage('Emergency contact name is required'),
  body('contactDetails.emergencyContact.relationship').trim().isLength({ min: 2, max: 50 }).withMessage('Emergency contact relationship is required'),
  body('contactDetails.emergencyContact.phone').matches(/^[0-9]{10}$/).withMessage('Valid emergency contact phone is required'),
  body('isUrgent').optional().isBoolean(),
  body('urgentReason').optional().trim().isLength({ max: 200 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        errors: errors.array() 
      });
    }

    const { fromDate, toDate, reason, type, contactDetails, isUrgent, urgentReason } = req.body;
    const studentId = req.user._id;

    // Check if dates are valid
    const fromDateObj = new Date(fromDate);
    const toDateObj = new Date(toDate);
    const now = new Date();

    if (fromDateObj < now) {
      return res.status(400).json({ 
        error: 'From date cannot be in the past' 
      });
    }

    if (toDateObj < fromDateObj) {
      return res.status(400).json({ 
        error: 'To date must be after or equal to from date' 
      });
    }

    // Check if student has overlapping leave requests
    const overlappingLeaves = await LeaveRequest.find({
      student: studentId,
      status: { $in: ['pending', 'approved'] },
      $or: [
        {
          fromDate: { $lte: toDateObj },
          toDate: { $gte: fromDateObj }
        }
      ]
    });

    if (overlappingLeaves.length > 0) {
      return res.status(400).json({ 
        error: 'You have overlapping leave requests for these dates' 
      });
    }

    // Create leave request
    const leaveRequest = new LeaveRequest({
      student: studentId,
      fromDate: fromDateObj,
      toDate: toDateObj,
      reason,
      type,
      contactDetails,
      isUrgent: isUrgent || false,
      urgentReason: isUrgent ? urgentReason : undefined
    });

    await leaveRequest.save();

    // Populate student details for response
    await leaveRequest.populate('student', 'name email studentId department year');

    res.status(201).json({
      message: 'Leave request submitted successfully',
      leaveRequest: {
        id: leaveRequest._id,
        fromDate: leaveRequest.fromDate,
        toDate: leaveRequest.toDate,
        reason: leaveRequest.reason,
        type: leaveRequest.type,
        status: leaveRequest.status,
        isUrgent: leaveRequest.isUrgent,
        urgentReason: leaveRequest.urgentReason,
        student: leaveRequest.student,
        createdAt: leaveRequest.createdAt
      }
    });

  } catch (error) {
    console.error('Leave application error:', error);
    res.status(500).json({ 
      error: 'Failed to submit leave request' 
    });
  }
});

// Get student's leave requests
router.get('/my-requests', authenticateToken, requireStudent, async (req, res) => {
  try {
    const studentId = req.user._id;
    const leaveRequests = await LeaveRequest.getStudentRequests(studentId);

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
        approvedBy: req.approvedBy,
        approvedAt: req.approvedAt,
        createdAt: req.createdAt,
        duration: req.duration,
        isOverdue: req.isOverdue
      }))
    });

  } catch (error) {
    console.error('Get my requests error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch leave requests' 
    });
  }
});

// Get pending leave requests (Approvers only)
router.get('/pending', [
  authenticateToken,
  canApproveLeave
], async (req, res) => {
  try {
    const pendingRequests = await LeaveRequest.getPendingRequests();

    res.json({
      pendingRequests: pendingRequests.map(req => ({
        id: req._id,
        fromDate: req.fromDate,
        toDate: req.toDate,
        reason: req.reason,
        type: req.type,
        isUrgent: req.isUrgent,
        urgentReason: req.urgentReason,
        student: req.student,
        createdAt: req.createdAt,
        duration: req.duration,
        isOverdue: req.isOverdue
      }))
    });

  } catch (error) {
    console.error('Get pending requests error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch pending requests' 
    });
  }
});

// Approve leave request
router.put('/:id/approve', [
  authenticateToken,
  canApproveLeave,
  param('id').isMongoId().withMessage('Valid leave request ID is required'),
  body('remarks').optional().trim().isLength({ max: 200 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        errors: errors.array() 
      });
    }

    const { id } = req.params;
    const { remarks } = req.body;
    const approverId = req.user._id;

    const leaveRequest = await LeaveRequest.findById(id);
    
    if (!leaveRequest) {
      return res.status(404).json({ 
        error: 'Leave request not found' 
      });
    }

    if (leaveRequest.status !== 'pending') {
      return res.status(400).json({ 
        error: 'Leave request is not pending' 
      });
    }

    // Approve the leave request
    await leaveRequest.approve(approverId, remarks);

    // Populate student details for response
    await leaveRequest.populate('student', 'name email studentId department year');
    await leaveRequest.populate('approvedBy', 'name role');

    res.json({
      message: 'Leave request approved successfully',
      leaveRequest: {
        id: leaveRequest._id,
        status: leaveRequest.status,
        remarks: leaveRequest.remarks,
        approvedBy: leaveRequest.approvedBy,
        approvedAt: leaveRequest.approvedAt,
        student: leaveRequest.student
      }
    });

  } catch (error) {
    console.error('Approve leave error:', error);
    res.status(500).json({ 
      error: 'Failed to approve leave request' 
    });
  }
});

// Reject leave request
router.put('/:id/reject', [
  authenticateToken,
  canApproveLeave,
  param('id').isMongoId().withMessage('Valid leave request ID is required'),
  body('remarks').trim().isLength({ min: 5, max: 200 }).withMessage('Rejection remarks are required (5-200 characters)')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        errors: errors.array() 
      });
    }

    const { id } = req.params;
    const { remarks } = req.body;
    const approverId = req.user._id;

    const leaveRequest = await LeaveRequest.findById(id);
    
    if (!leaveRequest) {
      return res.status(404).json({ 
        error: 'Leave request not found' 
      });
    }

    if (leaveRequest.status !== 'pending') {
      return res.status(400).json({ 
        error: 'Leave request is not pending' 
      });
    }

    // Reject the leave request
    await leaveRequest.reject(approverId, remarks);

    // Populate student details for response
    await leaveRequest.populate('student', 'name email studentId department year');
    await leaveRequest.populate('approvedBy', 'name role');

    res.json({
      message: 'Leave request rejected successfully',
      leaveRequest: {
        id: leaveRequest._id,
        status: leaveRequest.status,
        remarks: leaveRequest.remarks,
        approvedBy: leaveRequest.approvedBy,
        approvedAt: leaveRequest.approvedAt,
        student: leaveRequest.student
      }
    });

  } catch (error) {
    console.error('Reject leave error:', error);
    res.status(500).json({ 
      error: 'Failed to reject leave request' 
    });
  }
});

// Get leave request details
router.get('/:id', [
  authenticateToken,
  param('id').isMongoId().withMessage('Valid leave request ID is required')
], async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const leaveRequest = await LeaveRequest.findById(id)
      .populate('student', 'name email studentId department year hostel roomNumber')
      .populate('approvedBy', 'name role');

    if (!leaveRequest) {
      return res.status(404).json({ 
        error: 'Leave request not found' 
      });
    }

    // Check if user can view this request
    if (req.user.role !== 'admin' && 
        !req.user.canApproveLeaves() && 
        leaveRequest.student._id.toString() !== userId.toString()) {
      return res.status(403).json({ 
        error: 'Access denied' 
      });
    }

    res.json({
      leaveRequest: {
        id: leaveRequest._id,
        fromDate: leaveRequest.fromDate,
        toDate: leaveRequest.toDate,
        reason: leaveRequest.reason,
        type: leaveRequest.type,
        status: leaveRequest.status,
        remarks: leaveRequest.remarks,
        isUrgent: leaveRequest.isUrgent,
        urgentReason: leaveRequest.urgentReason,
        contactDetails: leaveRequest.contactDetails,
        student: leaveRequest.student,
        approvedBy: leaveRequest.approvedBy,
        approvedAt: leaveRequest.approvedAt,
        createdAt: leaveRequest.createdAt,
        duration: leaveRequest.duration,
        isOverdue: leaveRequest.isOverdue
      }
    });

  } catch (error) {
    console.error('Get leave request error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch leave request' 
    });
  }
});

// Cancel leave request (Student only, if pending)
router.delete('/:id', [
  authenticateToken,
  requireStudent,
  param('id').isMongoId().withMessage('Valid leave request ID is required')
], async (req, res) => {
  try {
    const { id } = req.params;
    const studentId = req.user._id;

    const leaveRequest = await LeaveRequest.findById(id);
    
    if (!leaveRequest) {
      return res.status(404).json({ 
        error: 'Leave request not found' 
      });
    }

    if (leaveRequest.student.toString() !== studentId.toString()) {
      return res.status(403).json({ 
        error: 'You can only cancel your own leave requests' 
      });
    }

    if (leaveRequest.status !== 'pending') {
      return res.status(400).json({ 
        error: 'Only pending leave requests can be cancelled' 
      });
    }

    await LeaveRequest.findByIdAndDelete(id);

    res.json({
      message: 'Leave request cancelled successfully'
    });

  } catch (error) {
    console.error('Cancel leave error:', error);
    res.status(500).json({ 
      error: 'Failed to cancel leave request' 
    });
  }
});

module.exports = router;
