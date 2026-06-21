<?php
// ============================================================
// proxyv2.php — New Payment Gateway Proxy (v2)
// Server: payment.freelancingbyrifat.top
//
// কাজ: E-commerce checkout থেকে POST data receive করে
//       নতুন gateway-তে cURL hit করবে এবং
//       customer-কে payment page-এ redirect করবে।
//
// POST fields received from checkout.html:
//   amount       — total amount (BDT)
//   cus_name     — customer full name
//   cus_email    — customer email
//   order_id     — unique order ID (e.g. RNFABCDEF)
//   success_url  — redirect after success
//   cancel_url   — redirect after cancel/fail
// ============================================================

// ── CORS Headers (e-commerce domain থেকে request আসবে) ──────
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=utf-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["error" => "Method not allowed. Use POST."]);
    exit;
}

// ════════════════════════════════════════════════════════════
// ⚡ আপনার নতুন Gateway Config — শুধু এই অংশ পরিবর্তন করুন
// ════════════════════════════════════════════════════════════

define('GATEWAY_API_KEY',    'YOUR_NEW_GATEWAY_API_KEY_HERE');  // ← নতুন gateway-র API Key
define('GATEWAY_CREATE_URL', 'https://YOUR_NEW_GATEWAY.com/api/payment/create'); // ← নতুন gateway create URL

// ════════════════════════════════════════════════════════════

// ── POST data read করো ──────────────────────────────────────
$amount      = isset($_POST['amount'])      ? floatval($_POST['amount'])          : 0;
$cus_name    = isset($_POST['cus_name'])    ? trim($_POST['cus_name'])            : '';
$cus_email   = isset($_POST['cus_email'])   ? trim($_POST['cus_email'])           : '';
$order_id    = isset($_POST['order_id'])    ? trim($_POST['order_id'])            : '';
$success_url = isset($_POST['success_url']) ? trim($_POST['success_url'])         : '';
$cancel_url  = isset($_POST['cancel_url'])  ? trim($_POST['cancel_url'])          : '';

// ── Basic Validation ─────────────────────────────────────────
if ($amount <= 0 || empty($order_id) || empty($cus_name)) {
    http_response_code(400);
    echo json_encode(["error" => "Missing required fields: amount, order_id, cus_name"]);
    exit;
}

// ── Gateway-তে পাঠানোর payload তৈরি ─────────────────────────
$payload = json_encode([
    "amount"      => $amount,
    "currency"    => "BDT",
    "order_id"    => $order_id,
    "cus_name"    => $cus_name,
    "cus_email"   => $cus_email ?: ($order_id . '@customer.com'),
    "success_url" => $success_url,
    "cancel_url"  => $cancel_url,
    "fail_url"    => $cancel_url,
]);

// ── cURL দিয়ে Gateway-তে payment create request ──────────────
$ch = curl_init(GATEWAY_CREATE_URL);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST           => true,
    CURLOPT_POSTFIELDS     => $payload,
    CURLOPT_HTTPHEADER     => [
        'Content-Type: application/json',
        'API-KEY: ' . GATEWAY_API_KEY,
        'Accept: application/json',
    ],
    CURLOPT_TIMEOUT        => 20,
    CURLOPT_SSL_VERIFYPEER => true,
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlErr  = curl_error($ch);
curl_close($ch);

// ── cURL error ───────────────────────────────────────────────
if ($curlErr) {
    http_response_code(502);
    echo json_encode(["error" => "Gateway connection failed: " . $curlErr]);
    exit;
}

// ── Gateway response parse করো ───────────────────────────────
$data = json_decode($response, true);

if (!$data) {
    http_response_code(502);
    echo json_encode(["error" => "Invalid response from gateway", "raw" => substr($response, 0, 200)]);
    exit;
}

// ── Success: payment_url পেলে redirect করো ───────────────────
//
// ⚠️ আপনার gateway যদি ভিন্ন key নামে URL দেয়
//    (যেমন: 'redirect_url', 'checkout_url', 'url')
//    তাহলে নিচের লাইনে সেটা দিন:
//
$payment_url = $data['payment_url']   // ← সবচেয়ে common
           ?? $data['redirect_url']
           ?? $data['checkout_url']
           ?? $data['url']
           ?? null;

if ($payment_url) {
    // ✅ Customer-কে payment page-এ পাঠাও
    header("Location: " . $payment_url);
    exit;
} else {
    // ❌ Gateway error — checkout page-এ ফেরত যাও
    $errMsg = $data['message'] ?? $data['error'] ?? 'Unknown gateway error';
    http_response_code(502);
    echo json_encode(["error" => "Gateway error: " . $errMsg, "raw" => $data]);
    exit;
}
?>
