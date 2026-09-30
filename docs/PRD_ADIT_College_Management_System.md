# Product Requirements Document (PRD)
# ADIT College Management System
# Version: 2.0 | Date: July 2026

> ⚠️ **SINGLE-DEPARTMENT SCOPE** — This system is built exclusively for the **Computer Engineering (CE) branch** only. No other departments (IT, CIVIL, MECH, ELEC) are supported.

---

## 1. Executive Summary

The **ADIT College Management System** is a centralized digital platform designed to automate and streamline college operations for the **Computer Engineering (CE) department** at A.D. Institute of Technology (ADIT). This system replaces manual paperwork with a comprehensive digital ecosystem covering student management, faculty operations, attendance tracking, assignment management, fee payments, examinations, timetables, library services, and administrative reporting — **all scoped to a single department (CE only)**.

**Tech Stack:** React.js (Frontend) + PHP (Backend API) + MySQL (Database)

---

## 2. Project Overview (CE Branch Only)

### 2.1 Vision
To create a paperless, transparent, and efficient academic environment for the **Computer Engineering department** at ADIT where CE students, CE faculty, CE HOD, and administrators can perform all college operations digitally through a single unified platform.

### 2.2 Mission
- Digitize 95% of **Computer Engineering department** operations
- Reduce paperwork by 80%
- Improve communication between CE students, CE faculty, and administration
- Enable real-time tracking of academic progress for **CE students**
- Provide seamless fee payment integration via Razorpay

### 2.3 Target Users (CE Only)
| Role | Description |
|------|-------------|
| Student | CE students enrolled at ADIT |
| Faculty | CE department teaching staff |
| HOD | Head of Computer Engineering Department |
| Administrator | College administration staff |
| Librarian | Library management staff |

---

## 3. Technology Architecture

### 3.1 Frontend
- **Framework:** React.js 18+ with React Router v6
- **State Management:** Redux Toolkit / Context API
- **UI Library:** Material-UI (MUI) / Tailwind CSS
- **HTTP Client:** Axios
- **Charts:** Chart.js / Recharts
- **PDF Generation:** jsPDF / React-PDF
- **Payment:** Razorpay Checkout SDK

### 3.2 Backend
- **Language:** PHP 8.0+
- **Framework:** Native PHP (REST API) or Laravel (recommended)
- **Authentication:** JWT (JSON Web Tokens)
- **File Upload:** PHP move_uploaded_file
- **Email:** PHPMailer / SMTP

### 3.3 Database
- **RDBMS:** MySQL 8.0
- **ORM:** PDO (PHP Data Objects)
- **Backup:** Automated MySQL dumps

### 3.4 Infrastructure
- **Server:** Apache/Nginx on Linux/Windows
- **Hosting:** College intranet / Cloud (AWS/Azure)
- **SSL:** Required for payment integration
- **Version Control:** Git + GitHub

---

## 4. Functional Requirements

### 4.1 Student Module (CE Students Only)

#### 4.1.1 Student Registration & Login
- **FR-S001:** CE students shall register using college email ID and roll number
- **FR-S002:** System shall send verification email upon registration
- **FR-S003:** CE students shall login using email/roll number and password
- **FR-S004:** System shall support "Forgot Password" via email reset link
- **FR-S005:** JWT token-based session management (24-hour expiry)
- **FR-S006:** CE students shall be assigned to CE department and semester automatically

#### 4.1.2 Profile Management
- **FR-S007:** CE students shall view and edit personal profile (name, phone, address, photo)
- **FR-S008:** CE students shall upload profile photo (max 2MB, JPG/PNG)
- **FR-S009:** CE students shall view academic details (roll number, CE department, semester, batch)
- **FR-S010:** CE students shall view guardian/parent information
- **FR-S011:** CE students shall download ID card as PDF

#### 4.1.3 Attendance
- **FR-S012:** Students shall view daily attendance for all subjects
- **FR-S013:** Students shall view attendance summary (present/absent/total)
- **FR-S014:** Students shall view attendance percentage subject-wise and overall
- **FR-S015:** Students shall receive alerts when attendance falls below 75%
- **FR-S016:** Students shall view monthly attendance calendar with color coding

