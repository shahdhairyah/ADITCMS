<?php
/**
 * ADIT CMS - PHP Router Fallback
 * If .htaccess rewrite doesn't work on InfinityFree, this file
 * serves as an alternative entry point.
 * 
 * Usage: https://adit.shahdhairyah.in/router.php/auth/login
 * Or configure the frontend API_URL to: https://adit.shahdhairyah.in/router.php
 */
require_once __DIR__ . '/api/index.php';
