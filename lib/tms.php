<?php
/**
 * Change: [+]new feature  [*]improvement  [!]change  [x]bug fix
 */

$file = $_SERVER['argv'][1];
$json_file = str_replace('.php', '.json', $file);
$jsonData = tb_json_decode(file_get_contents($json_file), true);
ini_set('include_path', ini_get('include_path'). dirname($file));

repeatReplace($file);

function repeatReplace ($file) 
{
    $phpContent = tms_include($file);
    $phpContent = preg_replace('/_tms_repeat_begin\((?:.+?)row["\']\s*\:\s*[\'"]([^\'"]+)[\'"]?(?:[^\)]+)\)\s*\;?/',"for (\$_i_tms = 0; \$_i_tms < $1; \$_i_tms++) {", $phpContent);
    $phpContent = preg_replace('/_tms_repeat_end\(\s*\)\;?/i','}',$phpContent);
    eval('?>'.$phpContent.'<?');
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
        $tmp = explode('<?php', $val);
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
                $ret .= $tmp[0] . '<?php' . $tmp[1] . '?>';
            }
            else
            {
                $ret .= $tmp[0];
            }
        }
    }
    return $ret;
}


function _tms_common ( $args ) {
    global $jsonData;
    $json = json_decode(iconv('gbk', 'utf-8', $args), true);
    if (array_key_exists($json['name'], $jsonData)) {
        return $jsonData[$json['name']];
    }
}

function _tms_text ( $args='' ) {
    return _tms_common( $args );
}

function _tms_textLink ( $args='' ) {
    return _tms_common( $args );
}

function _tms_image ( $args='' ) {
    return _tms_common( $args );
}

function _tms_imageLink ( $args='' ) {
    return _tms_common( $args );
}

function _tms_custom ( $args='' ) {

    $json = json_decode( iconv( 'gbk','utf-8',$args ) , true );
    if(!array_key_exists('row',$json)||!array_key_exists('defaultRow',$json)) {
        echo "！@#￥！ _tms_custom标签缺失row或defaultRow属性，上传到TMS会出错";
        break;
    }
    return _tms_common ( $args );
}


function _tms_articleList ( $args='' ) {
    return _tms_common ( $args , $attributes);
}

function _tms_subArea ( $args='' ) {
    return;
}

function _tms_module_begin() {
    return;
}

function _tms_module_end() {
    return;
}

function _tms_repeat_begin( $arg='' ) {
    return;
}

function _tms_repeat_end() {
    return;
}

function tb_json_encode($value, $options = 0) { 
	return json_encode(tb_json_convert_encoding($value, "GBK", "UTF-8")); 
} 

function tb_json_decode($str, $assoc = false, $depth = 512) { 
	$str = iconv('gbk','utf-8',$str);
	return tb_json_convert_encoding(json_decode($str, $assoc), "UTF-8", "GBK"); 
} 

function tb_json_convert_encoding($m, $from, $to) { 
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
	foreach($vars as $key) { 
		$m->$key = tb_json_convert_encoding($m->$key, $from ,$to); 
	} 
	return $m; 
	case 'array': 
	foreach($m as $k => $v) { 
		$m[tb_json_convert_encoding($k, $from, $to)] = tb_json_convert_encoding($v, $from, $to); 
	} 
	return $m; 
	default: 
	} 
	return $m; 
}
