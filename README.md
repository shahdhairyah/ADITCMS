# ADIT College Management System

A centralized digital platform for A.D. Institute of Technology (ADIT) that automates all college operations.

## Tech Stack

- **Frontend:** React.js 18 + Vite + Tailwind CSS
- **Backend:** PHP 8.0+ (REST API)
- **Database:** MySQL 8.0
- **Payment:** Razorpay Integration

## Features

- Student Registration & Profile Management
- Attendance Tracking
- Assignment Management
- Fee Payment (Razorpay)
- Examination & Results
- Library Management
- Timetable Management
- Notice Board
- Leave Applications
- Reports & Analytics

## Quick Start

### Prerequisites

- Node.js 18+
- PHP 8.0+
- MySQL 8.0
- XAMPP/WAMP

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

### Backend Setup

1. Start Apache and MySQL from XAMPP
2. Open phpMyAdmin and import `database/schema.sql`
3. Import `database/seed.sql` for sample data
4. Access API at `http://localhost:8080/api`

### Database Setup

```bash
mysql -u root -p < database/schema.sql
mysql -u root -p < database/seed.sql
```

## Project Structure

```
adit-cms/
├── frontend/          # React application
├── backend/           # PHP REST API
├── database/          # SQL schemas and seeds
├── docs/              # Documentation
└── README.md
```

## Default Login Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@adit.edu | Admin@123 |
| HOD | hod.ce@adit.edu | Hod@123 |
| Faculty | ravi.sharma@adit.edu | Faculty@123 |
| Student | student01@adit.edu | Student@123 |

## API Endpoints

See `docs/PRD_ADIT_College_Management_System.md` for complete API documentation.

## License

This project is for educational purposes - ADIT Final Year Project 2026.
"# ADITCMS" 