#### 4.1.4 Assignments
- **FR-S017:** Students shall view assigned assignments with deadlines
- **FR-S018:** Students shall submit assignments (text/PDF/image upload)
- **FR-S019:** Students shall view submission status (pending/accepted/rejected)
- **FR-S020:** Students shall receive feedback from faculty
- **FR-S021:** Students shall view assignment marks/ratings
- **FR-S022:** System shall prevent submission after deadline (configurable by faculty)

#### 4.1.5 Lab Manual Upload
- **FR-S023:** Students shall upload lab manual submissions (PDF format)
- **FR-S024:** Students shall view lab manual status and feedback
- **FR-S025:** Students shall view lab manual marks

#### 4.1.6 Fee Payment (Razorpay)
- **FR-S026:** Students shall view fee structure (tuition, lab, library, etc.)
- **FR-S027:** Students shall view pending dues and payment history
- **FR-S028:** Students shall make online payment via Razorpay
- **FR-S029:** System shall generate payment receipt (PDF) after successful payment
- **FR-S030:** System shall send payment confirmation via email
- **FR-S031:** Students shall view installment-wise payment schedule
- **FR-S032:** System shall send reminders for upcoming due dates

#### 4.1.7 Timetable
- **FR-S033:** Students shall view class-wise timetable
- **FR-S034:** Students shall view subject-wise schedule
- **FR-S035:** Students shall receive notification for timetable changes

#### 4.1.8 Syllabus
- **FR-S036:** Students shall view semester-wise syllabus
- **FR-S037:** Students shall download syllabus as PDF
- **FR-S038:** Students shall view syllabus completion status

#### 4.1.9 Results/Marks
- **FR-S039:** Students shall view internal marks (unit tests, assignments, practicals)
- **FR-S040:** Students shall view external/semester exam results
- **FR-S041:** Students shall view CGPA and semester GPA
- **FR-S042:** Students shall download mark sheets as PDF
- **FR-S043:** Students shall view subject-wise performance graph

#### 4.1.10 Notices
- **FR-S044:** Students shall view college notices and circulars
- **FR-S045:** Students shall view department-specific notices
- **FR-S046:** Students shall receive push notifications for new notices

#### 4.1.11 Leave Application
- **FR-S047:** Students shall apply for leave online
- **FR-S048:** Students shall select leave type (sick/personal/official)
- **FR-S049:** Students shall upload supporting documents (medical certificate, etc.)
- **FR-S050:** Students shall view leave application status (pending/approved/rejected)
- **FR-S051:** Students shall view leave history and balance

---

### 4.2 Faculty Module (CE Faculty Only)

#### 4.2.1 Faculty Login & Profile
- **FR-F001:** Faculty shall login using college email and password
- **FR-F002:** Faculty shall manage profile (photo, qualification, experience)
- **FR-F003:** Faculty shall view assigned subjects and classes

#### 4.2.2 Student Records
- **FR-F004:** Faculty shall view list of students in their classes
- **FR-F005:** Faculty shall view individual student profiles
- **FR-F006:** Faculty shall export student lists as Excel/PDF

#### 4.2.3 Attendance Management
- **FR-F007:** Faculty shall mark daily attendance (present/absent/late)
- **FR-F008:** Faculty shall edit attendance within configurable time window
- **FR-F009:** Faculty shall view class attendance statistics
- **FR-F010:** Faculty shall view student attendance history
- **FR-F011:** Faculty shall generate attendance reports

#### 4.2.4 Assignment Management
- **FR-F012:** Faculty shall create assignments with title, description, deadline
- **FR-F013:** Faculty shall attach reference files to assignments
- **FR-F014:** Faculty shall view submitted assignments
- **FR-F015:** Faculty shall review and grade assignments
- **FR-F016:** Faculty shall provide feedback on submissions
- **FR-F017:** Faculty shall accept/reject submissions with comments
- **FR-F018:** Faculty shall extend deadlines for specific students or whole class

