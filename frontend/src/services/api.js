import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'https://adit.shahdhairyah.in/api';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

/**
 * A second instance for downloads.
 *
 * `api` has a response interceptor that returns `response.data`, so awaiting a
 * blob request from it yields the Blob itself - `response.data` is undefined
 * and `response.headers` does not exist. downloadFile() therefore handed the
 * browser a file containing the text "undefined" and then threw on the
 * Content-Disposition lookup. This instance keeps the full AxiosResponse.
 */
const downloadApi = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

const withAuthToken = (config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
};

api.interceptors.request.use(withAuthToken);
downloadApi.interceptors.request.use(withAuthToken);

const extractError = (data) => {
  if (!data) return { message: 'Request failed' };
  if (typeof data === 'string') return { message: data };
  if (typeof data === 'object') return { message: data.message || 'Request failed', ...data };
  return { message: 'Request failed' };
};

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response) {
      if (error.response.status === 401) {
        const isAuthPage = window.location.pathname.startsWith('/login') ||
          window.location.pathname.startsWith('/forgot-password') ||
          window.location.pathname.startsWith('/reset-password') ||
          window.location.pathname.startsWith('/register');
        if (!isAuthPage) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }
      }
      return Promise.reject(extractError(error.response.data));
    }
    if (error.request) {
      return Promise.reject({ message: 'Unable to reach server. Please check your connection.' });
    }
    return Promise.reject({ message: error.message || 'An unexpected error occurred' });
  }
);

// AUTH - using router endpoints
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  forgotPassword: (data) => api.post('/auth/forgot-password', data),
  resetPassword: (data) => api.post('/auth/reset-password', data),
  updateProfile: (data) => api.put('/auth/profile', data),
  changePassword: (data) => api.post('/auth/change-password', data),
  me: () => api.get('/auth/me'),
};

/**
 * Download a file from an authenticated endpoint and hand it to the browser.
 *
 * The old pages did `window.open(`${API_URL}/...?token=${jwt}`)`. That does
 * not work: window.open() cannot set an Authorization header, so the API
 * answered 401, and putting the JWT in the query string leaks it into server
 * logs, browser history and the Referer header. Fetching it as a blob with
 * the normal interceptor keeps the token in a header.
 *
 * @param {string} path   e.g. '/materials/12/download'
 * @param {string} [filename] override for the saved name
 */
