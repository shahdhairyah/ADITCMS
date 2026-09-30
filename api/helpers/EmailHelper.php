<?php
/**
 * ADIT CMS - Email Helper using Resend API
 * Robust email sending with fallback error handling
 */

class EmailHelper {

    private static $apiKey = null;
    private static $initialized = false;

    private static function init() {
        if (self::$initialized) return;
        self::$initialized = true;
        self::$apiKey = defined('RESEND_API_KEY') ? RESEND_API_KEY : '';
    }

    public static function send($to, $subject, $htmlBody) {
        self::init();

        if (empty(self::$apiKey)) {
            error_log("ADIT Email: No RESEND_API_KEY configured in config.php");
            return false;
        }

        if (empty($to)) {
            error_log("ADIT Email: No recipient specified");
            return false;
        }

        $toEmail = is_array($to) ? $to : [$to];
        $fromEmail = defined('EMAIL_FROM') ? EMAIL_FROM : 'adit@mail.thedhairya.in';
        $fromName = defined('EMAIL_FROM_NAME') ? EMAIL_FROM_NAME : 'ADIT CMS';
        $from = $fromName . ' <' . $fromEmail . '>';

        $payload = json_encode([
            'from' => $from,
            'to' => $toEmail,
            'subject' => $subject,
            'html' => $htmlBody
        ]);

        // Check if curl is available
        if (!function_exists('curl_init')) {
            error_log("ADIT Email: curl extension not available");
            return false;
        }

        $ch = curl_init('https://api.resend.com/emails');
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_HTTPHEADER => [
                'Authorization: Bearer ' . self::$apiKey,
                'Content-Type: application/json',
                'Content-Length: ' . strlen($payload)
            ],
            CURLOPT_POSTFIELDS => $payload,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 30,
            CURLOPT_SSL_VERIFYPEER => true
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        $curlErrno = curl_errno($ch);
        curl_close($ch);

        if ($curlErrno) {
            error_log("ADIT Email cURL Error ($curlErrno): $curlError");
            return false;
        }

        if ($httpCode >= 200 && $httpCode < 300) {
            error_log("ADIT Email: Sent successfully to " . implode(', ', $toEmail));
            return true;
        }

        error_log("ADIT Email API Error (HTTP $httpCode): " . substr($response, 0, 200));
        return false;
    }

    public static function sendPasswordReset($email, $token) {
        self::init();
        $resetUrl = FRONTEND_URL . '/reset-password?token=' . $token;

        $html = '
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"></head>
        <body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
            <div style="background:#1e40af;color:white;padding:20px;border-radius:8px 8px 0 0;">
                <h1 style="margin:0;font-size:24px;">ADIT College Management System</h1>
            </div>
            <div style="background:#f8fafc;padding:30px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px;">
                <h2 style="color:#1e293b;">Password Reset Request</h2>
                <p style="color:#475569;line-height:1.6;">We received a request to reset your password. Click the button below to set a new password:</p>
                <div style="text-align:center;margin:30px 0;">
                    <a href="' . htmlspecialchars($resetUrl) . '" style="background:#1e40af;color:white;padding:12px 30px;text-decoration:none;border-radius:6px;font-weight:bold;display:inline-block;">Reset Password</a>
                </div>
                <p style="color:#94a3b8;font-size:13px;">This link expires in 1 hour. If you did not request this, please ignore this email.</p>
                <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;">
                <p style="color:#94a3b8;font-size:12px;">A.D. Institute of Technology (ADIT)</p>
            </div>
        </body></html>';

        return self::send($email, 'ADIT - Password Reset Request', $html);
    }

