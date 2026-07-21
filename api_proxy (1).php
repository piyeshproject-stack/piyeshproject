<?php
// Master API Proxy (Centralized Server for all your clients)

// Browser er security (CORS) bypass korar jonno allow headers
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, API-KEY");

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit(0);
}

// 1. DYNAMIC API KEY: Javascript theke pathano API key ta catch kora
// PHP te custom header 'API-KEY' ashle sheta 'HTTP_API_KEY' hoye jay
$client_api_key = isset($_SERVER['HTTP_API_KEY']) ? $_SERVER['HTTP_API_KEY'] : '';

if (empty($client_api_key)) {
    echo json_encode(["status" => "ERROR", "message" => "API Key is missing from the request headers."]);
    exit;
}

$action = isset($_GET['action']) ? $_GET['action'] : 'create';
$data = file_get_contents("php://input");

// 2. Apnar Payment Gateway er ashol URL
$url = "https://mypay.freelancingbyrifat.top/api/payment/create";
if ($action == 'verify') {
    $url = "https://mypay.freelancingbyrifat.top/api/payment/verify";
}

// 3. cURL request pathano apnar gateway te
$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, array(
    'Content-Type: application/json',
    'API-KEY: ' . $client_api_key // 🚀 Client er API key ta pass kora hocche
));
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $data);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false); // SSL certificate bypass korar jonno (jodi lage)

$response = curl_exec($ch);

// Jodi cURL e kono internal error ashe
if(curl_errno($ch)){
    echo json_encode(["status" => "ERROR", "message" => "Curl error: " . curl_error($ch)]);
} else {
    // 4. Gateway theke asha response ta abar Javascript e ferot pathano
    echo $response;
}

curl_close($ch);
?>