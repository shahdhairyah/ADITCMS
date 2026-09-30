# Phase-by-Phase Implementation Plan
# ADIT College Management System
# Version: 1.0 | Date: July 2026

---

## Project Overview

**Project Name:** ADIT College Management System
**Technology Stack:** React.js + PHP + MySQL
**Total Duration:** 24 Weeks (6 Months)
**Team Size:** 4-6 Members (Recommended for Final Year Project)

---

## Phase 0: Project Setup & Foundation (Week 1-2)

### Objectives
- Set up development environment
- Establish project architecture
- Create database schema
- Set up version control

### Tasks

#### Environment Setup
| # | Task | Duration | Assignee |
|---|------|----------|----------|
| 0.1 | Install XAMPP/WAMP (Apache + MySQL + PHP) | Day 1 | Full Team |
| 0.2 | Install Node.js 18+ and npm | Day 1 | Full Team |
| 0.3 | Install VS Code with extensions (ESLint, Prettier, PHP Intelephense) | Day 1 | Full Team |
| 0.4 | Install Git and create GitHub repository | Day 1 | Team Lead |
| 0.5 | Install Postman for API testing | Day 1 | Backend Dev |

#### Project Structure
| # | Task | Duration | Assignee |
|---|------|----------|----------|
| 0.6 | Create React app with Vite | Day 2 | Frontend Dev |
| 0.7 | Set up PHP project structure (MVC pattern) | Day 2 | Backend Dev |
| 0.8 | Create MySQL database and tables | Day 3 | Database Admin |
| 0.9 | Set up API routing (.htaccess for PHP) | Day 3 | Backend Dev |
| 0.10 | Create environment files (.env) | Day 3 | Full Team |

#### Database Implementation
```sql
-- Core Tables to Create in Phase 0:
CREATE DATABASE adit_cms;
USE adit_cms;

-- Authentication
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('student','faculty','hod','admin','librarian') NOT NULL,
    status ENUM('active','inactive','suspended') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Students
CREATE TABLE students (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    roll_number VARCHAR(20) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    dob DATE,
    gender ENUM('male','female','other'),
    phone VARCHAR(15),
    address TEXT,
    photo VARCHAR(255),
    department_id INT,
    semester INT,
    batch VARCHAR(20),
    admission_date DATE,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (department_id) REFERENCES departments(id)
);

-- Faculty
CREATE TABLE faculty (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    employee_id VARCHAR(20) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    qualification VARCHAR(100),
    experience_years INT,
    department_id INT,
    designation VARCHAR(50),
    phone VARCHAR(15),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (department_id) REFERENCES departments(id)
);

-- Departments
CREATE TABLE departments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(10) UNIQUE NOT NULL,
    hod_id INT,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Continue with all tables from PRD...
```

#### Configuration
| # | Task | Duration | Assignee |
|---|------|----------|----------|
| 0.11 | Set up PHP database connection class (PDO) | Day 4 | Backend Dev |
| 0.12 | Create JWT helper functions | Day 4 | Backend Dev |
| 0.13 | Set up CORS headers in PHP | Day 4 | Backend Dev |
| 0.14 | Configure React Router | Day 5 | Frontend Dev |
| 0.15 | Set up Axios with base URL | Day 5 | Frontend Dev |
| 0.16 | Create React context for Auth | Day 5 | Frontend Dev |
| 0.17 | Set up MUI/Tailwind CSS | Day 6 | Frontend Dev |
| 0.18 | Create base layout components | Day 6 | Frontend Dev |
| 0.19 | Set up Redux store (if using Redux) | Day 7 | Frontend Dev |
| 0.20 | Create database seed script | Day 7 | Database Admin |

### Deliverables
- [ ] Working development environment
- [ ] Database with all core tables
- [ ] PHP project structure with routing
- [ ] React app with routing and auth context
- [ ] Git repository with initial commit
- [ ] README with setup instructions

### Project Structure
```
adit-cms/
├── frontend/                    # React Application
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   │   ├── common/          # Reusable components
│   │   │   ├── auth/            # Login, Register
│   │   │   ├── student/         # Student module components
│   │   │   ├── faculty/         # Faculty module components
│   │   │   ├── admin/           # Admin module components
│   │   │   └── layout/          # Header, Sidebar, Footer
│   │   ├── pages/
│   │   │   ├── auth/
│   │   │   ├── student/
│   │   │   ├── faculty/
│   │   │   ├── admin/
│   │   │   └── common/
│   │   ├── context/
│   │   ├── hooks/
│   │   ├── services/            # API calls
│   │   ├── store/               # Redux store
│   │   ├── utils/
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
│
├── backend/                     # PHP API
│   ├── config/
│   │   ├── database.php
│   │   └── config.php
│   ├── controllers/
│   │   ├── AuthController.php
│   │   ├── StudentController.php
│   │   ├── FacultyController.php
│   │   ├── AttendanceController.php
│   │   ├── AssignmentController.php
│   │   ├── FeeController.php
│   │   ├── LibraryController.php
│   │   ├── ExamController.php
│   │   ├── TimetableController.php
│   │   └── AdminController.php
│   ├── models/
│   │   ├── User.php
│   │   ├── Student.php
│   │   ├── Faculty.php
│   │   ├── Attendance.php
│   │   ├── Assignment.php
│   │   ├── Fee.php
│   │   ├── Library.php
│   │   ├── Exam.php
│   │   └── Timetable.php
│   ├── middleware/
│   │   ├── AuthMiddleware.php
│   │   └── RoleMiddleware.php
│   ├── helpers/
│   │   ├── JWT.php
│   │   ├── Response.php
│   │   └── Validation.php
│   ├── routes/
│   │   ├── api.php
│   │   └── .htaccess
│   ├── uploads/
│   │   ├── profiles/
│   │   ├── assignments/
│   │   ├── materials/
│   │   └── receipts/
│   ├── .htaccess
│   └── index.php
│
├── database/
│   ├── schema.sql
│   ├── seed.sql
│   └── migrations/
│
├── docs/
│   ├── PRD.md
│   └── PhasePlan.md
│
├── .gitignore
└── README.md
```

