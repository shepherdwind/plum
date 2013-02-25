<?php
/**
 * Change: [+]new feature  [*]improvement  [!]change  [x]bug fix
 */

error_reporting(0);
$file = $_SERVER['argv'][1];
$isBuild = $_SERVER['argv'][2];
$isSyntax = $_SERVER['argv'][3];
global $TMS_LOCAL;
$TMS_LOCAL = TRUE;
include('tmsTag.php');
include('vmToPhp.php');
include('tmsInc.php');
tmsInc($file, $isSyntax, $isBuild);
