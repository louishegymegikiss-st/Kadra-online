<?php
/**
 * Endpoint Infomaniak : Création snapshot commandes → R2
 * 
 * Route: POST /api/orders/snapshot
 * 
 * Reçoit les commandes depuis le frontend et les upload dans R2
 * avec merge atomique pour éviter les doublons.
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Gérer OPTIONS (CORS preflight)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Vérifier méthode POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Méthode non autorisée']);
    exit;
}

// Charger AWS SDK (via Composer)
require_once __DIR__ . '/../../../vendor/autoload.php';

use Aws\S3\S3Client;
use Aws\Exception\AwsException;

try {
    // Lire les données JSON
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    
    if (!$data) {
        throw new Exception('Données JSON invalides');
    }
    
    $eventId = $data['event_id'] ?? null;
    $orders = $data['orders'] ?? [];
    
    if (!$eventId || !is_array($orders) || empty($orders)) {
        http_response_code(400);
        echo json_encode(['error' => 'event_id et orders requis']);
        exit;
    }
    
    // Configuration R2 depuis variables d'environnement ou valeurs par défaut
    $r2Endpoint = getenv('R2_ENDPOINT') ?: 'https://2dc708dd22889ad3d4a69dc8b22529c9.r2.cloudflarestorage.com';
    $r2AccessKey = getenv('R2_ACCESS_KEY_ID') ?: 'cf46e4ac89b40447f068513eac99b97c';
    $r2SecretKey = getenv('R2_SECRET_ACCESS_KEY') ?: '03114d0e6c727612caf31d895c16c98d27a723abbc37d63a5d2fbee031cd6efc';
    $r2Bucket = getenv('R2_BUCKET_NAME') ?: 'photolesgarennesgalerie';
    
    // Créer client S3 pour R2
    $s3 = new S3Client([
        'version' => 'latest',
        'region' => 'auto',
        'endpoint' => $r2Endpoint,
        'credentials' => [
            'key' => $r2AccessKey,
            'secret' => $r2SecretKey,
        ],
    ]);
    
    // Lire le snapshot existant depuis R2
    $r2Key = "orders/{$eventId}/pending_orders.json";
    $existingSnapshot = null;
    
    try {
        $result = $s3->getObject([
            'Bucket' => $r2Bucket,
            'Key' => $r2Key
        ]);
        $existingSnapshot = json_decode($result['Body'], true);
        error_log("📥 Snapshot existant chargé: v{$existingSnapshot['snapshot_version']}, {$existingSnapshot['count']} commandes");
    } catch (AwsException $e) {
        if ($e->getAwsErrorCode() !== 'NoSuchKey') {
            error_log("Erreur lecture snapshot R2: " . $e->getMessage());
        }
        // Fichier n'existe pas encore, c'est normal
    }
    
    // Merger avec les nouvelles commandes (éviter doublons par order_id)
    $allOrders = $orders;
    if ($existingSnapshot) {
        $existingOrderIds = array_flip(array_column($existingSnapshot['orders'], 'order_id'));
        $newOrders = array_filter($orders, function($o) use ($existingOrderIds) {
            return isset($o['order_id']) && !isset($existingOrderIds[$o['order_id']]);
        });
        $allOrders = array_merge($existingSnapshot['orders'], array_values($newOrders));
        error_log("🔄 Merge: " . count($newOrders) . " nouvelle(s) commande(s) sur " . count($orders) . " reçue(s)");
    }
    
    // Créer le snapshot
    $snapshot = [
        'event_id' => $eventId,
        'snapshot_version' => ($existingSnapshot['snapshot_version'] ?? 0) + 1,
        'generated_at' => date('c'),
        'count' => count($allOrders),
        'orders' => $allOrders
    ];
    
    $snapshotJson = json_encode($snapshot, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    
    // Upload atomique : d'abord .tmp
    $tmpKey = "orders/{$eventId}/pending_orders.tmp.json";
    $s3->putObject([
        'Bucket' => $r2Bucket,
        'Key' => $tmpKey,
        'Body' => $snapshotJson,
        'ContentType' => 'application/json',
        'CacheControl' => 'no-cache'
    ]);
    
    // Puis upload final
    $s3->putObject([
        'Bucket' => $r2Bucket,
        'Key' => $r2Key,
        'Body' => $snapshotJson,
        'ContentType' => 'application/json',
        'CacheControl' => 'no-cache'
    ]);
    
    error_log("✅ Snapshot v{$snapshot['snapshot_version']} uploadé: " . count($allOrders) . " commandes (" . count($orders) . " nouvelles)");
    
    http_response_code(200);
    echo json_encode([
        'message' => "Snapshot v{$snapshot['snapshot_version']} de " . count($allOrders) . " commande(s) créé",
        'event_id' => $eventId,
        'snapshot_version' => $snapshot['snapshot_version'],
        'new_orders' => count($orders),
        'total_orders' => count($allOrders)
    ]);
    
} catch (Exception $e) {
    error_log("❌ Erreur création snapshot: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'error' => $e->getMessage(),
        'hint' => 'Vérifier les credentials R2 et la connexion'
    ]);
}