---

## Phase 1: Authentication & User Management (Week 3-4)

### Objectives
- Implement user registration and login
- Role-based access control
- Profile management
- Password reset functionality

### Tasks

#### Backend (Week 3)
| # | Task | Duration | Dependencies |
|---|------|----------|--------------|
| 1.1 | Create AuthController (register, login, logout) | Day 1 | Phase 0 |
| 1.2 | Implement JWT token generation/verification | Day 1 | Phase 0 |
| 1.3 | Create password hashing (bcrypt) functions | Day 1 | Phase 0 |
| 1.4 | Create User model (CRUD operations) | Day 2 | 1.1 |
| 1.5 | Create Student model | Day 2 | 1.4 |
| 1.6 | Create Faculty model | Day 2 | 1.4 |
| 1.7 | Create AuthMiddleware (JWT verification) | Day 3 | 1.2 |
| 1.8 | Create RoleMiddleware (role checking) | Day 3 | 1.7 |
| 1.9 | Create password reset endpoint | Day 3 | 1.1 |
| 1.10 | Create email verification endpoint | Day 3 | 1.1 |
| 1.11 | API testing with Postman | Day 4 | 1.1-1.10 |

#### Frontend (Week 4)
| # | Task | Duration | Dependencies |
|---|------|----------|--------------|
| 1.12 | Create Login page (email + password) | Day 1 | Phase 0 |
| 1.13 | Create Register page (student/faculty) | Day 1 | 1.12 |
| 1.14 | Create AuthContext (login, logout, user state) | Day 2 | 1.12 |
| 1.15 | Create ProtectedRoute component | Day 2 | 1.14 |
| 1.16 | Create ForgotPassword page | Day 3 | 1.14 |
| 1.17 | Create ResetPassword page | Day 3 | 1.16 |
| 1.18 | Create Profile page | Day 4 | 1.14 |
| 1.19 | Create ProfileEdit component | Day 4 | 1.18 |
| 1.20 | Create role-based Dashboard routing | Day 5 | 1.14 |
| 1.21 | Create API service layer (axios interceptors) | Day 5 | 1.14 |
| 1.22 | UI testing and bug fixes | Day 6-7 | 1.12-1.21 |

### API Endpoints
```php
// Auth Routes
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
POST /api/auth/forgot-password
POST /api/auth/reset-password
GET  /api/auth/me

// User Routes
GET    /api/users
GET    /api/users/:id
POST   /api/users
PUT    /api/users/:id
DELETE /api/users/:id
```

### Deliverables
- [ ] Working login/register system
- [ ] JWT authentication flow
- [ ] Role-based route protection
- [ ] Profile management
- [ ] Password reset via email

---

## Phase 2: Student Module Core (Week 5-8)

### Objectives
- Student dashboard
- Attendance viewing
- Assignment viewing and submission
- Notice board
- Leave application

### Tasks

#### Week 5: Student Dashboard & Profile
| # | Task | Duration | Dependencies |
|---|------|----------|--------------|
| 2.1 | Create Student Dashboard page | Day 1 | Phase 1 |
| 2.2 | Create dashboard cards (attendance, fees, notices) | Day 2 | 2.1 |
| 2.3 | Create Student Profile page | Day 2 | Phase 1 |
| 2.4 | Create ID Card component | Day 3 | 2.3 |
| 2.5 | Create ID Card PDF generation | Day 3 | 2.4 |
| 2.6 | Create Attendance model and controller | Day 4 | Phase 0 |
| 2.7 | Create attendance viewing page | Day 5 | 2.6 |
| 2.8 | Create attendance calendar component | Day 5 | 2.7 |
| 2.9 | Create attendance summary component | Day 6 | 2.7 |
| 2.10 | Create attendance percentage indicator | Day 6 | 2.9 |

