<?php
$path = $_REQUEST["path"];
if (substr($path, 0, 1) != "/") {
  $path = "/$path";
}
if (strpos($path, "/^/") !== false) {
  $path = findProjectRoot($path);
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

function findProjectRoot($path)
{
  preg_match("#(.*?)/\\^/(.*)#", $path, $match);
  list(, $start_dir, $file) = $match;
  $dir = "";
  foreach (explode("/", $start_dir) as $i) {
    $dir .= "$i/";
    if (is_dir("$dir.git")) {
      return "$dir$file";
    }
  }
  return "$start_dir/$file";
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
  $includes = join(" ", array_map(
    function($ext) {
      return "--include='*.$ext'";
    },
    [
      "php", "inc", "js", "jsx", "json",
      "html", "htm", "xhtml", "xml", "txt",
      "py", "sql", "sh",
    ]
  ));
  $cmd = "grep --recursive --files-with-match --extended-regexp ";
  $cmd .= "--exclude-dir='.*' $includes ";
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
  $items = @scandir($path);
  if ($items === false) {
    $items = [];
  }
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