export async function downloadFile(path, filename) {
  let response;
  try {
    response = await downloadApi.get(path, { responseType: 'blob' });
  } catch (error) {
    // The API reports errors as JSON, but a blob request receives that JSON as
    // a Blob, so the generic interceptor cannot read error.response.data.message.
    const data = error?.response?.data;
    if (data instanceof Blob) {
      const text = await data.text();
      try {
        return Promise.reject(JSON.parse(text));
      } catch {
        return Promise.reject({ message: text || 'Download failed' });
      }
    }
    return Promise.reject({ message: error?.message || 'Download failed' });
  }

  const blob = response.data instanceof Blob ? response.data : new Blob([response.data]);

  // A JSON body arriving with a 200 means the endpoint refused and the failure
  // was serialised rather than streamed.
  if (blob.type && blob.type.includes('application/json')) {
    const text = await blob.text();
    try {
      return Promise.reject(JSON.parse(text));
    } catch {
      return Promise.reject({ message: text || 'Download failed' });
    }
  }

  // Prefer the filename the server sent via Content-Disposition.
  let name = filename;
  if (!name) {
    const disposition = response.headers?.['content-disposition'] || '';
    const match = /filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i.exec(disposition);
    if (match) {
      try {
        name = decodeURIComponent(match[1] || match[2]);
      } catch {
        name = match[1] || match[2];
      }
    }
  }
  if (!name) {
    name = path.split('/').filter(Boolean).pop() || 'download';
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}


// DEPARTMENTS
export const departmentAPI = {
  getAll: () => api.get('/departments'),
  getById: (id) => api.get(`/departments/${id}`),
  create: (data) => api.post('/departments', data),
  update: (id, data) => api.put(`/departments/${id}`, data),
  delete: (id) => api.delete(`/departments/${id}`),
};

// COURSES
export const courseAPI = {
  getAll: (params) => api.get('/courses', { params }),
};

// CLASSROOMS
export const classroomAPI = {
  getAll: (params) => api.get('/classrooms', { params }),
  create: (data) => api.post('/classrooms', data),
  update: (id, data) => api.put(`/classrooms/${id}`, data),
  delete: (id) => api.delete(`/classrooms/${id}`),
};

// STUDENTS
export const studentAPI = {
  getAll: (params) => api.get('/students', { params }),
  getById: (id) => api.get(`/students/${id}`),
  create: (data) => api.post('/students', data),
  update: (id, data) => api.put(`/students/${id}`, data),
  delete: (id) => api.delete(`/students/${id}`),
  uploadPhoto: (id, data) => api.post(`/students/${id}/photo`, data),
};

// FACULTY
export const facultyAPI = {
  getAll: (params) => api.get('/faculty', { params }),
  getById: (id) => api.get(`/faculty/${id}`),
  create: (data) => api.post('/faculty', data),
  update: (id, data) => api.put(`/faculty/${id}`, data),
  delete: (id) => api.delete(`/faculty/${id}`),
  getSubjects: () => api.get('/faculty/subjects'),
  getAssignedClasses: () => api.get('/faculty/assigned-classes'),
};

// ATTENDANCE
export const attendanceAPI = {
  mark: (data) => api.post('/attendance/mark', data),
  update: (id, data) => api.put(`/attendance/${id}`, data),
  get: (params) => api.get('/attendance', { params }),
  getReport: (params) => api.get('/attendance/report', { params }),
  getStudentSummary: (studentId) => api.get(`/attendance/student/${studentId}/summary`),
  getStudentCalendar: (studentId, params) => api.get(`/attendance/student/${studentId}/calendar`, { params }),
  getCalendar: (params) => api.get('/attendance/calendar', { params }),
};

// ASSIGNMENTS
export const assignmentAPI = {
  getAll: (params) => api.get('/assignments', { params }),
  create: (data) => api.post('/assignments', data),
  update: (id, data) => api.put(`/assignments/${id}`, data),
  delete: (id) => api.delete(`/assignments/${id}`),
  submit: (id, formData) => api.post(`/assignments/${id}/submit`, formData),
  getSubmissions: (id) => api.get(`/assignments/${id}/submissions`),
  reviewSubmission: (id, data) => api.put(`/assignments/submissions/${id}/review`, data),
};

// FEES
export const feeAPI = {
  getStructure: (params) => api.get('/fees/structure', { params }),
  createStructure: (data) => api.post('/fees/structure', data),
  updateStructure: (id, data) => api.put(`/fees/structure/${id}`, data),
  deleteStructure: (id) => api.delete(`/fees/structure/${id}`),
  createOrder: (data) => api.post('/fees/create-order', data),
  verifyPayment: (data) => api.post('/fees/verify-payment', data),
  getPayments: (studentId) => api.get(`/fees/payments/${studentId}`),
  getAllPayments: (params) => api.get('/fees/all-payments', { params }),
  getReceipt: (id) => api.get(`/fees/receipt/${id}`),
  getAllStructures: (params) => api.get('/fees/all-structures', { params }),
  getFeeReport: (params) => api.get('/fees/reports', { params }),
};

// LIBRARY
export const libraryAPI = {
  getBooks: (params) => api.get('/library/books', { params }),
  addBook: (data) => api.post('/library/books', data),
  issueBook: (data) => api.post('/library/issue', data),
  returnBook: (data) => api.post('/library/return', data),
  getHistory: (studentId) => api.get(`/library/history/${studentId}`),
  getFines: (studentId) => api.get(`/library/fines/${studentId}`),
};

// EXAMS
export const examAPI = {
  enterInternalMarks: (data) => api.post('/exams/internal-marks', data),
  enterExternalMarks: (data) => api.post('/exams/external-marks', data),
  getResults: (params) => api.get('/exams/results', { params }),
  getHallTicket: (studentId) => api.get(`/exams/hall-ticket/${studentId}`),
  publishResults: (data) => api.post('/exams/publish-results', data),
  getStudentMarks: (params) => api.get('/exams/student-marks', { params }),
};

// TIMETABLE
export const timetableAPI = {
  get: (params) => api.get('/timetable', { params }),
  create: (data) => api.post('/timetable', data),
  update: (id, data) => api.put(`/timetable/${id}`, data),
  delete: (id) => api.delete(`/timetable/${id}`),
};

// NOTICES
export const noticeAPI = {
  getAll: (params) => api.get('/notices', { params }),
  getStudent: (params) => api.get('/notices/student', { params }),
  create: (data) => api.post('/notices', data),
  update: (id, data) => api.put(`/notices/${id}`, data),
  delete: (id) => api.delete(`/notices/${id}`),
};

// ADMIN
export const adminAPI = {
  getDashboard: () => api.get('/admin/dashboard'),
  getUsers: (params) => api.get('/admin/users', { params }),
  backup: () => api.post('/admin/backup'),
  getAuditLogs: (params) => api.get('/admin/audit-logs', { params }),
  getSettings: () => api.get('/admin/settings'),
  updateSettings: (data) => api.put('/admin/settings', data),
};

// LEAVE APPLICATIONS
export const leaveAPI = {
  getAll: (params) => api.get('/leave-applications', { params }),
  create: (formData) => api.post('/leave-applications', formData),
  update: (id, data) => api.put(`/leave-applications/${id}`, data),
};

// LAB MANUALS
export const labManualAPI = {
  getAll: (params) => api.get('/lab-manuals', { params }),
  create: (data) => api.post('/lab-manuals', data),
  update: (id, data) => api.put(`/lab-manuals/${id}`, data),
  delete: (id) => api.delete(`/lab-manuals/${id}`),
  submit: (id, formData) => api.post(`/lab-manuals/${id}/submit`, formData),
  getSubmissions: (id) => api.get(`/lab-manuals/${id}/submissions`),
  reviewSubmission: (id, data) => api.put(`/lab-manuals/submissions/${id}/review`, data),
  getStudentSubmissions: () => api.get('/lab-manuals/student-submissions'),
};

// STUDY MATERIALS
export const materialAPI = {
  getAll: (params) => api.get('/materials', { params }),
  create: (formData) => api.post('/materials', formData),
  update: (id, data) => api.put(`/materials/${id}`, data),
  delete: (id) => api.delete(`/materials/${id}`),
  download: (id) => api.get(`/materials/${id}/download`),
};

// SYLLABUS
export const syllabusAPI = {
  getAll: (params) => api.get('/syllabus', { params }),
  getById: (id) => api.get(`/syllabus/${id}`),
  getBySubject: (subjectId) => api.get(`/syllabus/subject/${subjectId}`),
  create: (data) => api.post('/syllabus', data),
  update: (id, data) => api.put(`/syllabus/${id}`, data),
  delete: (id) => api.delete(`/syllabus/${id}`),
};

// ANNOUNCEMENTS
export const announcementAPI = {
  getAll: (params) => api.get('/announcements', { params }),
  create: (data) => api.post('/announcements', data),
  update: (id, data) => api.put(`/announcements/${id}`, data),
  delete: (id) => api.delete(`/announcements/${id}`),
  markRead: (id) => api.post(`/announcements/${id}/read`),
  readStatus: (id) => api.get(`/announcements/${id}/reads`),
};

// HOD (Phase 5) - every path here is /hod/* on the router and is
// server-side restricted to the HOD's own department.
export const hodAPI = {
  getDashboard: () => api.get('/hod/dashboard'),
  getStudents: () => api.get('/hod/students'),
  getFaculty: () => api.get('/hod/faculty'),
  getSubjects: () => api.get('/hod/subjects'),
  getFacultyLoad: () => api.get('/hod/faculty-load'),
  getFeeReport: () => api.get('/hod/fee-report'),
  getTimetable: () => api.get('/hod/timetable'),
  getClassrooms: () => api.get('/hod/classrooms'),
  getAcademicTrends: () => api.get('/hod/academic-trends'),
  getReports: (params) => api.get('/hod/reports', { params }),

  addStudent: (data) => api.post('/hod/add-student', data),
  addFaculty: (data) => api.post('/hod/add-faculty', data),
  addSubject: (data) => api.post('/hod/add-subject', data),
  updateSubject: (id, data) => api.put(`/hod/update-subject/${id}`, data),
  deleteSubject: (id) => api.delete(`/hod/delete-subject/${id}`),
  assignSubjectFaculty: (id, data) => api.put(`/hod/assign-faculty/${id}`, data),

  addClassroom: (data) => api.post('/hod/add-classroom', data),
  updateClassroom: (id, data) => api.put(`/hod/update-classroom/${id}`, data),
  deleteClassroom: (id) => api.delete(`/hod/delete-classroom/${id}`),

  addTimetableEntry: (data) => api.post('/hod/add-timetable', data),
  deleteTimetableEntry: (id) => api.delete(`/hod/delete-timetable/${id}`),
};

export default api;
