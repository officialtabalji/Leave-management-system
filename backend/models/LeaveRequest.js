const mongoose = require('mongoose');

const leaveRequestSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Student is required'],
    index: true
  },
  fromDate: {
    type: Date,
    required: [true, 'From date is required'],
    validate: {
      validator: function(v) {
        return v >= new Date();
      },
      message: 'From date cannot be in the past'
    }
  },
  toDate: {
    type: Date,
    required: [true, 'To date is required'],
    validate: {
      validator: function(v) {
        return v >= this.fromDate;
      },
      message: 'To date must be after or equal to from date'
    }
  },
  reason: {
    type: String,
    required: [true, 'Reason is required'],
    trim: true,
    maxlength: [500, 'Reason cannot exceed 500 characters']
  },
  type: {
    type: String,
    enum: ['day', 'home'],
    required: [true, 'Leave type is required'],
    default: 'day'
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
    index: true
  },
  remarks: {
    type: String,
    trim: true,
    maxlength: [200, 'Remarks cannot exceed 200 characters']
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  approvedAt: {
    type: Date
  },
  contactDetails: {
    address: {
      type: String,
      required: [true, 'Address during leave is required'],
      trim: true,
      maxlength: [300, 'Address cannot exceed 300 characters']
    },
    phone: {
      type: String,
      required: [true, 'Contact phone during leave is required'],
      trim: true,
      match: [/^[0-9]{10}$/, 'Phone number must be 10 digits']
    },
    emergencyContact: {
      name: {
        type: String,
        required: [true, 'Emergency contact name is required'],
        trim: true,
        maxlength: [100, 'Emergency contact name cannot exceed 100 characters']
      },
      relationship: {
        type: String,
        required: [true, 'Emergency contact relationship is required'],
        trim: true,
        maxlength: [50, 'Relationship cannot exceed 50 characters']
      },
      phone: {
        type: String,
        required: [true, 'Emergency contact phone is required'],
        trim: true,
        match: [/^[0-9]{10}$/, 'Emergency contact phone must be 10 digits']
      }
    }
  },
  attachments: [{
    filename: String,
    originalName: String,
    mimeType: String,
    size: Number,
    url: String
  }],
  isUrgent: {
    type: Boolean,
    default: false
  },
  urgentReason: {
    type: String,
    trim: true,
    maxlength: [200, 'Urgent reason cannot exceed 200 characters'],
    validate: {
      validator: function(v) {
        return this.isUrgent ? !!v : true;
      },
      message: 'Urgent reason is required when marking as urgent'
    }
  }
}, {
  timestamps: true
});

// Indexes for better query performance
leaveRequestSchema.index({ student: 1, status: 1 });
leaveRequestSchema.index({ status: 1, createdAt: -1 });
leaveRequestSchema.index({ fromDate: 1, toDate: 1 });
leaveRequestSchema.index({ approvedBy: 1, approvedAt: -1 });

// Virtual for leave duration in days
leaveRequestSchema.virtual('duration').get(function() {
  if (this.fromDate && this.toDate) {
    const diffTime = Math.abs(this.toDate - this.fromDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays + 1; // Including both start and end dates
  }
  return 0;
});

// Virtual for isOverdue
leaveRequestSchema.virtual('isOverdue').get(function() {
  if (this.status === 'pending' && this.fromDate < new Date()) {
    return true;
  }
  return false;
});

// Pre-save middleware to validate dates
leaveRequestSchema.pre('save', function(next) {
  if (this.fromDate && this.toDate) {
    if (this.fromDate < new Date()) {
      return next(new Error('From date cannot be in the past'));
    }
    if (this.toDate < this.fromDate) {
      return next(new Error('To date must be after or equal to from date'));
    }
  }
  next();
});

// Pre-save middleware to validate urgent requests
leaveRequestSchema.pre('save', function(next) {
  if (this.isUrgent && !this.urgentReason) {
    return next(new Error('Urgent reason is required when marking as urgent'));
  }
  next();
});

// Method to approve leave
leaveRequestSchema.methods.approve = function(approvedBy, remarks = '') {
  this.status = 'approved';
  this.approvedBy = approvedBy;
  this.approvedAt = new Date();
  this.remarks = remarks;
  return this.save();
};

// Method to reject leave
leaveRequestSchema.methods.reject = function(approvedBy, remarks = '') {
  this.status = 'rejected';
  this.approvedBy = approvedBy;
  this.approvedAt = new Date();
  this.remarks = remarks;
  return this.save();
};

// Static method to get pending requests
leaveRequestSchema.statics.getPendingRequests = function() {
  return this.find({ status: 'pending' })
    .populate('student', 'name email studentId department year hostel roomNumber')
    .sort({ createdAt: -1 });
};

// Static method to get student requests
leaveRequestSchema.statics.getStudentRequests = function(studentId) {
  return this.find({ student: studentId })
    .populate('approvedBy', 'name role')
    .sort({ createdAt: -1 });
};

module.exports = mongoose.model('LeaveRequest', leaveRequestSchema);
