<?php
/**
 * ADIT CMS - Fee Controller
 */

class FeeController {
    
    private $feeModel;

    public function __construct() {
        $this->feeModel = new Fee();
    }

    public function getStructure() {
        try {
            $courseId  = Validation::id($_GET['course_id'] ?? null);
            $semester  = Validation::id($_GET['semester'] ?? null);
            $studentId = Validation::id($_GET['student_id'] ?? null);

            if ($studentId !== null) {
                if (!RoleMiddleware::canAccessStudent($studentId)) {
                    Response::forbidden('You do not have permission to view that student\'s fee structure');
                }
            }

            if ($studentId !== null && $courseId === null) {
                $student = (new Student())->findById($studentId);
                if ($student) {
                    $semester = $student['semester'] ?? null;
                    $departmentId = $student['department_id'] ?? null;
                    if ($departmentId) {
                        $db = Database::getInstance()->getConnection();
                        $stmt = $db->prepare("SELECT id FROM courses WHERE department_id = ? LIMIT 1");
                        $stmt->execute([$departmentId]);
                        $course = $stmt->fetch();
                        if ($course) {
                            $courseId = $course['id'];
                        }
                    }
                }
            }

            $structure = $this->feeModel->getStructure($courseId, $semester);
            Response::success($structure);
        } catch (Exception $e) {
            error_log("FeeController::getStructure Error: " . $e->getMessage());
            Response::serverError('Failed to load fee structure');
        }
    }

    public function createStructure() {
        try {
            $data = Validation::getJsonInput();

            $rules = [
                'course_id' => 'required|numeric',
                'semester' => 'required|numeric',
                'fee_type' => 'required|max:100',
                'amount' => 'required|numeric'
            ];

            $errors = Validation::validate($data, $rules);
            if ($errors !== true) {
                Response::validationError($errors);
            }

            // An HOD may only define fees for courses in their own department.
            $course = (new Course())->findById(Validation::id($data['course_id']));
            if (!$course) {
                Response::error('Unknown course', 400);
            }
            if (AuthMiddleware::getUserRole() !== 'admin'
                && !RoleMiddleware::canAccessDepartment($course['department_id'])) {
                Response::forbidden('That course belongs to another department');
            }

            $id = $this->feeModel->createStructure($data);
            
            if (!$id) {
                Response::serverError('Failed to create fee structure');
            }

            Response::success(['id' => $id], 'Fee structure created successfully', 201);
        } catch (Exception $e) {
            error_log("FeeController::createStructure Error: " . $e->getMessage());
            Response::serverError('Failed to create fee structure');
        }
    }

    public function createOrder() {
        try {
            $data = Validation::getJsonInput();
            $userId = AuthMiddleware::getUserId();

            $studentModel = new Student();
            $student = $studentModel->findByUserId($userId);

            if (!$student) {
                Response::notFound('Student profile not found');
            }

            // `amount` is deliberately NOT accepted from the client. It used to
            // be taken straight from the request body, so a student could open
            // a Rs.1 order against a Rs.50,000 fee structure; verifyPayment
            // then marked it completed and getPendingDues() credited Rs.1
            // against the full amount. The price is now read from the DB.
            $rules = [
                'fee_structure_id' => 'required|numeric'
            ];

            $errors = Validation::validate($data, $rules);
            if ($errors !== true) {
                Response::validationError($errors);
            }

            $structureId = Validation::id($data['fee_structure_id']);
            if ($structureId === null) {
                Response::error('Invalid fee structure id', 400);
            }

            $structure = $this->feeModel->findStructureById($structureId);
            if (!$structure) {
                Response::notFound('Fee structure not found');
            }

            // The structure must be one this student is actually billed for,
            // otherwise a student could pay a single rupee towards a foreign
            // course's fee and have it recorded as settled.
            $mine = array_map('intval', array_column(
                $this->feeModel->getStructuresForStudent($student['id']),
                'id'
            ));
            if (!in_array($structureId, $mine, true)) {
                Response::forbidden('That fee structure does not apply to you');
            }

            $amount   = (float) $structure['amount'];
            $paise    = (int) round($amount * 100);
            $orderId  = 'order_' . uniqid() . '_' . time();

            $paymentId = $this->feeModel->createPayment([
                'student_id'        => $student['id'],
                'fee_structure_id'  => $structureId,
                'amount'            => $amount,
                'razorpay_order_id' => $orderId,
                'status'            => 'pending'
            ]);

            Response::success([
                'order_id'    => $orderId,
                'amount'      => $paise,
                'currency'    => 'INR',
                'key_id'      => RAZORPAY_KEY_ID,
                'payment_id'  => $paymentId,
                'fee_type'    => $structure['fee_type'],
            ]);
        } catch (Exception $e) {
            error_log("FeeController::createOrder Error: " . $e->getMessage());
            Response::serverError('Failed to create payment order');
        }
    }

