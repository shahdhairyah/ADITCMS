<?php

class AnnouncementController {
    
    private $announcementModel;

    public function __construct() {
        $this->announcementModel = new Announcement();
    }

    public function index() {
        $role = AuthMiddleware::getUserRole();
        $userId = AuthMiddleware::getUserId();

        $filters = [
            'subject_id' => Validation::id($_GET['subject_id'] ?? null)
        ];

        if ($role === 'faculty') {
            $filters['faculty_id'] = $this->getFacultyId($userId);
        }

        $announcements = $this->announcementModel->getAll($filters, $userId);
        Response::success($announcements);
    }

    public function store() {
        $data = Validation::getJsonInput();
        $userId = AuthMiddleware::getUserId();

        $rules = [
            'title' => 'required|max:255',
            'content' => 'required'
        ];

        $errors = Validation::validate($data, $rules);
        if ($errors !== true) {
            Response::validationError($errors);
        }

        $facultyId = $this->getFacultyId($userId);
        if (!$facultyId) {
            Response::forbidden('Only faculty can create announcements');
        }

        // Announcements may only be filed under a subject the author actually
        // teaches, and subject_id arrived unvalidated from the body.
        if (isset($data['subject_id']) && $data['subject_id'] !== null && $data['subject_id'] !== '') {
            $subjectId = Validation::id($data['subject_id']);
            if ($subjectId === null) {
                Response::error('Invalid subject id', 400);
            }
            if (!RoleMiddleware::teachesSubject($facultyId, $subjectId)) {
                Response::forbidden('You are not assigned to that subject');
            }
            $data['subject_id'] = $subjectId;
        } else {
            unset($data['subject_id']);
        }

        $data['faculty_id'] = $facultyId;
        $id = $this->announcementModel->create($data);
        
        if (!$id) {
            Response::serverError('Failed to create announcement');
        }

        Response::success(['id' => $id], 'Announcement created successfully', 201);
    }

    public function update($id) {
        $id = Validation::id($id);
        if ($id === null) {
            Response::error('Invalid announcement id', 400);
        }
        $row = $this->assertCanManage($id);

        $data = Validation::getJsonInput();
        $errors = Validation::validate($data, [
            'title'   => 'required|max:255',
            'content' => 'required',
        ]);
        if ($errors !== true) {
            Response::validationError($errors);
        }

        // Announcement::update()'s allowlist includes subject_id, so without
        // this a teacher could re-file their own announcement under another
        // department's subject. Ownership of the subject does not change on
        // edit, so the field is dropped rather than re-checked.
        unset($data['subject_id'], $data['faculty_id']);

        $result = $this->announcementModel->update($id, $data);
        
        if (!$result) {
            Response::serverError('Failed to update announcement');
        }

        Response::success(null, 'Announcement updated successfully');
    }

    public function destroy($id) {
        $id = Validation::id($id);
        if ($id === null) {
            Response::error('Invalid announcement id', 400);
        }
        $this->assertCanManage($id);

        $result = $this->announcementModel->delete($id);
        
        if (!$result) {
            Response::serverError('Failed to delete announcement');
        }

        Response::success(null, 'Announcement deleted successfully');
    }

    public function markRead($id) {
        $id = Validation::id($id);
        if ($id === null) {
            Response::error('Invalid announcement id', 400);
        }
        // Without this, an unknown id fails the announcement_reads foreign key
        // and surfaces as a 500 instead of a 404.
        if (!$this->announcementModel->getById($id)) {
            Response::notFound('Announcement not found');
        }
        $userId = AuthMiddleware::getUserId();
        $this->announcementModel->markAsRead($id, $userId);
        Response::success(null, 'Announcement marked as read');
    }

    public function readStatus($id) {
        $id = Validation::id($id);
        if ($id === null) {
            Response::error('Invalid announcement id', 400);
        }
        // Read receipts expose who opened the announcement, so only the
        // author, an admin, or the HOD of the subject's department may see it.
        $this->assertCanManage($id);
        $status = $this->announcementModel->getReadStatus($id);
        Response::success($status);
    }

    /**
     * Only the announcing teacher, an admin, or the HOD of the subject's
     * department may edit, delete, or inspect an announcement.
     *
     * The route allows ['faculty','admin'] for update/destroy but there was no
     * ownership check at all, so any teacher could delete any other teacher's
     * announcement.
     */
    private function assertCanManage($id) {
        $row = $this->announcementModel->getById($id);
        if (!$row) {
            Response::notFound('Announcement not found');
        }

        $role = AuthMiddleware::getUserRole();
        if ($role === 'admin') {
            return $row;
        }

        $facultyId = $this->getFacultyId(AuthMiddleware::getUserId());
        if ($facultyId !== null && (int) $row['faculty_id'] === (int) $facultyId) {
            return $row;
        }

        if ($role === 'hod' && !empty($row['subject_id'])) {
            $subject = (new Subject())->findById((int) $row['subject_id']);
            if ($subject && RoleMiddleware::canAccessDepartment($subject['department_id'])) {
                return $row;
            }
        }

        Response::forbidden('You do not have permission to manage this announcement');
    }

    private function getFacultyId($userId) {
        $faculty = (new Faculty())->findByUserId($userId);
        return $faculty ? (int) $faculty['id'] : null;
    }
}