#### 4.2.5 Lab Manual Verification
- **FR-F019:** Faculty shall view uploaded lab manuals
- **FR-F020:** Faculty shall review and mark lab manuals
- **FR-F021:** Faculty shall provide feedback on lab experiments

#### 4.2.6 Study Materials
- **FR-F022:** Faculty shall upload study materials (PDF, PPT, videos)
- **FR-F023:** Faculty shall organize materials by subject and topic
- **FR-F024:** Faculty shall share materials with specific classes
- **FR-F025:** Faculty shall delete/update uploaded materials

#### 4.2.7 Marks Entry
- **FR-F026:** Faculty shall enter internal marks (unit tests, practicals)
- **FR-F027:** Faculty shall edit marks before final submission
- **FR-F028:** Faculty shall view class performance analytics
- **FR-F029:** Faculty shall generate subject-wise performance reports

#### 4.2.8 Announcements
- **FR-F030:** Faculty shall create subject-specific announcements
- **FR-F031:** Faculty shall send announcements to specific classes
- **FR-F032:** Faculty shall view announcement read status

---

### 4.3 HOD Module (Computer Engineering)

#### 4.3.1 Dashboard
- **FR-H001:** HOD shall view CE department overview (students, faculty, alerts)
- **FR-H002:** HOD shall view attendance statistics for CE department
- **FR-H003:** HOD shall view academic performance trends
- **FR-H004:** HOD shall view pending approvals

#### 4.3.2 Faculty Management
- **FR-H005:** HOD shall view all faculty in CE department
- **FR-H006:** HOD shall assign subjects to CE faculty
- **FR-H007:** HOD shall view CE faculty performance

#### 4.3.3 Student Management
- **FR-H009:** HOD shall view all CE students
- **FR-H010:** HOD shall view student-wise attendance and performance
- **FR-H011:** HOD shall handle student complaints/requests

#### 4.3.4 Subject & Timetable Management
- **FR-H012:** HOD shall manage CE subjects
- **FR-H013:** HOD shall create/modify CE department timetable
- **FR-H014:** HOD shall upload semester syllabus

#### 4.3.5 Reports
- **FR-H015:** HOD shall view attendance reports (CE department-wide)
- **FR-H016:** HOD shall view academic reports
- **FR-H017:** HOD shall export reports as PDF/Excel

---

### 4.4 Department Module (Computer Engineering)

#### 4.4.1 Department Information
- **FR-D001:** System shall display CE department information (mission, vision, labs)
- **FR-D002:** System shall list courses offered by CE department
- **FR-D003:** System shall display CE semester-wise subjects

#### 4.4.2 Classroom Allocation
- **FR-D004:** System shall manage CE classroom assignments
- **FR-D005:** System shall prevent scheduling conflicts within CE
- **FR-D006:** System shall manage CE lab allocation

---

### 4.5 Administration Module (CE-Focused)

#### 4.5.1 College Settings
- **FR-A001:** Admin shall configure college name, logo, address
- **FR-A002:** Admin shall manage academic year settings
- **FR-A003:** Admin shall configure system-wide settings

#### 4.5.2 User Management
- **FR-A004:** Admin shall create/manage student accounts
- **FR-A005:** Admin shall create/manage faculty accounts
- **FR-A006:** Admin shall create/manage HOD accounts
- **FR-A007:** Admin shall assign roles and permissions
- **FR-A008:** Admin shall activate/deactivate accounts

#### 4.5.3 Admission Management
- **FR-A009:** Admin shall manage admission process
- **FR-A010:** Admin shall verify admission documents
- **FR-A011:** Admin shall generate admission letters

#### 4.5.4 Fee Management
- **FR-A012:** Admin shall define fee structures per course/semester
- **FR-A013:** Admin shall view all payments and pending dues
- **FR-A014:** Admin shall generate fee reports
- **FR-A015:** Admin shall manage scholarship/discount

