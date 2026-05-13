<?php
$envFile = __DIR__ . '/.env';
$env = file_exists($envFile) ? parse_ini_file($envFile) : [];

define('DB_HOST', $env['DB_HOST'] ?? getenv('DB_HOST') ?: 'localhost');
define('DB_NAME', $env['DB_NAME'] ?? getenv('DB_NAME') ?: 'your_database_name');
define('DB_USER', $env['DB_USER'] ?? getenv('DB_USER') ?: 'your_database_user');
define('DB_PASS', $env['DB_PASS'] ?? getenv('DB_PASS') ?: 'your_database_password');

define('MAX_POSSIBLE_SCORE', 10000);