#### Week 6: Assignments & Lab Manuals
| # | Task | Duration | Dependencies |
|---|------|----------|--------------|
| 2.11 | Create Assignment model and controller | Day 1 | Phase 0 |
| 2.12 | Create assignment list page | Day 2 | 2.11 |
| 2.13 | Create assignment detail page | Day 2 | 2.12 |
| 2.14 | Create file upload component | Day 3 | 2.13 |
| 2.15 | Create assignment submission flow | Day 3 | 2.14 |
| 2.16 | Create submission status tracking | Day 4 | 2.15 |
| 2.17 | Create Lab Manual model | Day 4 | Phase 0 |
| 2.18 | Create lab manual viewing page | Day 5 | 2.17 |
| 2.19 | Create lab manual submission page | Day 5 | 2.18 |
| 2.20 | Create lab manual status page | Day 6 | 2.19 |

#### Week 7: Notices & Leave Application
| # | Task | Duration | Dependencies |
|---|------|----------|--------------|
| 2.21 | Create Notice model and controller | Day 1 | Phase 0 |
| 2.22 | Create notice board page | Day 2 | 2.21 |
| 2.23 | Create notice detail modal | Day 2 | 2.22 |
| 2.24 | Create notice filter (college/department) | Day 3 | 2.22 |
| 2.25 | Create Leave Application model | Day 3 | Phase 0 |
| 2.26 | Create leave application form | Day 4 | 2.25 |
| 2.27 | Create leave history page | Day 4 | 2.26 |
| 2.28 | Create leave status tracking | Day 5 | 2.27 |
| 2.29 | Create document upload for leave | Day 5 | 2.26 |
| 2.30 | Create email notification for leave | Day 6 | 2.27 |

#### Week 8: Results & Syllabus
| # | Task | Duration | Dependencies |
|---|------|----------|--------------|
| 2.31 | Create Result model and controller | Day 1 | Phase 0 |
| 2.32 | Create results viewing page | Day 2 | 2.31 |
| 2.33 | Create CGPA calculator component | Day 2 | 2.32 |
| 2.34 | Create performance graph component | Day 3 | 2.32 |
| 2.35 | Create mark sheet PDF generation | Day 3 | 2.32 |
| 2.36 | Create Syllabus model | Day 4 | Phase 0 |
| 2.37 | Create syllabus viewing page | Day 4 | 2.36 |
| 2.38 | Create syllabus download component | Day 5 | 2.37 |
| 2.39 | Create syllabus progress tracker | Day 5 | 2.37 |
| 2.40 | Testing and bug fixes | Day 6-7 | All |

### API Endpoints
```php
// Student Routes
GET    /api/students
GET    /api/students/:id
PUT    /api/students/:id

// Attendance Routes
GET    /api/attendance?student_id=&subject_id=&date=
GET    /api/attendance/student/:id/summary
GET    /api/attendance/student/:id/calendar

// Assignment Routes
GET    /api/assignments?subject_id=
GET    /api/assignments/:id
POST   /api/assignments/:id/submit
GET    /api/assignments/submissions/:student_id

// Notice Routes
GET    /api/notices?type=&department_id=
GET    /api/notices/:id

// Leave Routes
POST   /api/leave-applications
GET    /api/leave-applications?student_id=
PUT    /api/leave-applications/:id

// Result Routes
GET    /api/results?student_id=&semester=
GET    /api/results/:id/marks

// Syllabus Routes
GET    /api/syllabus?subject_id=
GET    /api/syllabus/:id
```

### Deliverables
- [ ] Student dashboard with all cards
- [ ] Attendance viewing with calendar
- [ ] Assignment viewing and submission
- [ ] Notice board
- [ ] Leave application system
- [ ] Results viewing
- [ ] Syllabus viewing

---

## Phase 3: Faculty Module (Week 9-12)

### Objectives
- Faculty dashboard
- Attendance marking
- Assignment creation and management
- Study material upload
- Marks entry

### Tasks

#### Week 9: Faculty Dashboard & Attendance
| # | Task | Duration | Dependencies |
|---|------|----------|--------------|
| 3.1 | Create Faculty Dashboard page | Day 1 | Phase 1 |
| 3.2 | Create assigned classes/subjects view | Day 2 | 3.1 |
| 3.3 | Create Attendance marking page | Day 3 | Phase 2 |
| 3.4 | Create student list component for attendance | Day 3 | 3.3 |
| 3.5 | Create attendance marking API | Day 4 | 3.3 |
| 3.6 | Create attendance edit functionality | Day 4 | 3.5 |
| 3.7 | Create attendance reports page | Day 5 | 3.5 |
| 3.8 | Create attendance statistics component | Day 5 | 3.7 |
| 3.9 | Create attendance export (Excel/PDF) | Day 6 | 3.7 |
| 3.10 | Test attendance flow end-to-end | Day 7 | All |

#### Week 10: Assignment Management
| # | Task | Duration | Dependencies |
|---|------|----------|--------------|
| 3.11 | Create Assignment creation page | Day 1 | Phase 2 |
| 3.12 | Create assignment form with file upload | Day 2 | 3.11 |
| 3.13 | Create assignment API (CRUD) | Day 2 | 3.11 |
| 3.14 | Create submissions viewing page | Day 3 | 3.13 |
| 3.15 | Create submission review component | Day 3 | 3.14 |
| 3.16 | Create marks/feedback entry | Day 4 | 3.15 |
| 3.17 | Create accept/reject functionality | Day 4 | 3.16 |
| 3.18 | Create deadline extension feature | Day 5 | 3.13 |
| 3.19 | Create assignment notifications | Day 5 | 3.17 |
| 3.20 | Test assignment flow | Day 6-7 | All |

