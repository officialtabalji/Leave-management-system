const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [
      /^[a-zA-Z0-9._%+-]+@nitgoa\.ac\.in$/,
      'Only NIT Goa email addresses are allowed (@nitgoa.ac.in)'
    ]
  },
  role: {
    type: String,
    enum: ['student', 'caretaker', 'warden', 'admin'],
    default: 'student',
    required: true
  },
  studentId: {
    type: String,
    sparse: true,
    validate: {
      validator: function(v) {
        return this.role === 'student' ? !!v : true;
      },
      message: 'Student ID is required for students'
    }
  },
  department: {
    type: String,
    trim: true,
    maxlength: [100, 'Department cannot exceed 100 characters']
  },
  year: {
    type: Number,
    min: [1, 'Year must be at least 1'],
    max: [4, 'Year cannot exceed 4'],
    validate: {
      validator: function(v) {
        return this.role === 'student' ? !!v : true;
      },
      message: 'Year is required for students'
    }
  },
  hostel: {
    type: String,
    trim: true,
    maxlength: [100, 'Hostel cannot exceed 100 characters']
  },
  roomNumber: {
    type: String,
    trim: true,
    maxlength: [20, 'Room number cannot exceed 20 characters']
  },
  contactNumber: {
    type: String,
    trim: true,
    match: [/^[0-9]{10}$/, 'Contact number must be 10 digits']
  },
  emergencyContact: {
    name: String,
    relationship: String,
    phone: String
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true
  },
  profilePicture: {
    type: String,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for better query performance
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ googleId: 1 });

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return this.name;
});

// Method to check if user is admin
userSchema.methods.isAdmin = function() {
  return this.role === 'admin';
};

// Method to check if user can approve leaves
userSchema.methods.canApproveLeaves = function() {
  return ['caretaker', 'warden', 'admin'].includes(this.role);
};

// Method to check if user is student
userSchema.methods.isStudent = function() {
  return this.role === 'student';
};

// Pre-save middleware to validate email domain
userSchema.pre('save', function(next) {
  if (this.email && !this.email.endsWith('@nitgoa.ac.in')) {
    return next(new Error('Only NIT Goa email addresses are allowed'));
  }
  next();
});

// Pre-save middleware to validate student-specific fields
userSchema.pre('save', function(next) {
  if (this.role === 'student') {
    if (!this.studentId) {
      return next(new Error('Student ID is required for students'));
    }
    if (!this.year || this.year < 1 || this.year > 4) {
      return next(new Error('Valid year (1-4) is required for students'));
    }
  }
  next();
});

module.exports = mongoose.model('User', userSchema);
