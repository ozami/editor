<?php
$root ="/";
$path = $root . ltrim($_REQUEST["path"], "/");
if (!unlink($path)) {
  echo json_encode(array(
    "error" => "delete",
  ));
  exit();
}

echo json_encode("ok");
exit();