#### Week 11: Lab Manuals & Study Materials
| # | Task | Duration | Dependencies |
|---|------|----------|--------------|
| 3.21 | Create Lab Manual creation page | Day 1 | Phase 2 |
| 3.22 | Create lab manual review page | Day 2 | 3.21 |
| 3.23 | Create lab manual marking component | Day 2 | 3.22 |
| 3.24 | Create Study Material upload page | Day 3 | Phase 0 |
| 3.25 | Create material organization (by subject/topic) | Day 3 | 3.24 |
| 3.26 | Create material sharing with classes | Day 4 | 3.25 |
| 3.27 | Create material CRUD operations | Day 4 | 3.26 |
| 3.28 | Create material download tracking | Day 5 | 3.27 |
| 3.29 | Test lab manual and material flows | Day 6-7 | All |

#### Week 12: Marks Entry & Announcements
| # | Task | Duration | Dependencies |
|---|------|----------|--------------|
| 3.30 | Create Internal Marks entry page | Day 1 | Phase 2 |
| 3.31 | Create marks entry form (unit tests) | Day 2 | 3.30 |
| 3.32 | Create marks API (enter/edit) | Day 2 | 3.30 |
| 3.33 | Create class performance analytics | Day 3 | 3.32 |
| 3.34 | Create subject performance reports | Day 3 | 3.33 |
| 3.35 | Create Announcement creation page | Day 4 | Phase 2 |
| 3.36 | Create announcement API | Day 4 | 3.35 |
| 3.37 | Create announcement targeting (class/subject) | Day 5 | 3.36 |
| 3.38 | Create announcement read tracking | Day 5 | 3.37 |
| 3.39 | Faculty module testing | Day 6-7 | All |

### API Endpoints
```php
// Attendance Routes
POST   /api/attendance/mark
PUT    /api/attendance/:id
GET    /api/attendance?subject_id=&date=
GET    /api/attendance/report?class=&subject=&from=&to=

// Assignment Routes
POST   /api/assignments
PUT    /api/assignments/:id
DELETE /api/assignments/:id
GET    /api/assignments/:id/submissions
PUT    /api/assignments/submissions/:id/review

// Lab Manual Routes
POST   /api/lab-manuals
GET    /api/lab-manuals/:id/submissions
PUT    /api/lab-manuals/submissions/:id/review

// Study Material Routes
POST   /api/materials
PUT    /api/materials/:id
DELETE /api/materials/:id
GET    /api/materials?subject_id=

// Marks Routes
POST   /api/marks/internal
PUT    /api/marks/internal/:id
GET    /api/marks?subject_id=&semester=

// Announcement Routes
POST   /api/announcements
GET    /api/announcements?class_id=&subject_id=
```

### Deliverables
- [ ] Faculty dashboard
- [ ] Attendance marking system
- [ ] Assignment creation and management
- [ ] Lab manual review system
- [ ] Study material management
- [ ] Marks entry system
- [ ] Announcement system

---

## Phase 4: Fee Payment & Finance (Week 13-15)

### Objectives
- Razorpay integration
- Fee structure management
- Payment processing
- Receipt generation
- Payment history

### Tasks

#### Week 13: Razorpay Setup & Fee Structure
| # | Task | Duration | Dependencies |
|---|------|----------|--------------|
| 4.1 | Create Razorpay account (test mode) | Day 1 | - |
| 4.2 | Install Razorpay PHP SDK | Day 1 | 4.1 |
| 4.3 | Install Razorpay React SDK | Day 1 | 4.1 |
| 4.4 | Create Fee Structure model | Day 2 | Phase 0 |
| 4.5 | Create Fee Structure CRUD (Admin) | Day 2 | 4.4 |
| 4.6 | Create fee structure viewing (Student) | Day 3 | 4.5 |
| 4.7 | Create pending dues calculation | Day 3 | 4.6 |
| 4.8 | Create fee installment management | Day 4 | 4.5 |
| 4.9 | Create fee reminder system | Day 4 | 4.8 |
| 4.10 | Test fee structure flow | Day 5 | All |

#### Week 14: Payment Processing
| # | Task | Duration | Dependencies |
|---|------|----------|--------------|
| 4.11 | Create createOrder API endpoint | Day 1 | 4.3 |
| 4.12 | Create Razorpay checkout component | Day 2 | 4.11 |
| 4.13 | Create payment verification API | Day 2 | 4.12 |
| 4.14 | Create payment success page | Day 3 | 4.13 |
| 4.15 | Create payment failure handling | Day 3 | 4.14 |
| 4.16 | Create payment status tracking | Day 4 | 4.15 |
| 4.17 | Create refund handling (if needed) | Day 4 | 4.16 |
| 4.18 | Create payment email confirmation | Day 5 | 4.14 |
| 4.19 | Test payment flow (test mode) | Day 6-7 | All |