#### 4.5.5 Academic Calendar
- **FR-A016:** Admin shall create academic calendar
- **FR-A017:** Admin shall manage exam schedules
- **FR-A018:** Admin shall manage holiday list

#### 4.5.6 Notifications
- **FR-A019:** Admin shall send college-wide notifications
- **FR-A020:** Admin shall manage notification templates

#### 4.5.7 Reports & Backup
- **FR-A021:** Admin shall generate all types of reports
- **FR-A022:** Admin shall backup database
- **FR-A023:** Admin shall restore database from backup
- **FR-A024:** Admin shall view system audit logs

---

### 4.6 Library Module

#### 4.6.1 Book Management
- **FR-L001:** Librarian shall add/edit/delete books
- **FR-L002:** System shall maintain book inventory (title, author, ISBN, copies)
- **FR-L003:** Librarian shall search books by title/author/ISBN

#### 4.6.2 Issue/Return
- **FR-L004:** Students shall borrow books (max limit configurable)
- **FR-L005:** Students shall return books
- **FR-L006:** System shall calculate fines for overdue books
- **FR-L007:** Students shall view borrowing history
- **FR-L008:** System shall send reminders for due returns

#### 4.6.3 Fine Management
- **FR-L009:** System shall auto-calculate fine (₹5/day configurable)
- **FR-L010:** Students shall pay fines online
- **FR-L011:** Librarian shall view fine collection report

---

### 4.7 Examination Module

#### 4.7.1 Internal Marks
- **FR-E001:** Faculty shall enter internal marks (3 unit tests)
- **FR-E002:** System shall calculate best-of-two internal marks
- **FR-E003:** Students shall view internal marks

#### 4.7.2 External Marks
- **FR-E004:** Admin shall enter external exam marks
- **FR-E005:** System shall calculate total marks (internal + external)

#### 4.7.3 Result Generation
- **FR-E006:** System shall auto-generate results
- **FR-E007:** System shall calculate GPA and CGPA
- **FR-E008:** Students shall download result sheets
- **FR-E009:** Admin shall publish results

#### 4.7.4 Grade Calculation
- **FR-E010:** System shall follow ADIT grading policy (O, A+, A, B+, B, C, F)
- **FR-E011:** System shall calculate grade points

#### 4.7.5 Hall Ticket
- **FR-E012:** Students shall download hall tickets
- **FR-E013:** System shall generate hall ticket with photo and exam details
- **FR-E014:** Students shall be eligible only if fees are cleared and attendance >= 75%

---

### 4.8 Finance Module

#### 4.8.1 Fee Collection
- **FR-FN001:** System shall support multiple fee types (tuition, lab, library, hostel)
- **FR-FN002:** System shall support installment payments
- **FR-FN003:** System shall integrate Razorpay for online payments

#### 4.8.2 Razorpay Integration
- **FR-FN004:** System shall create Razorpay orders
- **FR-FN005:** System shall verify payment signatures
- **FR-FN006:** System shall handle payment failures gracefully
- **FR-FN007:** System shall support refunds via Razorpay

#### 4.8.3 Payment History & Receipts
- **FR-FN008:** Students shall view payment history
- **FR-FN009:** System shall generate PDF receipts
- **FR-FN010:** Admin shall view all transactions
- **FR-FN011:** System shall send payment reminders

---

### 4.9 Timetable & Academic Module

#### 4.9.1 Timetable Management
- **FR-T001:** Admin/HOD shall create branch-wise timetables
- **FR-T002:** Admin/HOD shall create semester-wise timetables
- **FR-T003:** System shall prevent teacher/classroom conflicts
- **FR-T004:** Students shall view their class timetable
- **FR-T005:** Faculty shall view their teaching schedule

#### 4.9.2 Syllabus Management
- **FR-T006:** Admin shall upload syllabus per subject
- **FR-T007:** Students shall download syllabus
- **FR-T008:** Faculty shall update syllabus completion status

---

### 4.10 Single-Department Architecture

