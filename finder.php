<?php
$root = "/";
$path = ltrim($_REQUEST["path"], "/");
if (is_dir($root . $path)) {
  $dir = rtrim($path, "/");
  $items = scandir($root . $path);
  $stats = [];
  foreach ($items as $i) {
    if ($i == "." || $i == "..") {
      continue;
    }
    $stats[] = [
      "name" => $i,
      "dir" => is_dir("$root$path/$i")
    ];
  }
} else {
  $stats = [];
  $dir = dirname($path);
  if (is_dir($root . $dir)) {
    $basename = basename($root . $path);
    foreach (scandir($root . $dir) as $i) {
      if (strpos($i, $basename) === 0) {
        $stats[] = [
          "name" => $i,
          "dir" => is_dir("$root$dir/$i")
         ];
      }
    }
  }
}
echo json_encode([
  "base" => $dir,
  "items" => $stats
]);
