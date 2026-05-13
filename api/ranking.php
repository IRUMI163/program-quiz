<?php
session_start();
header('Content-Type: application/json');

require_once 'config.php';

try {
    $pdo = new PDO("mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4", DB_USER, DB_PASS, [
        PDO::ATTR_TIMEOUT => 2,
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_EMULATE_PREPARES => false,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        if (isset($_SESSION['last_submit']) && (time() - $_SESSION['last_submit']) < 10) {
            http_response_code(429);
            echo json_encode(['error' => 'Too Many Requests. Please wait 10 seconds.']);
            exit;
        }
        $_SESSION['last_submit'] = time();

        $d = json_decode(file_get_contents('php://input'), true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid JSON Format']);
            exit;
        }

        if (!$d || !isset($d['name'], $d['score'], $d['diff'], $d['category'], $d['results'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid Request']);
            exit;
        }

        $category = $d['category'];
        $allowed_categories = ['javascript', 'css', 'html', 'python', 'typescript', 'react', 'git', 'linux', 'network', 'sql', 'security', 'algorithm'];
        if (!in_array($category, $allowed_categories, true)) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid Category']);
            exit;
        }

        if (!isset($_SESSION['quiz_start_at'])) {
            http_response_code(403);
            echo json_encode(['error' => 'Session Expired or Invalid Start']);
            exit;
        }

        $elapsed = time() - $_SESSION['quiz_start_at'];
        if ($elapsed < 5) { 
            http_response_code(403);
            echo json_encode(['error' => 'Cheat Detected: Time too short']);
            exit;
        }

        $name = mb_substr(trim($d['name']), 0, 10, 'UTF-8');
        if ($name === '') $name = 'Anonymous';

        $diff = filter_var($d['diff'], FILTER_VALIDATE_INT);

        if ($diff === false || $diff < 1 || $diff > 5) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid Difficulty']);
            exit;
        }

        $results = $d['results'];
        if (!is_array($results) || count($results) > 10) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid Results Count']);
            exit;
        }

        $json_file = __DIR__ . '/../js/data/' . $category . '.json';
        if (!file_exists($json_file)) {
            http_response_code(500);
            echo json_encode(['error' => 'Question Data Missing']);
            exit;
        }

        $questions = json_decode(file_get_contents($json_file), true);
        if (!$questions) {
            http_response_code(500);
            echo json_encode(['error' => 'Invalid Question Data']);
            exit;
        }

        $calc_score = 0;
        $combo = 0;
        $multipliers = [1 => 1.0, 2 => 1.2, 3 => 1.5, 4 => 2.0, 5 => 3.0];
        $m = isset($multipliers[$diff]) ? $multipliers[$diff] : 1.0;

        foreach ($results as $res) {
            if (!isset($res['index'], $res['answer'], $res['timeLeft'])) continue;
            
            $idx = (int)$res['index'];
            $ans = filter_var($res['answer'], FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
            $timeLeft = (float)$res['timeLeft'];
            
            if ($timeLeft < 0) $timeLeft = 0;
            if ($timeLeft > 10) $timeLeft = 10;
            
            if (isset($questions[$idx])) {
                $q = $questions[$idx];
                if ($q['answer'] === $ans) {
                    $combo++;
                    $calc_score += floor((100 + $timeLeft * 10 + ($combo > 1 ? $combo * 10 : 0)) * $m);
                } else {
                    $combo = 0;
                }
            }
        }

        $score = $calc_score;
        if ($score < 0 || $score > MAX_POSSIBLE_SCORE) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid Score']);
            exit;
        }

        $stmt = $pdo->prepare("INSERT INTO quiz_rankings (player_name, score, difficulty, category) VALUES (:name, :score, :diff, :category)");
        $stmt->bindValue(':name', $name, PDO::PARAM_STR);
        $stmt->bindValue(':score', $score, PDO::PARAM_INT);
        $stmt->bindValue(':diff', $diff, PDO::PARAM_INT);
        $stmt->bindValue(':category', $category, PDO::PARAM_STR);
        $stmt->execute();
        
        $my_id = $pdo->lastInsertId();
        
        $stmt = $pdo->prepare("SELECT COUNT(*) + 1 as rank FROM quiz_rankings WHERE difficulty = :diff AND category = :cat AND (score > :score OR (score = :score AND id < :my_id))");
        $stmt->bindValue(':diff', $diff, PDO::PARAM_INT);
        $stmt->bindValue(':cat', $category, PDO::PARAM_STR);
        $stmt->bindValue(':score', $score, PDO::PARAM_INT);
        $stmt->bindValue(':my_id', $my_id, PDO::PARAM_INT);
        $stmt->execute();
        $res = $stmt->fetch();
        
        unset($_SESSION['quiz_start_at']);

        echo json_encode(['ok' => true, 'rank' => $res['rank']]);
    } else {
        if (isset($_GET['action']) && $_GET['action'] === 'start') {
            session_regenerate_id(true);
            $_SESSION['quiz_start_at'] = time();
            echo json_encode(['ok' => true, 'started_at' => $_SESSION['quiz_start_at']]);
            exit;
        }

        $diff = isset($_GET['diff']) ? $_GET['diff'] : 'all';
        $category = isset($_GET['category']) ? $_GET['category'] : 'all';

        $where = [];
        $params = [];

        if ($diff !== 'all') {
            $val = filter_var($diff, FILTER_VALIDATE_INT);
            if ($val !== false) {
                $where[] = "difficulty = :diff";
                $params[':diff'] = $val;
            }
        }

        if ($category !== 'all') {
            $allowed = ['javascript', 'css', 'html', 'python', 'typescript', 'react', 'git', 'linux', 'network', 'sql', 'security', 'algorithm'];
            if (in_array($category, $allowed, true)) {
                $where[] = "category = :cat";
                $params[':cat'] = $category;
            }
        }

        $sql = "SELECT player_name, score, difficulty, category FROM quiz_rankings";
        if (!empty($where)) {
            $sql .= " WHERE " . implode(" AND ", $where);
        }
        $sql .= " ORDER BY score DESC, id ASC LIMIT 50";

        $stmt = $pdo->prepare($sql);
        foreach ($params as $key => $val) {
            $stmt->bindValue($key, $val, is_int($val) ? PDO::PARAM_INT : PDO::PARAM_STR);
        }
        $stmt->execute();
        echo json_encode($stmt->fetchAll());
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database error']);
}