#### 4.10.1 CE-Only Scope
- **FR-B001:** System is built **exclusively for Computer Engineering (CE)** — no other branches exist in the database or UI
  - Only one course: B.Tech Computer Engineering (8 semesters)
  - Only CE-specific subjects, CE faculty, and CE batches
  - All dashboards, reports, and filters assume CE-only context
- **FR-B002:** Admin shall manage CE department settings (HOD, courses, semesters)
- **FR-B003:** No multi-branch switching or department selector is needed — the system is hardcoded for CE

---

## 5. Non-Functional Requirements

### 5.1 Performance
- **NFR-001:** Page load time < 3 seconds on 4G connection
- **NFR-002:** API response time < 500ms for 95% of requests
- **NFR-003:** System shall support 500+ concurrent users

### 5.2 Security
- **NFR-004:** All passwords shall be hashed using bcrypt
- **NFR-005:** All API endpoints shall require authentication (JWT)
- **NFR-006:** Role-based access control (RBAC) for all modules
- **NFR-007:** HTTPS required for all pages
- **NFR-008:** SQL injection prevention via prepared statements
- **NFR-009:** XSS prevention via input sanitization
- **NFR-010:** CSRF protection on all forms

### 5.3 Scalability
- **NFR-011:** Database shall support 10,000+ student records
- **NFR-012:** File storage shall support 100GB+
- **NFR-013:** System shall support horizontal scaling

### 5.4 Usability
- **NFR-014:** Responsive design (mobile, tablet, desktop)
- **NFR-015:** WCAG 2.1 AA accessibility compliance
- **NFR-016:** Intuitive navigation with max 3 clicks to any feature
- **NFR-017:** Dark mode support

### 5.5 Reliability
- **NFR-018:** 99.5% uptime
- **NFR-019:** Daily automated backups
- **NFR-020:** Error logging and monitoring

---

## 6. Database Schema (CE-Only Data)

> **Note:** All seed data is exclusively for Computer Engineering — 1 department (CE), 1 course (BTECH-CE), 2 faculty, 3 CE students, CE-only subjects/batches/classrooms.

### Core Tables
```sql
-- Users & Authentication
users (id, email, password_hash, role, status, created_at, updated_at)
students (id, user_id, roll_number, first_name, last_name, dob, gender, phone, address, photo, department_id, semester, batch, admission_date)
faculty (id, user_id, employee_id, first_name, last_name, qualification, experience, department_id, designation, phone)
admins (id, user_id, name, phone, role_type)

-- Department & Academic
departments (id, name, code, hod_id, description, created_at)
courses (id, name, code, department_id, duration_years, total_semesters)
semesters (id, course_id, semester_number, start_date, end_date)
subjects (id, name, code, semester_id, faculty_id, credits, type theory/practical)
batches (id, name, course_id, department_id, start_year, end_year)

-- Attendance
attendance (id, student_id, subject_id, date, status present/absent/late, marked_by, created_at)
attendance_settings (id, min_percentage, alert_threshold)

-- Assignments
assignments (id, title, description, subject_id, faculty_id, deadline, max_marks, attachments, created_at)
submissions (id, assignment_id, student_id, file_path, submitted_at, marks, feedback, status pending/accepted/rejected, reviewed_by)

-- Lab Manuals
lab_manuals (id, title, subject_id, experiment_number, description, faculty_id, created_at)
lab_submissions (id, lab_manual_id, student_id, file_path, submitted_at, marks, feedback, status)

-- Fee Management
fee_structures (id, course_id, semester, fee_type, amount, due_date)
fee_payments (id, student_id, fee_structure_id, amount, payment_method, razorpay_order_id, razorpay_payment_id, status, paid_at)
fee_receipts (id, payment_id, receipt_number, generated_at)

-- Examination
unit_tests (id, student_id, subject_id, test_number, marks_obtained, max_marks, entered_by)
internal_marks (id, student_id, subject_id, unit_test_avg, assignment_marks, practical_marks, attendance_marks, total_internal)
external_marks (id, student_id, subject_id, marks_obtained, max_marks)
results (id, student_id, semester_id, sgpa, cgpa, status pass/fail, published_at)
grade_definitions (id, min_marks, max_marks, grade, grade_point)

-- Timetable
timetables (id, branch_id, semester, day_of_week, period_number, subject_id, faculty_id, classroom, start_time, end_time)

-- Library
books (id, title, author, isbn, publisher, category, total_copies, available_copies, created_at)
book_issues (id, book_id, student_id, issue_date, due_date, return_date, fine_amount, status issued/returned/overdue)
fines (id, issue_id, student_id, amount, paid, paid_at)

-- Notices & Announcements
notices (id, title, content, type college/department/class, department_id, target_audience, created_by, published_at, attachments)
announcements (id, title, content, subject_id, faculty_id, class_id, created_at)

-- Leave Application
leave_applications (id, student_id, leave_type, from_date, to_date, reason, document_path, status pending/approved/rejected, reviewed_by, reviewed_at, comments)

-- Syllabus
syllabus (id, subject_id, unit_number, unit_title, topics, status not_started/in_progress/completed, uploaded_by, file_path)

-- Academic Calendar
academic_calendar (id, event_title, event_type, start_date, end_date, description, created_by)
holidays (id, name, date, type, created_by)

-- ID Card
id_cards (id, student_id, card_number, valid_from, valid_until, generated_at)

-- System
audit_logs (id, user_id, action, table_name, record_id, old_value, new_value, ip_address, created_at)
system_settings (id, setting_key, setting_value, updated_by, updated_at)
backups (id, file_name, file_path, size, created_by, created_at)
```

