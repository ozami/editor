<?php
$path = $_REQUEST["path"];

$content = mb_convert_encoding(
  $_REQUEST["content"],
  $_REQUEST["encoding"],
  "UTF-8"
);
if ($content === false) {
  echo json_encode(array(
    "error" => "encode"
  ));
  die();
}

$dir = dirname($path);
if (!is_dir($dir)) {
  if (!mkdir($dir, 0777, true)) {
    echo json_encode(array(
      "error" => "mkdir"
    ));
    die();
  }
}

if (@file_put_contents($path, $content) === false) {
  echo json_encode(array(
    "error" => "write"
  ));
  die();
}
echo json_encode("ok");
