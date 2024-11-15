<?php
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Slim\Factory\AppFactory;
use App\Controllers;
use Dotenv\Dotenv;

require __DIR__ . '/../vendor/autoload.php';
require_once __DIR__ . '/../src/constants.php';

$dotenv = Dotenv::createImmutable(__DIR__ . '/..');
$dotenv->load();

$app = AppFactory::create();

$app->addBodyParsingMiddleware();
$app->addRoutingMiddleware();
$app->addErrorMiddleware(false, false, false);
$container = $app->getContainer();


$afterMiddleware = function ($request, $handler) {
  $response = $handler->handle($request);
  return $response->withHeader('Content-Type', 'application/json')
    ->withHeader('Access-Control-Allow-Origin', '*');
};

$app->get('/', function (Request $request, Response $response) {
  $response->getBody()->write('Welcome to the Sapo plugin, designed by the payOS team!');
  return $response;
});
$app->get('/get-payment-link/{orderId}', Controllers\GetPaymentLink::class)->add($afterMiddleware);
$app->post('/webhook-transaction', Controllers\WebhookTransaction::class)->add($afterMiddleware);


$app->run();
