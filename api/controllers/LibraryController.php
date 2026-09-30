<?php
/**
 * ADIT CMS - Library Controller
 */

class LibraryController {
    
    private $libraryModel;

    public function __construct() {
        $this->libraryModel = new Library();
    }

    public function getBooks() {
        try {
            $search = $_GET['search'] ?? null;
            $category = $_GET['category'] ?? null;

            $books = $this->libraryModel->getBooks($search, $category);
            Response::success($books);
        } catch (Exception $e) {
            error_log("LibraryController::getBooks Error: " . $e->getMessage());
            Response::serverError('Failed to load books');
        }
    }

    public function addBook() {
        try {
            $data = Validation::getJsonInput();

            $rules = [
                'title' => 'required|max:255',
                'author' => 'required|max:255',
                'total_copies' => 'required|numeric'
            ];

            $errors = Validation::validate($data, $rules);
            if ($errors !== true) {
                Response::validationError($errors);
            }

            $id = $this->libraryModel->addBook($data);
            
            if (!$id) {
                Response::serverError('Failed to add book');
            }

            Response::success(['id' => $id], 'Book added successfully', 201);
        } catch (Exception $e) {
            error_log("LibraryController::addBook Error: " . $e->getMessage());
            Response::serverError('Failed to add book');
        }
    }

    public function issueBook() {
        try {
            $data = Validation::getJsonInput();

            $rules = [
                'book_id' => 'required|numeric',
                'student_id' => 'required|numeric'
            ];

            $errors = Validation::validate($data, $rules);
            if ($errors !== true) {
                Response::validationError($errors);
            }

            $bookId = Validation::id($data['book_id']);
            $studentId = Validation::id($data['student_id']);
            if ($bookId === null || $studentId === null) {
                Response::error('Invalid book or student id', 400);
            }

            // issueBook() decrements available_copies inside a transaction but
            // never verified the student exists, so a mistyped id produced an
            // orphan row and a permanently lost copy.
            if (!(new Student())->findById($studentId)) {
                Response::notFound('Student not found');
            }

            $book = $this->libraryModel->getBookById($bookId);
            if (!$book) {
                Response::notFound('Book not found');
            }
            if ($book['available_copies'] <= 0) {
                Response::error('Book not available for issue', 400);
            }

            $data['book_id']    = $bookId;
            $data['student_id'] = $studentId;

            $id = $this->libraryModel->issueBook($data);
            
            if (!$id) {
                Response::serverError('Failed to issue book');
            }

            Response::success(['issue_id' => $id], 'Book issued successfully', 201);
        } catch (Exception $e) {
            error_log("LibraryController::issueBook Error: " . $e->getMessage());
            Response::serverError('Failed to issue book');
        }
    }

    public function returnBook() {
        try {
            $data = Validation::getJsonInput();

            $rules = ['issue_id' => 'required|numeric'];
            $errors = Validation::validate($data, $rules);
            if ($errors !== true) {
                Response::validationError($errors);
            }

            $result = $this->libraryModel->returnBook($data['issue_id']);
            
            if (!$result) {
                Response::serverError('Failed to return book');
            }

            Response::success($result, 'Book returned successfully');
        } catch (Exception $e) {
            error_log("LibraryController::returnBook Error: " . $e->getMessage());
            Response::serverError('Failed to return book');
        }
    }

    public function getHistory($studentId) {
        try {
            // The route carries no role list, so the student id arrived
            // straight from the URL and any logged-in account (including
            // another student or the librarian) could enumerate every
            // student's borrowing history.
            $studentId = Validation::id($studentId);
            if ($studentId === null) {
                Response::error('Invalid student id', 400);
            }
            if (!RoleMiddleware::canAccessStudent($studentId)) {
                Response::forbidden('You do not have permission to view this student\'s library history');
            }

            $history = $this->libraryModel->getStudentHistory($studentId);
            Response::success($history);
        } catch (Exception $e) {
            error_log("LibraryController::getHistory Error: " . $e->getMessage());
            Response::serverError('Failed to load library history');
        }
    }

    public function getFines($studentId) {
        try {
            $studentId = Validation::id($studentId);
            if ($studentId === null) {
                Response::error('Invalid student id', 400);
            }
            if (!RoleMiddleware::canAccessStudent($studentId)) {
                Response::forbidden('You do not have permission to view this student\'s fines');
            }

            $fines = $this->libraryModel->getStudentFines($studentId);
            Response::success($fines);
        } catch (Exception $e) {
            error_log("LibraryController::getFines Error: " . $e->getMessage());
            Response::serverError('Failed to load fines');
        }
    }
}
