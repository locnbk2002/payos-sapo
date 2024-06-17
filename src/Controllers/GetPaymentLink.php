<?php
declare(strict_types=1);

namespace App\Controllers;

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Exception;
use App\Utils\Sapo;
use App\Utils\PayOSHandler;

class GetPaymentLink
{
  public function __invoke(Request $request, Response $response, array $args)
  {
    $orderId = $args['orderId'];
    $sapo = new Sapo();
    $sapoOrder = null;
    if (!is_numeric($orderId)) {
      $response->getBody()->write('INVALID DATA');
      return $response
        ->withStatus(400);
    }

    try {
      $sapoOrder = $sapo->getOrderById($orderId);
      if (!$sapoOrder || !isset($sapoOrder['order'])) {
        $response->getBody()->write('NOT FOUND ORDER');
        return $response
          ->withStatus(400);
      }
      // return if paid
      if ($sapoOrder['order']['financial_status'] === SAPO_ORDER_PAID_MESSAGE) {
        $response->getBody()->write(json_encode([
          'financial_status' => SAPO_ORDER_PAID_MESSAGE
        ]));
        return $response;
      }

    } catch (Exception $e) {
      $statusCode = $e->getCode() ?: 500;
      $response->getBody()->write(json_encode(['error' => $e->getMessage()]));
      return $response
        ->withStatus($statusCode);
    }

    //get order from payOS. 
    $payOS = (new PayOSHandler())->PayOS();
    try {
      $payosOrder = $payOS->getPaymentLinkInformation((int) $orderId);
      $response->getBody()
        ->write(json_encode([
          'checkout_url' => $_ENV['CHECKOUT_URL_HOST'] . "/web/" . $payosOrder['id'],
          'financial_status' => $sapoOrder['order']['financial_status']
        ]));
      return $response;
    } catch (Exception $e) {
      // check case not exist orderCode
      error_log(var_export($e->getMessage(), true));
      if ($e->getCode() !== PAYOS_NOT_FOUND_ORDER_CODE) {
        return $response->withStatus(400);
      }
    }

    // create new payment link
    try {
      $queryParams = $request->getQueryParams();
      $redirectUri = $queryParams['redirect_uri'] ?? null;
      $phone = $queryParams['phone'] ?? null;
      if (empty($redirectUri) || empty($phone)) {
        $response->getBody()->write('INVALID DATA');
        return $response
          ->withStatus(400);
      }
      $data = [
        "orderCode" => (int) $orderId,
        "amount" => (int) $sapoOrder["order"]['total_price'],
        "description" => "DH ". $phone,
        "returnUrl" => $redirectUri,
        "cancelUrl" => $redirectUri
      ];
      $paymentLink = $payOS->createPaymentLink($data);
      $response->getBody()
        ->write(json_encode([
          'checkout_url' => $paymentLink['checkoutUrl'],
          'financial_status' => $sapoOrder['order']['financial_status']
        ]));
      return $response;
    } catch (Exception $e) {
      $statusCode = $e->getCode() ?: 500;
      $response->getBody()->write(json_encode(['error' => $e->getMessage()]));
      return $response
        ->withStatus($statusCode);
    }
  }
}