---

## 7. API Endpoints Structure

### Authentication
```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
POST   /api/auth/forgot-password
POST   /api/auth/reset-password
GET    /api/auth/me
```

### Students
```
GET    /api/students
GET    /api/students/:id
POST   /api/students
PUT    /api/students/:id
DELETE /api/students/:id
GET    /api/students/:id/attendance
GET    /api/students/:id/marks
GET    /api/students/:id/fees
GET    /api/students/:id/leave-applications
POST   /api/students/:id/leave-applications
```

### Faculty
```
GET    /api/faculty
GET    /api/faculty/:id
POST   /api/faculty
PUT    /api/faculty/:id
GET    /api/faculty/:id/classes
GET    /api/faculty/:id/subjects
```

### Attendance
```
POST   /api/attendance/mark
PUT    /api/attendance/:id
GET    /api/attendance?subject_id=&date=
GET    /api/attendance/report?class=&subject=&from=&to=
```

### Assignments
```
GET    /api/assignments?subject_id=
POST   /api/assignments
PUT    /api/assignments/:id
DELETE /api/assignments/:id
GET    /api/assignments/:id/submissions
POST   /api/assignments/:id/submit
PUT    /api/assignments/submissions/:id/review
```

### Fees
```
GET    /api/fees/structure?course_id=&semester=
POST   /api/fees/create-order
POST   /api/fees/verify-payment
GET    /api/fees/payments/:student_id
GET    /api/fees/receipt/:payment_id
```

### Library
```
GET    /api/library/books?search=
POST   /api/library/books
POST   /api/library/issue
POST   /api/library/return
GET    /api/library/history/:student_id
GET    /api/library/fines/:student_id
```

### Examinations
```
POST   /api/exams/internal-marks
POST   /api/exams/external-marks
GET    /api/exams/results?student_id=&semester=
GET    /api/exams/hall-ticket/:student_id
POST   /api/exams/publish-results
```

### Timetable
```
GET    /api/timetable?branch=&semester=
POST   /api/timetable
PUT    /api/timetable/:id
DELETE /api/timetable/:id
```

### Notices
```
GET    /api/notices?type=&department_id=
POST   /api/notices
PUT    /api/notices/:id
DELETE /api/notices/:id
```

### Admin
```
GET    /api/admin/dashboard
GET    /api/admin/reports/:type
POST   /api/admin/backup
POST   /api/admin/restore
GET    /api/admin/audit-logs
PUT    /api/admin/settings
```

---

## 8. UI/UX Requirements

