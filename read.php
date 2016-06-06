<?php
$root ="/";
$path = $root . ltrim($_REQUEST["path"], "/");
if (is_dir($path)) {
  echo json_encode(array(
    "error" => "dir"
  ));
  die();
}

if (!is_file($path)) {
  echo json_encode(array(
    "content" => ""
  ));
  die();
}

$r = file_get_contents($path);
if ($r === false) {
  echo json_encode(array(
    "error" => "read"
  ));
  die();
}

$encoding = mb_detect_encoding($r, array("UTF-8", "SJIS-WIN", "EUC-JP"), true);
if ($encoding === false) {
  echo json_encode(array(
    "error" => "detect encoding"
  ));
  die();
}

$r = mb_convert_encoding($r, "utf-8", $encoding);

echo json_encode(array(
  "encoding" => $encoding,
  "content" => $r
));
die();