    public function verifyPayment() {
        try {
            $data = Validation::getJsonInput();

            $rules = [
                'razorpay_order_id' => 'required',
                'razorpay_payment_id' => 'required',
                'razorpay_signature' => 'required'
            ];

            $errors = Validation::validate($data, $rules);
            if ($errors !== true) {
                Response::validationError($errors);
            }

            $generatedSignature = hash_hmac('sha256',
                $data['razorpay_order_id'] . '|' . $data['razorpay_payment_id'],
                RAZORPAY_KEY_SECRET
            );

            // Verify the signature BEFORE touching the database. The previous
            // order marked the order 'failed' on mismatch and never scoped the
            // write to the caller, so any logged-in student could invalidate an
            // arbitrary order id they had guessed.
            if (!hash_equals($generatedSignature, (string) $data['razorpay_signature'])) {
                Response::error('Payment verification failed', 400);
            }

            $userId = AuthMiddleware::getUserId();
            $updated = $this->feeModel->updatePaymentStatus(
                $data['razorpay_order_id'],
                'completed',
                $data['razorpay_payment_id'],
                $userId
            );

            if (!$updated) {
                Response::error('Payment verification failed', 400);
            }

            Response::success(null, 'Payment verified successfully');
        } catch (Exception $e) {
            error_log("FeeController::verifyPayment Error: " . $e->getMessage());
            Response::serverError('Payment verification failed');
        }
    }

    public function getPayments($studentId = null) {
        try {
            $role = AuthMiddleware::getUserRole();

            if ($role === 'student' || $studentId === null || $studentId === '') {
                // A student may only ever see their own record. The route has
                // no role list, so the id was previously read verbatim from the
                // URL and any account could enumerate every student's payments,
                // dues, Razorpay ids and timestamps.
                $userId  = AuthMiddleware::getUserId();
                $student = (new Student())->findByUserId($userId);
                if (!$student) {
                    Response::notFound('Student profile not found');
                }
                $studentId = $student['id'];
            } else {
                $studentId = Validation::id($studentId);
                if ($studentId === null) {
                    Response::error('Invalid student id', 400);
                }
                if (!RoleMiddleware::canAccessStudent($studentId)) {
                    Response::forbidden('You do not have permission to view these payments');
                }
            }

            $payments   = $this->feeModel->getStudentPayments($studentId);
            $pendingDues = $this->feeModel->getPendingDues($studentId);

            Response::success([
                'student_id'    => (int) $studentId,
                'payments'      => $payments,
                'pending_dues'  => $pendingDues
            ]);
        } catch (Exception $e) {
            error_log("FeeController::getPayments Error: " . $e->getMessage());
            Response::serverError('Failed to load payments');
        }
    }

    public function getReceipt($paymentId) {
        try {
            // Same IDOR as getPayments(): the route allows any logged-in user
            // and the payment id came straight off the URL.
            $paymentId = Validation::id($paymentId);
            if ($paymentId === null) {
                Response::error('Invalid payment id', 400);
            }
            $this->assertCanReadPayment($paymentId);

            $receipt = $this->feeModel->getReceipt($paymentId);
            
            if (!$receipt) {
                Response::notFound('Receipt not found');
            }

            Response::success($receipt);
        } catch (Exception $e) {
            error_log("FeeController::getReceipt Error: " . $e->getMessage());
            Response::serverError('Failed to load receipt');
        }
    }