    public static function sendLeaveNotification($studentEmail, $studentName, $leaveData) {
        $leaveType = $leaveData['leave_type'] ?? 'N/A';
        $startDate = $leaveData['from_date'] ?? $leaveData['start_date'] ?? 'N/A';
        $endDate = $leaveData['to_date'] ?? $leaveData['end_date'] ?? 'N/A';
        $reason = $leaveData['reason'] ?? 'N/A';

        $subject = 'Leave Application Submitted - ADIT CMS';
        $html = '
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"></head>
        <body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
            <div style="background:#1e40af;color:white;padding:20px;border-radius:8px 8px 0 0;">
                <h1 style="margin:0;font-size:24px;">ADIT College Management System</h1>
            </div>
            <div style="background:#f8fafc;padding:30px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px;">
                <h2 style="color:#1e293b;">Leave Application Submitted</h2>
                <p style="color:#475569;line-height:1.6;">Dear <strong>' . htmlspecialchars($studentName) . '</strong>, your leave application has been received.</p>
                <table style="width:100%;border-collapse:collapse;margin:20px 0;">
                    <tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:bold;">Leave Type</td><td style="padding:8px;border:1px solid #e2e8f0;">' . htmlspecialchars($leaveType) . '</td></tr>
                    <tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:bold;">From</td><td style="padding:8px;border:1px solid #e2e8f0;">' . htmlspecialchars($startDate) . '</td></tr>
                    <tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:bold;">To</td><td style="padding:8px;border:1px solid #e2e8f0;">' . htmlspecialchars($endDate) . '</td></tr>
                    <tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:bold;">Reason</td><td style="padding:8px;border:1px solid #e2e8f0;">' . nl2br(htmlspecialchars($reason)) . '</td></tr>
                </table>
                <p style="color:#475569;">Your application is pending approval. You will be notified once reviewed.</p>
                <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;">
                <p style="color:#94a3b8;font-size:12px;">A.D. Institute of Technology (ADIT)</p>
            </div>
        </body></html>';

        error_log("ADIT Email: Leave notification sent to $studentEmail for $studentName");
        return self::send($studentEmail, $subject, $html);
    }

    public static function sendLeaveStatusNotification($studentEmail, $studentName, $leaveData) {
        $status = $leaveData['status'] ?? 'updated';
        $leaveType = $leaveData['leave_type'] ?? 'N/A';
        $startDate = $leaveData['from_date'] ?? $leaveData['start_date'] ?? 'N/A';
        $endDate = $leaveData['to_date'] ?? $leaveData['end_date'] ?? 'N/A';
        $comments = $leaveData['comments'] ?? '';

        $subject = 'Leave Application ' . ucfirst($status) . ' - ADIT CMS';
        $html = '
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"></head>
        <body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
            <div style="background:' . ($status === 'approved' ? '#16a34a' : '#dc2626') . ';color:white;padding:20px;border-radius:8px 8px 0 0;">
                <h1 style="margin:0;font-size:24px;">ADIT College Management System</h1>
            </div>
            <div style="background:#f8fafc;padding:30px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px;">
                <h2 style="color:#1e293b;">Leave Application ' . ucfirst($status) . '</h2>
                <p style="color:#475569;line-height:1.6;">Dear <strong>' . htmlspecialchars($studentName) . '</strong>, your leave application has been <strong>' . strtoupper($status) . '</strong>.</p>
                <table style="width:100%;border-collapse:collapse;margin:20px 0;">
                    <tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:bold;">Leave Type</td><td style="padding:8px;border:1px solid #e2e8f0;">' . htmlspecialchars($leaveType) . '</td></tr>
                    <tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:bold;">From</td><td style="padding:8px;border:1px solid #e2e8f0;">' . htmlspecialchars($startDate) . '</td></tr>
                    <tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:bold;">To</td><td style="padding:8px;border:1px solid #e2e8f0;">' . htmlspecialchars($endDate) . '</td></tr>
                    <tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:bold;">Status</td><td style="padding:8px;border:1px solid #e2e8f0;color:' . ($status === 'approved' ? '#16a34a' : '#dc2626') . ';font-weight:bold;">' . ucfirst($status) . '</td></tr>
                </table>';

        if ($comments) {
            $html .= '<p style="color:#475569;"><strong>Remarks:</strong> ' . nl2br(htmlspecialchars($comments)) . '</p>';
        }

        $html .= '
                <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;">
                <p style="color:#94a3b8;font-size:12px;">A.D. Institute of Technology (ADIT)</p>
            </div>
        </body></html>';

        error_log("ADIT Email: Leave status notification ($status) sent to $studentEmail for $studentName");
        return self::send($studentEmail, $subject, $html);
    }

