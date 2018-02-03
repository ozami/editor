<?php
$path = $_REQUEST["path"];
if (substr($path, 0, 1) != "/") {
  $path = "/$path";
}
if (strpos($path, "/~") !== false) {
  $reply = grep($path);
}
else if (strpos($path, "/?") !== false) {
  $reply = find($path);
}
else if (substr($path, -1) == "/") {
  $reply = listDir($path);
}
else {
  $reply = listFile($path);
}

function grep($path)
{
  list($dir, $query) = explode("/~", $path, 2);
  $dir .= "/";
  if ($query == "") {
    return [
      "base" => $dir,
      "items" => [],
    ];
  }
  setlocale(LC_CTYPE, "ja_JP.UTF-8");
  chdir($dir);
  $cmd = "grep --recursive --files-with-match --extended-regexp ";
  $cmd .= "--exclude-dir='.*' ";
  $cmd .= "--regexp=" . escapeshellarg($query);
  exec($cmd, $out);
  return [
    "base" => $dir,
    "items" => $out,
  ];
}

function find($path)
{
  $find = function($dir, $query) use (&$find) {
    $matches = array();
    foreach (scandir($dir) as $i) {
      if ($i == "." || $i == "..") {
        continue;
      }
      $path = $dir . $i;
      if (is_dir($path)) {
        if ($i[0] == ".") {
          continue;
        }
        $path .= "/";
        if (stripos($i, $query) !== false) {
          $matches[] = $path;
        }
        $matches = array_merge($matches, $find($path, $query));
      }
      else {
        if (stripos($i, $query) !== false) {
          $matches[] = $path;
        }
      }
    }
    return $matches;
  };
  list($dir, $query) = explode("/?", $path, 2);
  $dir .= "/";
  $items = $find($dir, $query);
  $dir_length = strlen($dir);
  $items = array_map(function($i) use ($dir_length) {
    return substr($i, $dir_length);
  }, $items);
  return [
    "base" => $dir,
    "items" => $items,
  ];
}

function listDir($path)
{
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
  return [
    "base" => $dir,
    "items" => $stats,
  ];
}

function listFile($path)
{
  $stats = array();
  $dir = dirname($path);
  if ($dir != "/") {
    $dir .= "/";
  }
  if (is_dir($dir)) {
    $pattern = preg_split("//u", basename($path));
    array_shift($pattern);
    foreach ($pattern as $i => $ch) {
      $pattern[$i] = preg_quote($ch);
    }
    $pattern = "/^" . join(".*", $pattern) . "/ui";
    foreach (scandir($dir) as $i) {
      if (preg_match($pattern, $i)) {
        if (is_dir("$dir$i")) {
          $i .= "/";
        }
        $stats[] = $i;
      }
    }
  }
  return [
    "base" => $dir,
    "items" => $stats,
  ];
}

echo json_encode($reply);
