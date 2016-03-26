<?php
$root ="/";
$path = $root . ltrim($_REQUEST["path"], "/");
if (is_dir($path)) {
  echo json_encode([
    "error" => "dir"
  ]);
  die();
}

if (!is_file($path)) {
  echo json_encode([
    "content" => ""
  ]);
  die();
}

$r = file_get_contents($path);
if ($r === false) {
  echo json_encode([
    "error" => "read"
  ]);
  die();
}

echo json_encode([
  "content" => $r
]);
die();