    public static function sendAssignmentNotification($studentEmail, $studentName, $assignmentData) {
        $title = $assignmentData['title'] ?? 'New Assignment';
        $subjectName = $assignmentData['subject_name'] ?? '';
        $dueDate = $assignmentData['due_date'] ?? $assignmentData['submission_date'] ?? 'N/A';
        $description = $assignmentData['description'] ?? '';

        $subject = 'New Assignment: ' . $title . ' - ADIT CMS';
        $html = '
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"></head>
        <body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
            <div style="background:#1e40af;color:white;padding:20px;border-radius:8px 8px 0 0;">
                <h1 style="margin:0;font-size:24px;">ADIT College Management System</h1>
            </div>
            <div style="background:#f8fafc;padding:30px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px;">
                <h2 style="color:#1e293b;">New Assignment Posted</h2>
                <p style="color:#475569;line-height:1.6;">Dear <strong>' . htmlspecialchars($studentName) . '</strong>, a new assignment has been posted.</p>
                <table style="width:100%;border-collapse:collapse;margin:20px 0;">
                    <tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:bold;">Title</td><td style="padding:8px;border:1px solid #e2e8f0;">' . htmlspecialchars($title) . '</td></tr>
                    <tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:bold;">Subject</td><td style="padding:8px;border:1px solid #e2e8f0;">' . htmlspecialchars($subjectName) . '</td></tr>
                    <tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:bold;">Due Date</td><td style="padding:8px;border:1px solid #e2e8f0;">' . htmlspecialchars($dueDate) . '</td></tr>';

        if ($description) {
            $html .= '<tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:bold;">Description</td><td style="padding:8px;border:1px solid #e2e8f0;">' . nl2br(htmlspecialchars($description)) . '</td></tr>';
        }

        $html .= '
                </table>
                <p style="color:#475569;">Please log in to the ADIT portal to view and submit your assignment.</p>
                <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;">
                <p style="color:#94a3b8;font-size:12px;">A.D. Institute of Technology (ADIT)</p>
            </div>
        </body></html>';

        error_log("ADIT Email: Assignment notification sent to $studentEmail for $studentName");
        return self::send($studentEmail, $subject, $html);
    }

    public static function sendLeaveApplication($studentEmail, $studentName, $leaveData) {
        $subject = "Leave Application Submitted - ADIT CMS";
        $html = "<h2>Leave Application Submitted</h2>
                <p>Dear {$studentName},</p>
                <p>Your leave application has been submitted successfully.</p>
                <p><strong>Type:</strong> {$leaveData['leave_type']}</p>
                <p><strong>From:</strong> {$leaveData['from_date']}</p>
                <p><strong>To:</strong> {$leaveData['to_date']}</p>
                <p><strong>Reason:</strong> {$leaveData['reason']}</p>
                <p>You will be notified once it is reviewed.</p>";
        return self::send($studentEmail, $subject, $html);
    }

    public static function sendLeaveStatus($studentEmail, $studentName, $status, $comments = '') {
        $subject = "Leave Application " . ucfirst($status) . " - ADIT CMS";
        $html = "<h2>Leave Application {$status}</h2>
                <p>Dear {$studentName},</p>
                <p>Your leave application has been <strong>{$status}</strong>.</p>
                " . ($comments ? "<p>Comments: {$comments}</p>" : "") . "
                <p>Thank you.</p>";
        return self::send($studentEmail, $subject, $html);
    }

    public static function sendAssignmentReminder($studentEmail, $studentName, $assignmentTitle, $deadline) {
        $subject = "Assignment Reminder - {$assignmentTitle}";
        $html = "<h2>Assignment Reminder</h2>
                <p>Dear {$studentName},</p>
                <p>This is a reminder that the assignment <strong>{$assignmentTitle}</strong> is due on {$deadline}.</p>
                <p>Please submit it on time.</p>";
        return self::send($studentEmail, $subject, $html);
    }

    public static function sendVerification($email, $token) {
        self::init();
        $verifyUrl = FRONTEND_URL . '/verify-email?token=' . $token;

        $html = '
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"></head>
        <body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
            <div style="background:#1e40af;color:white;padding:20px;border-radius:8px 8px 0 0;">
                <h1 style="margin:0;font-size:24px;">ADIT College Management System</h1>
            </div>
            <div style="background:#f8fafc;padding:30px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px;">
                <h2 style="color:#1e293b;">Verify Your Email</h2>
                <p style="color:#475569;line-height:1.6;">Welcome to ADIT CMS! Please verify your email address:</p>
                <div style="text-align:center;margin:30px 0;">
                    <a href="' . htmlspecialchars($verifyUrl) . '" style="background:#16a34a;color:white;padding:12px 30px;text-decoration:none;border-radius:6px;font-weight:bold;display:inline-block;">Verify Email</a>
                </div>
                <p style="color:#94a3b8;font-size:13px;">This link expires in 24 hours.</p>
                <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;">
                <p style="color:#94a3b8;font-size:12px;">A.D. Institute of Technology (ADIT)</p>
            </div>
        </body></html>';

        return self::send($email, 'ADIT - Verify Your Email', $html);
    }
}