    /**
     * Shared ownership / department check for a fee payment.
     *
     * student  -> only their own payments
     * faculty  -> no access to fee records
     * librarian-> no access to fee records
     * hod      -> payments of students in the department they head
     * admin    -> anything
     */
    private function assertCanReadPayment($paymentId): array {
        $owner = $this->feeModel->getPaymentOwner($paymentId);
        if ($owner === null) {
            Response::notFound('Receipt not found');
        }

        $role   = AuthMiddleware::getUserRole();
        $userId = AuthMiddleware::getUserId();

        if ($role === 'student') {
            if ((int) $owner['user_id'] !== (int) $userId) {
                Response::forbidden('You do not have permission to view this receipt');
            }
        } elseif ($role === 'hod') {
            if (!RoleMiddleware::canAccessDepartment($owner['department_id'])) {
                Response::forbidden('That receipt belongs to another department');
            }
        } elseif ($role !== 'admin') {
            Response::forbidden('You do not have permission to view fee records');
        }

        return $owner;
    }

    public function downloadReceipt($paymentId) {
        try {
            $paymentId = Validation::id($paymentId);
            if ($paymentId === null) {
                http_response_code(400);
                header('Content-Type: text/plain; charset=utf-8');
                echo 'Invalid payment id';
                exit;
            }

            // This route used to be registered with auth=false, so anyone who
            // guessed /fees/receipt/1, /fees/receipt/2, ... could read every
            // student's fee receipt (name, roll number, amount, txn id).
            $role   = AuthMiddleware::getUserRole();
            $userId = AuthMiddleware::getUserId();

            $owner = $this->feeModel->getPaymentOwner($paymentId);
            if ($owner === null) {
                http_response_code(404);
                header('Content-Type: text/plain; charset=utf-8');
                echo 'Receipt not found';
                exit;
            }

            if ($role === 'student') {
                if ((int) $owner['user_id'] !== (int) $userId) {
                    http_response_code(403);
                    header('Content-Type: text/plain; charset=utf-8');
                    echo 'You do not have permission to view this receipt';
                    exit;
                }
            } elseif ($role === 'faculty' || $role === 'librarian') {
                http_response_code(403);
                header('Content-Type: text/plain; charset=utf-8');
                echo 'You do not have permission to view fee receipts';
                exit;
            } elseif ($role === 'hod') {
                if (!RoleMiddleware::canAccessDepartment($owner['department_id'])) {
                    http_response_code(403);
                    header('Content-Type: text/plain; charset=utf-8');
                    echo 'This receipt belongs to another department';
                    exit;
                }
            } elseif ($role !== 'admin') {
                http_response_code(403);
                header('Content-Type: text/plain; charset=utf-8');
                echo 'Not permitted';
                exit;
            }

            $receipt = $this->feeModel->getReceipt($paymentId);

            if (!$receipt) {
                http_response_code(404);
                header('Content-Type: text/plain; charset=utf-8');
                echo 'Receipt not found';
                exit;
            }

            $orgName = 'ADIT College Management System';
            $receiptNo = $receipt['receipt_no'] ?? ('RCP-' . str_pad($receipt['id'], 5, '0', STR_PAD_LEFT));
            // Everything below is echoed straight into HTML, so escape it.
            // roll_number/fee_type are admin-supplied, which made this a
            // stored XSS sink.
            $e = static fn($v) => htmlspecialchars((string) ($v ?? ''), ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
            $studentName = $e(trim(($receipt['first_name'] ?? '') . ' ' . ($receipt['last_name'] ?? '')));
            $rollNumber = $e($receipt['roll_number'] ?? '-');
            $feeType = $e($receipt['fee_type'] ?? '-');
            $amount = $e(number_format($receipt['amount'] ?? 0, 2));
            $date = $e(date('d M Y', strtotime($receipt['paid_at'] ?? $receipt['created_at'] ?? 'now')));
            $paymentMethod = $e($receipt['payment_method'] ?? 'Razorpay');
            $paymentIdStr = $e($receipt['razorpay_payment_id'] ?? '-');
            $receiptNo = $e($receiptNo);
            $orgName = $e($orgName);

            header('Content-Type: text/html; charset=utf-8');
            echo "<!DOCTYPE html>
<html lang='en'>
<head>
<meta charset='UTF-8'>
<meta name='viewport' content='width=device-width, initial-scale=1.0'>
<title>Receipt - {$receiptNo}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Tahoma, sans-serif; background: #f5f5f5; padding: 40px; }
  .receipt { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; box-shadow: 0 2px 12px rgba(0,0,0,0.1); overflow: hidden; }
  .header { background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 30px; text-align: center; }
  .header h1 { font-size: 24px; margin-bottom: 4px; }
  .header p { opacity: 0.9; font-size: 14px; }
  .badge { display: inline-block; background: rgba(255,255,255,0.2); padding: 4px 16px; border-radius: 20px; font-size: 12px; margin-top: 8px; }
  .body { padding: 30px; }
  .row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #eee; font-size: 14px; }
  .row:last-child { border-bottom: none; }
  .label { color: #666; }
  .value { color: #333; font-weight: 500; }
  .total-row { background: #f0f0ff; margin: 16px -16px 0; padding: 16px; border-radius: 8px; display: flex; justify-content: space-between; font-size: 16px; }
  .total-row .label { font-weight: 600; color: #333; }
  .total-row .value { font-weight: 700; color: #6366f1; font-size: 18px; }
  .footer { text-align: center; padding: 20px 30px; background: #fafafa; border-top: 1px solid #eee; font-size: 12px; color: #999; }
  .print-btn { display: block; width: 100%; max-width: 600px; margin: 16px auto 0; padding: 12px; background: #6366f1; color: white; border: none; border-radius: 8px; font-size: 14px; cursor: pointer; }
  .print-btn:hover { background: #4f46e5; }
  @media print { body { background: white; padding: 0; } .receipt { box-shadow: none; } .print-btn { display: none; } }
</style>
</head>
<body>
<div class='receipt'>
  <div class='header'>
    <h1>Payment Receipt</h1>
    <p>{$orgName}</p>
    <div class='badge'>{$receiptNo}</div>
  </div>
  <div class='body'>
    <div class='row'><span class='label'>Student Name</span><span class='value'>{$studentName}</span></div>
    <div class='row'><span class='label'>Roll Number</span><span class='value'>{$rollNumber}</span></div>
    <div class='row'><span class='label'>Fee Type</span><span class='value'>{$feeType}</span></div>
    <div class='row'><span class='label'>Payment Date</span><span class='value'>{$date}</span></div>
    <div class='row'><span class='label'>Payment Method</span><span class='value'>{$paymentMethod}</span></div>
    <div class='row'><span class='label'>Transaction ID</span><span class='value'>{$paymentIdStr}</span></div>
    <div class='total-row'><span class='label'>Amount Paid</span><span class='value'>₹ {$amount}</span></div>
  </div>
  <div class='footer'>
    <p>This is a system-generated receipt. ADIT College Management System</p>
  </div>
</div>
<button class='print-btn' onclick='window.print()'>Print / Save as PDF</button>
</body>
</html>";
            exit;
        } catch (Exception $e) {
            error_log("FeeController::downloadReceipt Error: " . $e->getMessage());
            http_response_code(500);
            echo 'Failed to generate receipt';
            exit;
        }
    }

    public function getAllPayments() {
        try {
            // Raw ?page / ?page_size were used here, so ?page_size=1000000
            // dumped the whole fee_payments table and ?page_size=-1 produced
            // LIMIT -1 (a SQL error, hidden by the catch below).
            [$page, $pageSize] = Validation::pagination();
            $filters = [
                'department_id' => Validation::id($_GET['department_id'] ?? null),
                'status'        => in_array($_GET['status'] ?? '', ['pending', 'completed', 'failed'], true)
                                    ? $_GET['status'] : null,
                'from_date'     => self::dateOrNull($_GET['from_date'] ?? null),
                'to_date'       => self::dateOrNull($_GET['to_date'] ?? null),
            ];
            $result = $this->feeModel->getAllPaymentsAdmin($page, $pageSize, $filters);
            Response::success($result);
        } catch (Exception $e) {
            error_log("FeeController::getAllPayments Error: " . $e->getMessage());
            Response::serverError('Failed to load payments');
        }
    }

    public function getAllStructures() {
        try {
            $semester = Validation::id($_GET['semester'] ?? null);
            $courseId = Validation::id($_GET['course_id'] ?? null);

            // An HOD was previously able to read any course's fee schedule by
            // passing ?course_id=N. Non-admins are pinned to their own
            // department's courses instead.
            if (AuthMiddleware::getUserRole() !== 'admin') {
                $deptId = RoleMiddleware::scopeDepartmentId();
                if ($deptId === null || $deptId < 1) {
                    Response::forbidden('No department scope for this account');
                }
                $own = (new Course())->getAll($deptId);
                $ids = array_map('intval', array_column($own, 'id'));
                if ($courseId !== null && !in_array($courseId, $ids, true)) {
                    Response::forbidden('That course belongs to another department');
                }
                $courseId = $courseId ?? ($ids[0] ?? null);
            }

            $structures = $this->feeModel->getAllStructures($courseId, $semester);
            Response::success($structures);
        } catch (Exception $e) {
            error_log("FeeController::getAllStructures Error: " . $e->getMessage());
            Response::serverError('Failed to load fee structures');
        }
    }

    public function updateStructure($id) {
        try {
            $id = Validation::id($id);
            if ($id === null) {
                Response::error('Invalid fee structure id', 400);
            }

            $existing = $this->feeModel->findStructureById($id);
            if (!$existing) {
                Response::notFound('Fee structure not found');
            }

            // Fee::updateStructure's allowlist includes course_id, so without
            // this an HOD could rewrite another department's schedule (or
            // re-point a row at their own course_id) and change what a different
            // department's students are billed.
            if (AuthMiddleware::getUserRole() !== 'admin'
                && !RoleMiddleware::canAccessDepartment($existing['department_id'])) {
                Response::forbidden('That fee structure belongs to another department');
            }

            $data = Validation::getJsonInput();
            $errors = Validation::validate($data, [
                'course_id' => 'required|numeric',
                'semester'  => 'required|numeric',
                'fee_type'  => 'required|max:100',
                'amount'    => 'required|numeric',
            ]);
            if ($errors !== true) {
                Response::validationError($errors);
            }

            // A client-supplied course_id may not cross departments either.
            $targetCourse = (new Course())->findById(Validation::id($data['course_id']));
            if (!$targetCourse) {
                Response::error('Unknown course', 400);
            }            if (AuthMiddleware::getUserRole() !== 'admin'
                && !RoleMiddleware::canAccessDepartment($targetCourse['department_id'])) {
                Response::forbidden('That course belongs to another department');
            }

            $result = $this->feeModel->updateStructure($id, $data);
            if (!$result) {
                Response::serverError('Failed to update fee structure');
            }
            Response::success(null, 'Fee structure updated successfully');
        } catch (Exception $e) {
            error_log("FeeController::updateStructure Error: " . $e->getMessage());
            Response::serverError('Failed to update fee structure');
        }
    }

    public function deleteStructure($id) {
        try {
            $id = Validation::id($id);
            if ($id === null) {
                Response::error('Invalid fee structure id', 400);
            }
            if (!$this->feeModel->findStructureById($id)) {
                Response::notFound('Fee structure not found');
            }
            $result = $this->feeModel->deleteStructure($id);
            if (!$result) {
                Response::serverError('Failed to delete fee structure');
            }
            Response::success(null, 'Fee structure deleted successfully');
        } catch (Exception $e) {
            error_log("FeeController::deleteStructure Error: " . $e->getMessage());
            Response::serverError('Failed to delete fee structure');
        }
    }

    public function getFeeReport() {
        try {
            // An HOD must not be able to pull the fee report for a department
            // they do not head.
            $departmentId = AuthMiddleware::getUserRole() === 'admin'
                ? Validation::id($_GET['department_id'] ?? null)
                : RoleMiddleware::scopeDepartmentId();
            if ($departmentId !== null && $departmentId < 1) {
                Response::forbidden('No department scope for this account');
            }

            $filters = [
                'department_id' => $departmentId,
                'from_date'     => self::dateOrNull($_GET['from_date'] ?? null),
                'to_date'       => self::dateOrNull($_GET['to_date'] ?? null),
            ];
            $report = $this->feeModel->getFeeReport($filters);
            Response::success($report);
        } catch (Exception $e) {
            error_log("FeeController::getFeeReport Error: " . $e->getMessage());
            Response::serverError('Failed to load fee report');
        }
    }

    /** Accept a YYYY-MM-DD query parameter, or null. */
    private static function dateOrNull($value) {
        if (!is_string($value) || $value === '') {
            return null;
        }
        return preg_match('/^\d{4}-\d{2}-\d{2}$/', $value) ? $value : null;
    }
}
