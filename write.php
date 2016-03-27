<?php
$path = $_REQUEST["path"];

if (file_put_contents($path, $_REQUEST["content"]) === false) {
  echo json_encode([
    "error" => "write"
  ]);
  die();
}
echo json_encode("ok");
