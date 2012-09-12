<?php
/**
 * Change: [+]new feature  [*]improvement  [!]change  [x]bug fix
 */

$file = $_SERVER['argv'][1];
$isBuild = $_SERVER['argv'][2];
$isSyntax = $_SERVER['argv'][3];
include('tmsTag.php');
include('vmToPhp.php');
include('tmsInc.php');
tmsInc($file, $isSyntax, $isBuild);