#### Week 15: Receipts & Reports
| # | Task | Duration | Dependencies |
|---|------|----------|--------------|
| 4.20 | Create PDF receipt generation | Day 1 | 4.14 |
| 4.21 | Create receipt download component | Day 2 | 4.20 |
| 4.22 | Create payment history page | Day 2 | 4.16 |
| 4.23 | Create payment history API | Day 3 | 4.22 |
| 4.24 | Create admin payment dashboard | Day 3 | 4.23 |
| 4.25 | Create fee collection reports | Day 4 | 4.24 |
| 4.26 | Create pending dues report | Day 4 | 4.25 |
| 4.27 | Create Excel export for reports | Day 5 | 4.26 |
| 4.28 | Full payment flow testing | Day 6-7 | All |

### Razorpay Integration Code
```php
// Backend: Create Order
require 'razorpay/Razorpay.php';
use Razorpay\Api\Api;

$orderData = [
    'receipt' => 'order_receipt_' . $paymentId,
    'amount' => $amount * 100, // Amount in paise
    'currency' => 'INR',
    'payment_capture' => 1
];

$api = new Api($keyId, $keySecret);
$order = $api->order->create($orderData);

// Backend: Verify Payment
$attributes = [
    'razorpay_signature' => $_POST['razorpay_signature'],
    'razorpay_payment_id' => $_POST['razorpay_payment_id'],
    'razorpay_order_id' => $_POST['razorpay_order_id']
];

$api = new Api($keyId, $keySecret);
$attributes = $api->utility->verifyPaymentSignature($attributes);
```

### API Endpoints
```php
// Fee Routes
GET    /api/fees/structure?course_id=&semester=
POST   /api/fees/structure
PUT    /api/fees/structure/:id
DELETE /api/fees/structure/:id

// Payment Routes
POST   /api/payments/create-order
POST   /api/payments/verify
GET    /api/payments/:student_id
GET    /api/payments/history

// Receipt Routes
GET    /api/receipts/:payment_id
GET    /api/receipts/:payment_id/download

// Report Routes
GET    /api/reports/fees/summary
GET    /api/reports/fees/pending
GET    /api/reports/fees/collected
```

### Deliverables
- [ ] Razorpay integration (test mode)
- [ ] Fee structure management
- [ ] Online payment processing
- [ ] PDF receipt generation
- [ ] Payment history
- [ ] Fee reports

---

## Phase 5: HOD & Department Module (Week 16-17)

### Objectives
- HOD dashboard
- Department management
- Faculty management
- Subject management
- Timetable creation

### Tasks

#### Week 16: HOD Dashboard & Management
| # | Task | Duration | Dependencies |
|---|------|----------|--------------|
| 5.1 | Create HOD Dashboard page | Day 1 | Phase 1 |
| 5.2 | Create department overview cards | Day 2 | 5.1 |
| 5.3 | Create attendance statistics view | Day 2 | 5.2 |
| 5.4 | Create academic performance trends | Day 3 | 5.3 |
| 5.5 | Create faculty management page | Day 3 | Phase 3 |
| 5.6 | Create subject assignment to faculty | Day 4 | 5.5 |
| 5.7 | Create student management page | Day 4 | Phase 2 |
| 5.8 | Create department reports page | Day 5 | 5.4 |
| 5.9 | Create report export functionality | Day 5 | 5.8 |
| 5.10 | Test HOD module | Day 6-7 | All |

#### Week 17: Department & Timetable
| # | Task | Duration | Dependencies |
|---|------|----------|--------------|
| 5.11 | Create Department model | Day 1 | Phase 0 |
| 5.12 | Create department information page | Day 2 | 5.11 |
| 5.13 | Create classroom allocation model | Day 2 | Phase 0 |
| 5.14 | Create classroom allocation page | Day 3 | 5.13 |
| 5.15 | Create Timetable model | Day 3 | Phase 0 |
| 5.16 | Create timetable creation page (HOD/Admin) | Day 4 | 5.15 |
| 5.17 | Create conflict detection logic | Day 4 | 5.16 |
| 5.18 | Create timetable display component | Day 5 | 5.16 |
| 5.19 | Create timetable API | Day 5 | 5.18 |
| 5.20 | Test department and timetable | Day 6-7 | All |

### API Endpoints
```php
// Department Routes
GET    /api/departments
GET    /api/departments/:id
POST   /api/departments
PUT    /api/departments/:id

// Subject Routes
GET    /api/subjects?semester=&department_id=
POST   /api/subjects
PUT    /api/subjects/:id
DELETE /api/subjects/:id

// Timetable Routes
GET    /api/timetable?branch=&semester=
POST   /api/timetable
PUT    /api/timetable/:id
DELETE /api/timetable/:id

// Classroom Routes
GET    /api/classrooms?department_id=
POST   /api/classrooms
PUT    /api/classrooms/:id
```

### Deliverables
- [ ] HOD dashboard
- [ ] Department management
- [ ] Faculty assignment to subjects
- [ ] Classroom allocation
- [ ] Timetable creation and display
- [ ] Conflict detection

