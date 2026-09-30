<?php
/**
 * ADIT College Management System - Database Connection
 */

class Database {
    private static $instance = null;
    protected $connection;

    private function __construct() {
        try {
            $host    = defined('DB_HOST') ? DB_HOST : 'localhost';
            $dbname  = defined('DB_NAME') ? DB_NAME : 'adit_cms';
            $username = defined('DB_USER') ? DB_USER : 'root';
            $password = defined('DB_PASS') ? DB_PASS : '';

            $dsn = "mysql:host={$host};dbname={$dbname};charset=utf8mb4";
            $options = [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
                PDO::ATTR_STRINGIFY_FETCHES  => false,
            ];
            $this->connection = new PDO($dsn, $username, $password, $options);
            $this->connection->exec("SET NAMES utf8mb4");
        } catch (PDOException $e) {
            error_log("ADIT CMS: Database connection failed: " . $e->getMessage());
            throw $e;
        }
    }

    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    public function getConnection() {
        return $this->connection;
    }

    /**
     * Run a closure inside a transaction, rolling back on any throwable.
     */
    public function transaction(callable $fn) {
        $conn = $this->connection;
        $conn->beginTransaction();
        try {
            $result = $fn($conn);
            $conn->commit();
            return $result;
        } catch (Throwable $e) {
            if ($conn->inTransaction()) {
                $conn->rollBack();
            }
            throw $e;
        }
    }

    protected function __clone() {}

    public function __wakeup() {
        throw new \Exception("Cannot unserialize singleton");
    }
}
