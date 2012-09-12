<?php
$patten = '/<cms:(\w+)\s([\s\S]+?)>([\s\S]+?)<\/cms:\1>/i';
$_guid = 0;
function _guid(){
    global $_guid;
    $_guid++;
    return $_guid;
}

function replaceForeach($match){
    $text = '<?php foreach($' . $match[2] . ' as $_i => $' .$match[1]. "):\n";
    $text .= "\$velocityCount = \$_i + 1;?>";
    $text .= preg_replace('/\$!*([a-z_0-9]+)\.([a-z_0-9]+)/i', '<?php echo $$1["$2"];?>', $match[3]);
    $text .= '<?php endforeach;?>';
    return $text;
}
function replaceIf($match){
    $text = '<?php if(' . $match[1] . '):?>';
    $text .= preg_replace('/#elseif\(([\s\S]+)\)/', '<php elseif($1):?>', $match[2]);
    $text = str_replace('#else', '<?php else: ?>', $text);
    $text .= "<?php endif;?>";
    return $text;
}
function cms2tms($match){
    global $patten;
    $pattenForEach = '/#foreach\s*\(\$(\w+)[\w\s]+\$(\w+)\)([\s\S]+?)#end/i';
    $pattenIf = '/#if\(([\s\S]+?)\)([\s\S]+?)#end/i';

    $text = '<?php ';
    $name = '';

    $esclist = array('repeat');
    $match[2] = str_replace('(', '[', $match[2]);
    $match[2] = str_replace(')', ']', $match[2]);
    $match[2] = str_replace('*', 'x', $match[2]);
    $match[2] = str_replace('default=', 'defaultRow=', $match[2]);

    if ($match[1] == 'repeat'){
        $text .= '_tms_' . $match[1];
        $json = '(\'{' . preg_replace('/(\w+)=/', ',"$1":', $match[2]) . $name .'}\');';
        $json = str_replace('{,', '{', $json) . "\n"; 
        $text .= $json . preg_replace_callback($patten, 'cms2tms', $match[3]);
        $text .= '<?php _tms_repeat_end(); ?>';
    } else {
        $tag = '$' .$match[1]. 'List = _tms_' . $match[1];
        if (!preg_match('/name=/', $match[2])){
            $name = ',"name":"' . $match[1] . _guid() . '"';
        }
        $row = '';
        if (!preg_match('/defaultRow=/', $match[2])){
            $row = ',"defaultRow":"1"';
        }
        if (!preg_match('/row=/', $match[2])){
            $row .= ',"row":"1"';
        }

        $json = '(\'{' . preg_replace('/(\w+)=/', ',"$1":', $match[2]) . $name . $row. $row  .'}\');';
        $json = str_replace('{,', '{', $json) . 
            "\n" . 'extract($' . $match[1] . 'List[0]); ?>';

        //替换size方法
        $logic = preg_replace('/\$(\w+)\.size\(\)/', 'count($$1)', $match[3]);
        //替换#if
        $logic = preg_replace_callback($pattenIf, "replaceIf", $logic);
        //替换#foreach
        $foreach = preg_replace_callback($pattenForEach, "replaceForeach", $logic);
        if (!strpos($foreach, 'foreach')){
            $foreach = preg_replace('/\$!*([\w\d_]+)/', '<?php echo $$1;?>', $foreach);
        }

        $text .= $tag . $json . $foreach;

    }

    return $text;
}

function vmToPhp($text){
    $text = iconv('gbk', 'utf-8', $text);
    global $patten;
    $text = preg_replace('/<cms:control[\s\S]+?>/', '', $text);
    $text = preg_replace('/<cms:(module)\s*?>([\s\S]+?)<\/cms:\1>/', 
    '<?php _tms_module_begin(\'{"name":"test", "title":"auto"}\');?>$2<?php _tms_module_end(); ?>', $text);
    $text = preg_replace_callback($patten, 'cms2tms', $text);
    return iconv('utf-8', 'gbk', $text);
}
