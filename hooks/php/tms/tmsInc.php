<?php

/**
 * @param $file {string} 文件路径，觉得路径
 * @param $isSyntax {bool} 是否语法检测模式，不支持tms_repeat
 * @param $isBuild {bool} 是否执行build，build生成html静态文件，返回合并后的文件
 */
function tmsInc($file, $isSyntax, $isBuild){

    global $json_file, $html_file, $jsonData, $createFile;
    $json_file = str_replace('.php', '.json', $file);
    $html_file = str_replace('.php', '.html', $file);
    ini_set('include_path', ini_get('include_path') . PATH_SEPARATOR . dirname($file) . '/');

    if (file_exists($json_file)){
        $jsonData = tb_json_decode(@file_get_contents($json_file), true);
        $createFile = false;
    } else {
        $createFile = true;
        $jsonData = array();
    }

    if ($isSyntax){
        error_reporting(E_ALL);
        include $file;
    } else {
        repeatReplace($file);
    }
}

function repeatReplace ($file) 
{
    global $isBuild, $jsonData, $json_file, $createFile, $html_file;
    $phpContent = file_get_contents($file);
    $part = tms_handle_header_foot($phpContent);
    $build = $part['build'];
    $content = $part['content'];
    $run =  $part['run'];
    $content = tms_include($content, $file);
    $phpContent = $run[0] . $content . $run[1];;
    $phpContent = vmToPhp($phpContent);

    if ($isBuild)
    {
        $phpContentBuild = $build[0] . $content . $build[1];;
        echo $phpContentBuild;
        ob_start();
        $phpContent = preg_replace('/_tms_repeat_begin\((?:.+?)row["\']\s*\:\s*[\'"]([^\'"]+)[\'"]?(?:[^\)]+)\)\s*\;?/',"for (\$_i_tms = 0; \$_i_tms < $1; \$_i_tms++) {", $phpContent);
        $phpContent = preg_replace('/_tms_repeat_end\(\s*\)\;?/i','}',$phpContent);
        eval('?>'.$phpContent.'<?');
        file_put_contents($html_file, ob_get_contents());
        chmod($html_file, 0755);
        ob_end_clean();
    }
    else
    {
        $phpContent = preg_replace('/_tms_repeat_begin\((?:.+?)row["\']\s*\:\s*[\'"]([^\'"]+)[\'"]?(?:[^\)]+)\)\s*\;?/',"for (\$_i_tms = 0; \$_i_tms < $1; \$_i_tms++) {", $phpContent);
        $phpContent = preg_replace('/_tms_repeat_end\(\s*\)\;?/i','}',$phpContent);
        eval('?>'.$phpContent.'<?');
    }

    if ($createFile){
        file_put_contents($json_file, indent(tb_json_encode($jsonData)));
        chmod($json_file, 0755);
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

    if ($headStart === false){
        $startTms = '';
        $start = '';
        $headEnd = 0;
        $headLen = 1;
    } else {
        $startTms = substr($str, 0, $headStart);
        $start = substr($str, $headStart + $headLen, $headEnd - $headStart - $headLen);
    }

    if($footStart === false){
        $footStart = strlen($str);
        $end   = '';
        $endTms   = '';
    } else {
        $end   = substr($str, $footStart + $footLen, $footEnd - $footStart - $footLen);
        $endTms   = substr($str, $footEnd + $footLen);
    }

    $mid   = substr($str, $headEnd + $headLen - 1, $footStart - $headEnd - $headLen + 1);
    return array(
        'run' => array($startTms, $endTms),
        'build'   => array('<?php ' . $start . '?>' , '<?php ' . $end . '?>'),
        'content' => $mid
    );

}
/**
 * 处理依赖关系include
 */
function tms_include($str, $file)
{
    $dir = dirname($file);
    $strs = explode('?>', $str);
    $reg = '/(?:include|include_once|require|require_once)\s[\'"]([\w\.-_]+\.(?:php|css|js))[\'"];?/';

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
    global $jsonData, $createFile;
    $json = json_decode(iconv('gbk', 'utf-8', $args), true);
    $name = $json['name'];
    $data = tms_common($args , $attributes);
    if (count($jsonData) AND array_key_exists($name, $jsonData)) {
        $ret = $jsonData[$name];
        foreach ($data as $k => $v)
        {
            $_item = $ret[$k];
            $ret[$k] = array();
            foreach ($v as $key => $value)
            {
                if (array_key_exists($key, $_item))
                {
                    $ret[$k][$key] = $_item[$key];
                } 
                else
                {
                    $ret[$k][$key] = $value;
                    $createFile = true;
                }
            }
        }
        $jsonData[$name] = $ret;
        return $jsonData[$name];
    } else {
        $jsonData[$name] = $data;
        $createFile = true;
        return $data;
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

/**
 * Indents a flat JSON string to make it more human-readable.
 * @param string $json The original JSON string to process.
 * @return string Indented version of the original JSON string.
 */
function indent($json) {

    $result      = '';
    $pos         = 0;
    $strLen      = strlen($json);
    $indentStr   = '  ';
    $newLine     = "\n";
    $prevChar    = '';
    $outOfQuotes = true;

    for ($i=0; $i<=$strLen; $i++) {

        // Grab the next character in the string.
        $char = substr($json, $i, 1);

        // Are we inside a quoted string?
        if ($char == '"' && $prevChar != '\\') {
            $outOfQuotes = !$outOfQuotes;

            // If this character is the end of an element, 
            // output a new line and indent the next line.
        } else if(($char == '}' || $char == ']') && $outOfQuotes) {
            $result .= $newLine;
            $pos --;
            for ($j=0; $j<$pos; $j++) {
                $result .= $indentStr;
            }
        }

        // Add the character to the result string.
        $result .= $char;

        // If the last character was the beginning of an element, 
        // output a new line and indent the next line.
        if (($char == ',' || $char == '{' || $char == '[') && $outOfQuotes) {
            $result .= $newLine;
            if ($char == '{' || $char == '[') {
                $pos ++;
            }

            for ($j = 0; $j < $pos; $j++) {
                $result .= $indentStr;
            }
        }

        $prevChar = $char;
    }

    return $result;
}
