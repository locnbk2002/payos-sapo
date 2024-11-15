<?php
header('Content-Type: application/javascript');
?>
const API_SERVER = "https://<?php echo $_SERVER['HTTP_HOST']; ?>";
<?php readfile('checkout.js'); ?>