---

## Phase 6: Library Module (Week 18-19)

### Objectives
- Book management
- Issue/Return system
- Fine calculation
- Student borrowing history

### Tasks

#### Week 18: Library Management
| # | Task | Duration | Dependencies |
|---|------|----------|--------------|
| 6.1 | Create Book model | Day 1 | Phase 0 |
| 6.2 | Create book CRUD operations | Day 2 | 6.1 |
| 6.3 | Create book search functionality | Day 2 | 6.2 |
| 6.4 | Create book inventory page | Day 3 | 6.2 |
| 6.5 | Create Issue model | Day 3 | Phase 0 |
| 6.6 | Create book issue page | Day 4 | 6.5 |
| 6.7 | Create book return page | Day 4 | 6.6 |
| 6.8 | Create fine calculation logic | Day 5 | 6.7 |
| 6.9 | Create fine payment integration | Day 5 | 6.8 |
| 6.10 | Test library flow | Day 6-7 | All |

#### Week 19: Borrowing History & Reports
| # | Task | Duration | Dependencies |
|---|------|----------|--------------|
| 6.11 | Create student borrowing history page | Day 1 | 6.7 |
| 6.12 | Create borrowing history API | Day 2 | 6.11 |
| 6.13 | Create library reports page | Day 3 | 6.12 |
| 6.14 | Create book availability tracking | Day 3 | 6.2 |
| 6.15 | Create due date reminder system | Day 4 | 6.7 |
| 6.16 | Create overdue book alerts | Day 4 | 6.15 |
| 6.17 | Create library statistics dashboard | Day 5 | 6.13 |
| 6.18 | Full library module testing | Day 6-7 | All |

### API Endpoints
```php
// Library Routes
GET    /api/library/books?search=&category=
POST   /api/library/books
PUT    /api/library/books/:id
DELETE /api/library/books/:id

// Issue Routes
POST   /api/library/issue
POST   /api/library/return
GET    /api/library/issues?student_id=&status=

// Fine Routes
GET    /api/library/fines/:student_id
POST   /api/library/fines/:id/pay

// History Routes
GET    /api/library/history/:student_id
GET    /api/library/statistics
```

### Deliverables
- [ ] Book management system
- [ ] Issue/Return functionality
- [ ] Fine calculation and payment
- [ ] Borrowing history
- [ ] Library reports

---

## Phase 7: Examination Module (Week 20-21)

### Objectives
- Internal marks management
- External marks entry
- Result generation
- Grade calculation
- Hall ticket generation

### Tasks

#### Week 20: Marks & Results
| # | Task | Duration | Dependencies |
|---|------|----------|--------------|
| 7.1 | Create Unit Test model | Day 1 | Phase 0 |
| 7.2 | Create internal marks entry page | Day 2 | 7.1 |
| 7.3 | Create internal marks calculation (best of 2) | Day 2 | 7.2 |
| 7.4 | Create External Marks model | Day 3 | Phase 0 |
| 7.5 | Create external marks entry page | Day 3 | 7.4 |
| 7.6 | Create total marks calculation | Day 4 | 7.3, 7.5 |
| 7.7 | Create Grade definition model | Day 4 | Phase 0 |
| 7.8 | Create grade calculation logic | Day 5 | 7.7 |
| 7.9 | Create Result generation API | Day 5 | 7.6, 7.8 |
| 7.10 | Test marks and results flow | Day 6-7 | All |

#### Week 21: Result Publishing & Hall Ticket
| # | Task | Duration | Dependencies |
|---|------|----------|--------------|
| 7.11 | Create result publishing page (Admin) | Day 1 | 7.9 |
| 7.12 | Create result viewing page (Student) | Day 2 | 7.11 |
| 7.13 | Create CGPA calculation | Day 2 | 7.12 |
| 7.14 | Create result PDF generation | Day 3 | 7.12 |
| 7.15 | Create Hall Ticket model | Day 3 | Phase 0 |
| 7.16 | Create hall ticket generation logic | Day 4 | 7.15 |
| 7.17 | Create hall ticket PDF generation | Day 4 | 7.16 |
| 7.18 | Create eligibility check (fees + attendance) | Day 5 | 7.17 |
| 7.19 | Create hall ticket download page | Day 5 | 7.18 |
| 7.20 | Full examination module testing | Day 6-7 | All |

### API Endpoints
```php
// Internal Marks Routes
POST   /api/exams/internal-marks
PUT    /api/exams/internal-marks/:id
GET    /api/exams/internal-marks?subject_id=&semester=

// External Marks Routes
POST   /api/exams/external-marks
PUT    /api/exams/external-marks/:id
GET    /api/exams/external-marks?semester=

// Result Routes
GET    /api/exams/results?student_id=&semester=
POST   /api/exams/publish-results
GET    /api/exams/results/:id

// Hall Ticket Routes
GET    /api/exams/hall-ticket/:student_id
POST   /api/exams/hall-ticket/generate

// Grade Routes
GET    /api/exams/grades
POST   /api/exams/grades
```

