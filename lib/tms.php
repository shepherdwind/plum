<?php
/**
 * Change: [+]new feature  [*]improvement  [!]change  [x]bug fix
 */

$file = $_SERVER['argv'][1];
$isBuild = $_SERVER['argv'][2];
$json_file = str_replace('.php', '.json', $file);
$jsonData = tb_json_decode(@file_get_contents($json_file), true);
ini_set('include_path', ini_get('include_path') . PATH_SEPARATOR . dirname($file));
include('tmsTag.php');

repeatReplace($file);

function repeatReplace ($file) 
{
    global $isBuild;
    $phpContent = tms_include($file);

    if ($isBuild)
    {
        echo tms_handle_header_foot($phpContent);
    }
    else
    {
        $phpContent = preg_replace('/_tms_repeat_begin\((?:.+?)row["\']\s*\:\s*[\'"]([^\'"]+)[\'"]?(?:[^\)]+)\)\s*\;?/',"for (\$_i_tms = 0; \$_i_tms < $1; \$_i_tms++) {", $phpContent);
        $phpContent = preg_replace('/_tms_repeat_end\(\s*\)\;?/i','}',$phpContent);
        eval('?>'.$phpContent.'<?');
    }
}

/**
 * 替换tms头尾部分，统一tms线下和本地环境
 * @example
 * $str = <<<EOF
 * <?php include 'common/header.php'; ?>
 * <link rel="stylesheet" href="a.css" />
 * <!--head include('/home/admin/go/market/5137/__header.php') head-->
 * <input type="hidden" value="home" id="J_NavId">
 * code ..
 * <!--foot include('/home/admin/go/market/5137/__footer.php') foot-->
 * <script src="a.js" type="text/javascript"></script>
 * <?php include 'common/foot.php'; ?>
 * EOF;
 *
 * tms_handle_header_foot($str);
 * return
 * <?php include('/home/admin/go/market/5137/__header.php') ?>
 * <input type="hidden" value="home" id="J_NavId">
 * <?php  include('/home/admin/go/market/5137/__footer.php') ?>
 */
function tms_handle_header_foot($str)
{
    $commentStart = '<!--';
    $commentEnd   = '-->';
    $header       = 'head';
    $foot         = 'foot';
    $headLen      = strlen($commentStart . $header);
    $footLen      = strlen($commentStart . $foot);

    $headStart = strpos($str, $commentStart . $header);
    $headEnd   = strpos($str, $header . $commentEnd);
    $footStart = strpos($str, $commentStart . $foot);
    $footEnd   = strpos($str, $foot . $commentEnd);

    $start = substr($str, $headStart + $headLen, $headEnd - $headStart - $headLen);
    $end   = substr($str, $footStart + $footLen, $footEnd - $footStart - $footLen);
    $mid   = substr($str, $headEnd + $headLen - 1, $footStart - $headEnd - $headLen + 1);
    return '<?php ' . $start . '?>' . $mid . '<?php ' . $end . '?>';

}
/**
 * 处理依赖关系include
 */
function tms_include($file)
{
    $dir = dirname($file);
    $str = file_get_contents($file);
    $strs = explode('?>', $str);
    $reg = '/(?:include|include_once|require|require_once)\s[\'"]([\w\.-_]+\.tms\.php)[\'"];?/';

    $ret = '';

    foreach($strs as $key=> $val)
    {
        $tmp = explode('<?', $val);
        $matched = FALSE;

        if(count($tmp) == 2)
        {
            preg_match($reg, $tmp[1], $res);
            if (count($res))
            {
                //var_export($dir);
                $tmp[1] = file_get_contents($dir . '/' . $res[1]);
                $matched = true;
            }
        }

        if ($matched)
        {
            $ret .= $tmp[0] . $tmp[1];
        }
        else
        {
            if (isset($tmp[1]))
            {
                $ret .= $tmp[0] . '<?' . $tmp[1] . '?>';
            }
            else
            {
                $ret .= $tmp[0];
            }
        }
    }
    return $ret;
}


function _tms_common ( $args, $attributes = '') {
    global $jsonData;
    $json = json_decode(iconv('gbk', 'utf-8', $args), true);
    if ($jsonData AND array_key_exists($json['name'], $jsonData)) {
        return $jsonData[$json['name']];
    } else {
        return tms_common($args , $attributes);
    }
}

function tb_json_encode($value, $options = 0) { 
    return json_encode(tb_json_convert_encoding($value, "GBK", "UTF-8")); 
} 

function tb_json_decode($str, $assoc = false, $depth = 512) 
{ 
    $str = iconv('gbk','utf-8',$str);
    return tb_json_convert_encoding(json_decode($str, $assoc), "UTF-8", "GBK"); 
} 

function tb_json_convert_encoding($m, $from, $to) 
{ 
    switch(gettype($m)) { 
    case 'integer': 
    case 'boolean': 
    case 'float': 
    case 'double': 
    case 'NULL': 
        return $m; 

    case 'string': 
        return mb_convert_encoding($m, $to, $from); 

    case 'object': 
        $vars = array_keys(get_object_vars($m)); 
        foreach($vars as $key) 
        { 
            $m->$key = tb_json_convert_encoding($m->$key, $from ,$to); 
        } 
        return $m; 

    case 'array': 
        foreach($m as $k => $v) 
        { 
            $m[tb_json_convert_encoding($k, $from, $to)] = tb_json_convert_encoding($v, $from, $to); 
        } 
        return $m; 
    default: 
    } 

    return $m; 
}

/**
 * 将字符串解析成数组并存储
 * @param $args string|array
 */
function tms_parse_args( $args, $defaults = '' ) {
    if ( is_object( $args ) )
        $r = get_object_vars( $args );
    elseif ( is_array( $args ) )
        $r =& $args;
    else
        parse_str( $args, $r );

    if ( is_array( $defaults ) )
        return array_merge( $defaults, $r );
    return $r;
}