### 8.1 Design System
- **Color Palette:** Primary (#1976D2 Blue), Secondary (#FFA000 Amber), Success (#4CAF50), Error (#F44336)
- **Typography:** Inter font family
- **Spacing:** 8px grid system
- **Border Radius:** 8px for cards, 4px for buttons
- **Shadows:** Material Design elevation system

### 8.2 Layout
- **Student Dashboard:** Card-based layout with quick access tiles
- **Faculty Dashboard:** Table-heavy with action buttons
- **Admin Dashboard:** Analytics with charts and metrics
- **Responsive:** Mobile-first design, breakpoints at 576px, 768px, 992px, 1200px

### 8.3 Key Pages
1. Landing page with login
2. CE Student / CE Faculty / HOD / Admin dashboards
3. Attendance calendar view
4. Assignment submission portal
5. Fee payment gateway
6. Library catalog
7. Results/Report card
8. Timetable grid view (CE only)
9. Notice board
10. Profile management

---

## 9. Security Requirements

### 9.1 Authentication
- JWT tokens with 24-hour expiry
- Refresh token mechanism
- Password policy: min 8 chars, uppercase, lowercase, number, special char
- Account lockout after 5 failed attempts

### 9.2 Authorization
- Role-based access control (RBAC)
- Single-department data isolation (CE only)
- Faculty can only access their assigned CE classes
- Students can only access their own data

### 9.3 Data Protection
- All passwords hashed with bcrypt (12 rounds)
- Sensitive data encrypted at rest
- API rate limiting (100 requests/minute)
- Input validation on all endpoints
- Prepared statements for all SQL queries

---

## 10. Razorpay Integration Details

### 10.1 Setup
- Razorpay Account: ADIT College
- API Key: rzp_test_xxxx (test mode for development)
- Webhook URL: https://adit-cms.com/api/webhooks/razorpay

### 10.2 Payment Flow
1. Student selects fees to pay
2. Backend creates Razorpay order
3. Frontend opens Razorpay checkout
4. Student completes payment
5. Backend verifies payment signature
6. System updates fee status
7. Receipt generated and emailed

### 10.3 Supported Methods
- UPI
- Credit/Debit Cards
- Net Banking
- Wallets

---

## 11. Deployment Requirements

### 11.1 Development
- XAMPP/WAMP for local development
- PHP 8.0+, MySQL 8.0, Node.js 18+

### 11.2 Staging
- Mirror of production environment
- Test data with 1000+ records
- Performance testing with JMeter

### 11.3 Production
- Ubuntu 22.04 LTS server
- Nginx web server
- PHP-FPM
- MySQL 8.0 with replication
- SSL certificate (Let's Encrypt)
- Daily automated backups
- Redis for caching

---

## 12. Success Metrics

| Metric | Target |
|--------|--------|
| User Adoption Rate | 90% within 3 months |
| Paper Reduction | 80% reduction in paperwork |
| Fee Collection Efficiency | 95% online payments |
| System Uptime | 99.5% |
| User Satisfaction | 4.5/5 rating |
| Support Tickets | < 50/month after stabilization |

---

## 13. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Payment gateway failure | High | Fallback to manual payment, retry mechanism |
| Data loss | Critical | Daily backups, RAID storage |
| Low adoption | High | Training sessions, user-friendly UI |
| Security breach | Critical | Regular security audits, penetration testing |
| Scalability issues | Medium | Load testing, cloud deployment |

---

## 14. Appendices

### Appendix A: Glossary
- **CGPA:** Cumulative Grade Point Average
- **SGPA:** Semester Grade Point Average
- **RBAC:** Role-Based Access Control
- **JWT:** JSON Web Token
- **Razorpay:** Indian payment gateway

### Appendix B: References
- ADIT College Official Website
- GTU (Gujarat Technological University) regulations
- Razorpay API Documentation
- React.js Official Documentation
- PHP Official Documentation

---

**Document Prepared By:** ADIT Development Team
**Approved By:** [Project Guide Name]
**Date:** July 2026
**Version:** 2.0 — CE Single-Branch Release
