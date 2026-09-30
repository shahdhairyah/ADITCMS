<?php
/**
 * ADIT CMS - Authentication Controller
 * Complete auth: register, login, logout, forgot/reset password, email verification, profile
 */

class AuthController {
    
    private $userModel;

    public function __construct() {
        $this->userModel = new User();
    }

    /**
     * Auto-create password_resets and email_verifications tables if missing
     */
    private function ensureAuthTables() {
        $db = Database::getInstance()->getConnection();
        $tables = $db->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);

        if (!in_array('password_resets', $tables)) {
            $db->exec("CREATE TABLE IF NOT EXISTS password_resets (
                id INT PRIMARY KEY AUTO_INCREMENT,
                user_id INT NOT NULL,
                token VARCHAR(64) NOT NULL,
                expires_at DATETIME NOT NULL,
                used TINYINT(1) DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_token (token),
                INDEX idx_user_id (user_id),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB");
            error_log("ADIT: Auto-created password_resets table");
        }

        if (!in_array('email_verifications', $tables)) {
            $db->exec("CREATE TABLE IF NOT EXISTS email_verifications (
                id INT PRIMARY KEY AUTO_INCREMENT,
                user_id INT NOT NULL,
                token VARCHAR(64) NOT NULL,
                expires_at DATETIME NOT NULL,
                verified TINYINT(1) DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_token (token),
                INDEX idx_user_id (user_id),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB");
            error_log("ADIT: Auto-created email_verifications table");
        }
    }

    public function register() {
        Response::error('Self-registration is disabled. Please contact your administrator to create an account.', 403);
    }

    public function login() {
        $data = Validation::getJsonInput();

        $rules = [
            'email' => 'required|email',
            'password' => 'required'
        ];

        $errors = Validation::validate($data, $rules);
        if ($errors !== true) {
            Response::validationError($errors);
        }

        $user = $this->userModel->verifyPassword($data['email'], $data['password']);

        if (!$user) {
            Response::error('Invalid email or password', 401);
        }

        if ($user['status'] !== 'active') {
            Response::error('Account is ' . $user['status'], 403);
        }

        $token = JWT::generate($user['id'], $user['email'], $user['role']);

        $profile = null;
        if ($user['role'] === 'student') {
            $studentModel = new Student();
            $profile = $studentModel->findByUserId($user['id']);
        } elseif ($user['role'] === 'faculty' || $user['role'] === 'hod') {
            $facultyModel = new Faculty();
            $profile = $facultyModel->findByUserId($user['id']);
        }

        Response::success([
            'token' => $token,
            'user' => [
                'id' => $user['id'],
                'email' => $user['email'],
                'role' => $user['role'],
                'profile' => $profile
            ],
            // Set when the account still holds the provisioning password from
            // api/setup_passwords.php. The API refuses everything except the
            // password change for such an account, so the client must send the
            // user to /change-password instead of their dashboard.
            'must_change_password' => (int) ($user['must_change_password'] ?? 0) === 1,
        ], 'Login successful');
    }

    public function me() {
        $userId = AuthMiddleware::getUserId();
        $role = AuthMiddleware::getUserRole();

        $user = $this->userModel->findById($userId);
        if (!$user) {
            Response::notFound('User not found');
        }

        $profile = null;
        if ($role === 'student') {
            $studentModel = new Student();
            $profile = $studentModel->findByUserId($userId);
        } elseif ($role === 'faculty' || $role === 'hod') {
            $facultyModel = new Faculty();
            $profile = $facultyModel->findByUserId($userId);
        }

        Response::success([
            'id' => $user['id'],
            'email' => $user['email'],
            'role' => $user['role'],
            'status' => $user['status'],
            'profile' => $profile,
            'created_at' => $user['created_at'],
            // The client restores the session through this endpoint, so the
            // forced-change flag has to be reported here as well or a reload
            // would drop a flagged user on their dashboard, where every call
            // is refused by AuthMiddleware.
            'must_change_password' => (int) ($user['must_change_password'] ?? 0) === 1
        ]);
    }

    public function updateProfile() {
        try {
            $userId = AuthMiddleware::getUserId();
            $role   = AuthMiddleware::getUserRole();
            $data   = Validation::getJsonInput();

            // This endpoint wrote the raw request body into the profile row
            // with no allowlist and no try/catch. Student::update()'s own
            // allowlist includes `semester` and `batch`, so
            // PUT /auth/profile {"semester":1} let a student rewrite their own
            // semester - which changes the subjects they are shown, the
            // semester their fees are billed for, and which results rows they
            // can read. StudentController::update deliberately restricts
            // students to phone/address for exactly this reason.
            if ($role === 'student') {
                $allowed = ['phone', 'address', 'photo'];
            } elseif ($role === 'faculty' || $role === 'hod') {
                $allowed = ['phone', 'address', 'photo', 'qualification', 'designation', 'specialization'];
            } else {
                // librarian / admin have no self-service profile form here.
                Response::forbidden('Profile updates are not available for your role');
            }

            $data = array_intersect_key($data, array_flip($allowed));
            if (!$data) {
                Response::error('No editable fields supplied', 400);
            }

            $errors = Validation::validate($data, [
                'phone'   => 'nullable|max:20',
                'address' => 'nullable|max:255',
            ]);
            if ($errors !== true) {
                Response::validationError($errors);
            }

            if ($role === 'student') {
                $student = (new Student())->findByUserId($userId);
                if (!$student) {
                    Response::notFound('Student profile not found');
                }
                (new Student())->update($student['id'], $data);
                $profile = (new Student())->findByUserId($userId);
            } else {
                $faculty = (new Faculty())->findByUserId($userId);
                if (!$faculty) {
                    Response::notFound('Faculty profile not found');
                }
                (new Faculty())->update($faculty['id'], $data);
                $profile = (new Faculty())->findByUserId($userId);
            }

            $user = $this->userModel->findById($userId);

            Response::success([
                'id'      => $user['id'],
                'email'   => $user['email'],
                'role'    => $user['role'],
                'profile' => $profile
            ], 'Profile updated successfully');
        } catch (Exception $e) {
            error_log("AuthController::updateProfile Error: " . $e->getMessage());
            Response::serverError('Failed to update profile');
        }
    }

    public function logout() {
        Response::success(null, 'Logged out successfully');
    }

    public function forgotPassword() {
        try {
            $data = Validation::getJsonInput();

            $rules = ['email' => 'required|email'];
            $errors = Validation::validate($data, $rules);
            if ($errors !== true) {
                Response::validationError($errors);
            }

            $email = $data['email'];

            $user = $this->userModel->findByEmail($email);

            if ($user && $user['status'] === 'active') {
                try {
                    $this->ensureAuthTables();

                    $db = Database::getInstance()->getConnection();
                    $stmt = $db->prepare("DELETE FROM password_resets WHERE user_id = ? OR expires_at < NOW()");
                    $stmt->execute([$user['id']]);

                    $token = $this->userModel->createPasswordResetToken($user['id']);

                    $sent = @EmailHelper::sendPasswordReset($user['email'], $token);
                    error_log("ADIT ForgotPassword: email sent=" . ($sent ? 'yes' : 'no') . " for " . $user['email']);
                } catch (Exception $e) {
                    error_log("ADIT ForgotPassword inner error: " . $e->getMessage());
                }
            }

            Response::success(null, 'If the email exists, a reset link has been sent');

        } catch (Exception $e) {
            error_log("ADIT ForgotPassword outer error: " . $e->getMessage());
            Response::success(null, 'If the email exists, a reset link has been sent');
        }
    }

    public function resetPassword() {
        try {
            $data = Validation::getJsonInput();

            $rules = [
                'token' => 'required',
                'password' => 'required|min:8'
            ];

            $errors = Validation::validate($data, $rules);
            if ($errors !== true) {
                Response::validationError($errors);
            }

            $this->ensureAuthTables();

            $resetData = $this->userModel->validatePasswordResetToken($data['token']);
            if (!$resetData) {
                $db = Database::getInstance()->getConnection();
                $stmt = $db->prepare("SELECT COUNT(*) FROM password_resets WHERE token = ?");
                $stmt->execute([$data['token']]);
                $tokenExists = $stmt->fetchColumn();
                $stmt = $db->prepare("SELECT COUNT(*) FROM password_resets WHERE token = ? AND expires_at > NOW() AND used = 0");
                $stmt->execute([$data['token']]);
                $tokenValid = $stmt->fetchColumn();
                error_log("ADIT ResetPassword: token_exists=$tokenExists, token_valid=$tokenValid, token_len=" . strlen($data['token']));
                Response::error('Invalid or expired reset token', 400);
            }

            $this->userModel->updatePassword($resetData['uid'], $data['password']);
            $this->userModel->usePasswordResetToken($data['token']);

            Response::success(null, 'Password reset successful. You can now login with your new password.');

        } catch (Exception $e) {
            error_log("ADIT ResetPassword error: " . $e->getMessage());
            Response::error('Failed to reset password', 500);
        }
    }

    public function verifyEmail() {
        try {
            $token = $_GET['token'] ?? '';
            if (empty($token)) {
                Response::error('Verification token is required', 400);
            }

            $this->ensureAuthTables();

            $verifyData = $this->userModel->validateVerificationToken($token);
            if (!$verifyData) {
                Response::error('Invalid or expired verification token', 400);
            }

            $this->userModel->updateStatus($verifyData['uid'], 'active');
            $this->userModel->useVerificationToken($token);

            header('Location: ' . FRONTEND_URL . '/login?verified=1');
            exit;

        } catch (Exception $e) {
            error_log("ADIT VerifyEmail error: " . $e->getMessage());
            header('Location: ' . FRONTEND_URL . '/login?error=verification_failed');
            exit;
        }
    }

    public function changePassword() {
        $userId = AuthMiddleware::getUserId();
        $data = Validation::getJsonInput();

        $rules = [
            'current_password' => 'required',
            'new_password' => 'required|min:8'
        ];

        $errors = Validation::validate($data, $rules);
        if ($errors !== true) {
            Response::validationError($errors);
        }

        $user = $this->userModel->findById($userId);
        if (!$user || !password_verify($data['current_password'], $user['password_hash'])) {
            Response::error('Current password is incorrect', 400);
        }

        $this->userModel->updatePassword($userId, $data['new_password']);

        Response::success(null, 'Password changed successfully');
    }
}