### Grade System
```php
// ADIT Grading Policy
$grades = [
    ['min' => 90, 'max' => 100, 'grade' => 'O',  'point' => 10],
    ['min' => 80, 'max' => 89,  'grade' => 'A+', 'point' => 9],
    ['min' => 70, 'max' => 79,  'grade' => 'A',  'point' => 8],
    ['min' => 60, 'max' => 69,  'grade' => 'B+', 'point' => 7],
    ['min' => 50, 'max' => 59,  'grade' => 'B',  'point' => 6],
    ['min' => 40, 'max' => 49,  'grade' => 'C',  'point' => 5],
    ['min' => 0,  'max' => 39,  'grade' => 'F',  'point' => 0],
];
```

### Deliverables
- [ ] Internal marks entry
- [ ] External marks entry
- [ ] Auto result generation
- [ ] Grade calculation
- [ ] Result PDF generation
- [ ] Hall ticket generation

---

## Phase 8: Administration Module (Week 22-23)

### Objectives
- Admin dashboard
- User management
- Academic calendar
- Holiday management
- System settings
- Reports and backup

### Tasks

#### Week 22: Admin Dashboard & User Management
| # | Task | Duration | Dependencies |
|---|------|----------|--------------|
| 8.1 | Create Admin Dashboard page | Day 1 | Phase 1 |
| 8.2 | Create dashboard analytics charts | Day 2 | 8.1 |
| 8.3 | Create user management page | Day 2 | Phase 1 |
| 8.4 | Create bulk user import (CSV) | Day 3 | 8.3 |
| 8.5 | Create user activation/deactivation | Day 3 | 8.3 |
| 8.6 | Create role assignment page | Day 4 | 8.3 |
| 8.7 | Create admission management page | Day 4 | Phase 1 |
| 8.8 | Create college settings page | Day 5 | 8.1 |
| 8.9 | Create logo/name configuration | Day 5 | 8.8 |
| 8.10 | Test admin module | Day 6-7 | All |

#### Week 23: Calendar, Reports & Backup
| # | Task | Duration | Dependencies |
|---|------|----------|--------------|
| 8.11 | Create Academic Calendar model | Day 1 | Phase 0 |
| 8.12 | Create calendar creation page | Day 2 | 8.11 |
| 8.13 | Create Holiday management page | Day 2 | 8.11 |
| 8.14 | Create holiday list page | Day 3 | 8.13 |
| 8.15 | Create reports dashboard | Day 3 | All |
| 8.16 | Create attendance reports (all types) | Day 4 | 8.15 |
| 8.17 | Create academic reports | Day 4 | 8.15 |
| 8.18 | Create database backup functionality | Day 5 | Phase 0 |
| 8.19 | Create database restore functionality | Day 5 | 8.18 |
| 8.20 | Create audit log viewer | Day 6 | Phase 0 |
| 8.21 | Full admin module testing | Day 7 | All |

### API Endpoints
```php
// Admin Dashboard Routes
GET    /api/admin/dashboard
GET    /api/admin/analytics

// User Management Routes
GET    /api/admin/users
POST   /api/admin/users/bulk-import
PUT    /api/admin/users/:id/status
PUT    /api/admin/users/:id/role

// Calendar Routes
GET    /api/calendar/events
POST   /api/calendar/events
PUT    /api/calendar/events/:id
DELETE /api/calendar/events/:id

// Holiday Routes
GET    /api/holidays
POST   /api/holidays
PUT    /api/holidays/:id
DELETE /api/holidays/:id

// Reports Routes
GET    /api/reports/:type
GET    /api/reports/export/:type

// Backup Routes
POST   /api/admin/backup
POST   /api/admin/restore
GET    /api/admin/backups

// Audit Routes
GET    /api/admin/audit-logs
```

### Deliverables
- [ ] Admin dashboard with analytics
- [ ] User management (CRUD + bulk import)
- [ ] Academic calendar
- [ ] Holiday management
- [ ] Comprehensive reports
- [ ] Database backup/restore

---

## Phase 9: Integration & Testing (Week 24)

### Objectives
- End-to-end integration testing
- Bug fixes
- Performance optimization
- Security testing
- Documentation

### Tasks

#### Week 24: Final Integration
| # | Task | Duration | Dependencies |
|---|------|----------|--------------|
| 9.1 | End-to-end integration testing | Day 1-2 | All |
| 9.2 | Bug fixes and error handling | Day 2-3 | 9.1 |
| 9.3 | Performance testing (load testing) | Day 3 | 9.2 |
| 9.4 | Security testing (OWASP checklist) | Day 4 | 9.3 |
| 9.5 | Responsive design testing | Day 4 | 9.2 |
| 9.6 | Cross-browser testing | Day 5 | 9.4 |
| 9.7 | API documentation (Swagger/Postman) | Day 5 | 9.5 |
| 9.8 | User manual creation | Day 6 | 9.6 |
| 9.9 | Deployment preparation | Day 6 | 9.7 |
| 9.10 | Final deployment | Day 7 | 9.8 |

