# NIT Goa LMS - Leave Management System

A comprehensive Leave Management System built for National Institute of Technology Goa, featuring Google OAuth authentication, role-based access control, and a modern web interface.

## 🚀 Features

### 🔐 Authentication
- **Google OAuth Integration** - Secure login with @nitgoa.ac.in emails only
- **Role-based Access Control** - Student, Caretaker/Warden, and Admin roles
- **JWT Token Management** - Secure session handling

### 👨‍🎓 Student Features
- Apply for leave requests (Day/Home leave)
- Track request status (Pending/Approved/Rejected)
- View leave history and statistics
- Profile management with contact details
- Emergency contact information

### 👨‍🏫 Caretaker/Warden Features
- Dashboard with pending leave requests
- Approve/reject leave requests with remarks
- View approval history
- Student information lookup
- Urgent request highlighting

### 👨‍💼 Admin Features
- System-wide monitoring and analytics
- User management and role assignment
- Comprehensive reporting system
- Department-wise statistics
- Leave request filtering and search

### 🛡️ Security Features
- Domain-restricted authentication (@nitgoa.ac.in only)
- Rate limiting and request validation
- Input sanitization and validation
- CORS protection and security headers

## 🛠️ Tech Stack

### Backend
- **Node.js** with **Express.js** framework
- **MongoDB** with **Mongoose** ODM
- **Google OAuth 2.0** for authentication
- **JWT** for session management
- **Express Validator** for input validation
- **Helmet** for security headers

### Frontend
- **Next.js 14** with **React 18**
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **React Hook Form** for form management
- **React Hot Toast** for notifications
- **Lucide React** for icons

### Deployment
- **Vercel** (Frontend)
- **Render/Heroku** (Backend)
- **MongoDB Atlas** (Database)

## 📋 Prerequisites

- Node.js 18+ and npm
- MongoDB instance (local or Atlas)
- Google Cloud Console project with OAuth 2.0 credentials
- Git

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone <repository-url>
cd nit-goa-lms
```

### 2. Install Dependencies
```bash
# Install root dependencies
npm install

# Install all project dependencies
npm run install:all
```

### 3. Environment Setup

#### Backend Environment
Create `backend/.env` file:
```env
# Server Configuration
PORT=5000
NODE_ENV=development

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/nit-goa-lms

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here-change-in-production

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000
```

#### Frontend Environment
Create `frontend/.env.local` file:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-oauth-client-id
```

### 4. Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API and Google OAuth 2.0
4. Create OAuth 2.0 credentials
5. Add authorized origins:
   - `http://localhost:3000` (development)
   - `https://your-domain.vercel.app` (production)
6. Add authorized redirect URIs:
   - `http://localhost:3000` (development)
   - `https://your-domain.vercel.app` (production)

### 5. Database Setup

#### Local MongoDB
```bash
# Start MongoDB service
mongod

# Or using Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

#### MongoDB Atlas
1. Create account at [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create new cluster
3. Get connection string
4. Update `MONGODB_URI` in backend `.env`

### 6. Run the Application

#### Development Mode
```bash
# Run both frontend and backend
npm run dev

# Or run separately
npm run dev:backend  # Backend on port 5000
npm run dev:frontend # Frontend on port 3000
```

#### Production Mode
```bash
# Build frontend
npm run build

# Start production server
npm start
```

## 📁 Project Structure

```
nit-goa-lms/
├── backend/                 # Node.js Express backend
│   ├── models/             # MongoDB models
│   ├── routes/             # API routes
│   ├── middleware/         # Authentication & validation
│   ├── server.js           # Main server file
│   └── package.json        # Backend dependencies
├── frontend/               # Next.js React frontend
│   ├── app/                # Next.js 14 app directory
│   ├── components/         # React components
│   ├── hooks/              # Custom React hooks
│   ├── styles/             # CSS and styling
│   └── package.json        # Frontend dependencies
├── package.json            # Root package.json
└── README.md               # This file
```

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/google` - Google OAuth login
- `GET /api/auth/verify` - Verify JWT token
- `PUT /api/auth/profile` - Update user profile
- `POST /api/auth/logout` - Logout user

### Leave Management
- `POST /api/leave/apply` - Apply for leave
- `GET /api/leave/my-requests` - Get student's leave requests
- `GET /api/leave/pending` - Get pending requests (approvers)
- `PUT /api/leave/:id/approve` - Approve leave request
- `PUT /api/leave/:id/reject` - Reject leave request
- `GET /api/leave/:id` - Get leave request details

### User Management
- `GET /api/user/profile` - Get user profile
- `PUT /api/user/profile` - Update user profile
- `GET /api/user/dashboard` - Get dashboard data
- `GET /api/user/stats` - Get user statistics

### Admin Operations
- `GET /api/admin/stats` - Get system statistics
- `GET /api/admin/users` - Get all users
- `PUT /api/admin/users/:id/role` - Update user role
- `GET /api/admin/leave-requests` - Get all leave requests
- `POST /api/admin/reports/generate` - Generate reports

## 🎨 UI Components

The system includes reusable UI components:
- **Buttons** - Primary, secondary, success, warning, error variants
- **Cards** - Header, content, and footer sections
- **Forms** - Input fields, labels, and error handling
- **Badges** - Status indicators and labels
- **Navigation** - Responsive navigation components

## 🔒 Security Considerations

- **Domain Restriction** - Only @nitgoa.ac.in emails allowed
- **JWT Tokens** - Secure token-based authentication
- **Input Validation** - Server-side validation for all inputs
- **Rate Limiting** - Protection against brute force attacks
- **CORS Configuration** - Restricted cross-origin requests
- **Security Headers** - Helmet.js for security headers

## 🚀 Deployment

### Frontend (Vercel)
1. Connect GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Backend (Render/Heroku)
1. Connect repository to deployment platform
2. Set environment variables
3. Configure build commands and start scripts
4. Set up automatic deployments

### Database (MongoDB Atlas)
1. Create production cluster
2. Configure network access and security
3. Update connection string in backend environment

## 📊 Database Schema

### Users Collection
```javascript
{
  name: String,
  email: String (unique, @nitgoa.ac.in only),
  role: Enum ['student', 'caretaker', 'warden', 'admin'],
  studentId: String,
  department: String,
  year: Number (1-4),
  hostel: String,
  roomNumber: String,
  contactNumber: String,
  emergencyContact: Object,
  googleId: String,
  profilePicture: String,
  isActive: Boolean,
  lastLogin: Date
}
```

### LeaveRequests Collection
```javascript
{
  student: ObjectId (ref: User),
  fromDate: Date,
  toDate: Date,
  reason: String,
  type: Enum ['day', 'home'],
  status: Enum ['pending', 'approved', 'rejected'],
  remarks: String,
  approvedBy: ObjectId (ref: User),
  approvedAt: Date,
  contactDetails: Object,
  isUrgent: Boolean,
  urgentReason: String
}
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Team

- **NIT Goa LMS Team** - Development and maintenance
- **Students & Faculty** - Testing and feedback

## 📞 Support

For support and questions:
- Create an issue in the GitHub repository
- Contact the development team
- Check the documentation

## 🔄 Updates

Stay updated with the latest features and improvements:
- Watch the repository for updates
- Check the releases page
- Follow the development blog

---

**Built with ❤️ for NIT Goa Community**
