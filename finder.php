<?php
$path = $_REQUEST["path"];
if (is_dir($path)) {
  $dir = rtrim($path, "/");
  $items = scandir($path);
  $stats = [];
  foreach ($items as $i) {
    if ($i == "." || $i == "..") {
      continue;
    }
    $stats[] = [
      "name" => $i,
      "dir" => is_dir("path/$i")
    ];
  }
} else {
  $stats = [];
  $dir = dirname($path);
  if (is_dir($dir)) {
    $basename = basename($path);
    foreach (scandir($dir) as $i) {
      if (strpos($i, $basename) === 0) {
        $stats[] = [
          "name" => $i,
          "dir" => is_dir("$dir/$i")
         ];
      }
    }
  }
}
echo json_encode([
  "base" => $dir,
  "items" => $stats
]);