### Testing Checklist
```
□ Authentication flow (all roles)
□ Attendance marking and viewing
□ Assignment creation and submission
□ Fee payment (Razorpay test mode)
□ Library issue/return
□ Result generation
□ Hall ticket generation
□ Timetable display
□ Notice board
□ Leave application
□ Reports generation
□ Database backup/restore
□ Mobile responsive
□ Cross-browser compatibility
□ API security (JWT, RBAC)
□ Input validation
□ Error handling
```

### Deliverables
- [ ] Bug-free application
- [ ] Performance optimized
- [ ] Security tested
- [ ] Documentation complete
- [ ] Deployed to production

---

## Team Roles & Responsibilities

### Recommended Team Structure (4-6 Members)

| Role | Responsibilities | Skills Required |
|------|------------------|-----------------|
| **Team Lead / Full Stack** | Architecture, code review, integration | React, PHP, MySQL, Git |
| **Frontend Developer 1** | Student & Faculty UI | React, MUI/Tailwind, Redux |
| **Frontend Developer 2** | Admin & Dashboard UI | React, Chart.js, PDF generation |
| **Backend Developer 1** | Auth, Student, Faculty APIs | PHP, MySQL, JWT, REST API |
| **Backend Developer 2** | Fee, Library, Exam APIs | PHP, Razorpay, PDF generation |
| **Database Admin** | Schema, queries, optimization | MySQL, indexing, backups |

---

## Risk Mitigation

| Risk | Probability | Impact | Mitigation Strategy |
|------|-------------|--------|---------------------|
| Razorpay integration issues | Medium | High | Use test mode early, keep manual payment option |
| Database performance | Medium | Medium | Implement indexing, query optimization |
| Team member unavailability | Low | High | Cross-training, documentation |
| Scope creep | High | Medium | Strict phase adherence, feature prioritization |
| Security vulnerabilities | Low | Critical | OWASP checklist, security audits |
| Deployment issues | Medium | High | Staging environment testing |

---

## Quality Assurance

### Code Quality Standards
- Follow PSR-12 coding standards for PHP
- Follow Airbnb ESLint rules for React
- Minimum 80% code coverage for critical modules
- Peer code reviews before merge
- No direct commits to main branch

### Testing Strategy
- Unit testing for PHP models and helpers
- Component testing for React components
- API testing with Postman collections
- End-to-end testing for critical flows
- Performance testing with Apache JMeter

---

## Deployment Plan

### Development Environment
- Local: XAMPP/WAMP + Node.js
- Version Control: Git + GitHub

### Staging Environment
- Server: College server or cloud (AWS/Azure)
- URL: staging.adit-cms.com
- Purpose: Testing before production

### Production Environment
- Server: Ubuntu 22.04 LTS
- Web Server: Nginx + PHP-FPM
- Database: MySQL 8.0
- SSL: Let's Encrypt
- URL: adit-cms.com

### Deployment Steps
```bash
# 1. Pull latest code
git pull origin main

# 2. Install dependencies
cd frontend && npm install && npm run build
cd ../backend && composer install

# 3. Run migrations
php migrate.php

# 4. Backup database
mysqldump -u root adit_cms > backup_$(date +%Y%m%d).sql

# 5. Restart services
sudo systemctl restart nginx
sudo systemctl restart php8.1-fpm
```

---

## Budget Estimation

| Item | Cost (INR) |
|------|------------|
| Domain Name (1 year) | ₹800 |
| Cloud Hosting (AWS/Azure) | ₹5,000/month |
| SSL Certificate | Free (Let's Encrypt) |
| Razorpay Account | Free (pay per transaction) |
| Email Service (SMTP) | ₹500/month |
| **Total (6 months)** | **₹35,000 - ₹40,000** |

**Alternative:** Host on college server (₹0 hosting cost)

---

## Timeline Summary

| Phase | Description | Duration | Week |
|-------|-------------|----------|------|
| Phase 0 | Project Setup & Foundation | 2 weeks | 1-2 |
| Phase 1 | Authentication & User Management | 2 weeks | 3-4 |
| Phase 2 | Student Module Core | 4 weeks | 5-8 |
| Phase 3 | Faculty Module | 4 weeks | 9-12 |
| Phase 4 | Fee Payment & Finance | 3 weeks | 13-15 |
| Phase 5 | HOD & Department Module | 2 weeks | 16-17 |
| Phase 6 | Library Module | 2 weeks | 18-19 |
| Phase 7 | Examination Module | 2 weeks | 20-21 |
| Phase 8 | Administration Module | 2 weeks | 22-23 |
| Phase 9 | Integration & Testing | 1 week | 24 |
| **Total** | | **24 weeks** | **6 months** |

---

## Success Criteria

- [ ] All 10 modules functional
- [ ] 500+ concurrent users supported
- [ ] 99.5% uptime achieved
- [ ] Zero critical security vulnerabilities
- [ ] All payment transactions successful
- [ ] User satisfaction score > 4.5/5
- [ ] Complete documentation available
- [ ] Deployed and running in production

---
<!-- **Approved By:** [Project Guide Name] -->
**Document Prepared By:** Shah Dhairya

**Date:** July 2026

**Version:** 1.0