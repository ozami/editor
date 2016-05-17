<?php
$path = $_REQUEST["path"];
if (substr($path, 0, 1) != "/") {
  $path = "/$path";
}
if (substr($path, -1) == "/") {
  $dir = $path;
  $items = scandir($path);
  $stats = array();
  foreach ($items as $i) {
    if ($i == "." || $i == "..") {
      continue;
    }
    if (is_dir("$dir$i")) {
      $i .= "/";
    }
    $stats[] = $i;
  }
} else {
  $stats = array();
  $dir = dirname($path);
  if ($dir != "/") {
    $dir .= "/";
  }
  if (is_dir($dir)) {
    $basename = basename($path);
    foreach (scandir($dir) as $i) {
      if (stripos($i, $basename) === 0) {
        if (is_dir("$dir$i")) {
          $i .= "/";
        }
        $stats[] = $i;
      }
    }
  }
}
echo json_encode(array(
  "base" => $dir,
  "items" => $stats
));
