<?php
// vim: set et sw=4 ts=4 sts=4 fdm=marker ffs=dos,unix fenc=gbk nobomb:
/**PHP.tpl
 * Author: ChangZhi <changzhi@taobao.com>
 * URL: 
 * Last Change:2011-04-23 
 * Version: 0.2
 * Desc: Taobao TMS Template Tags and API mock
 *
 * Change: [+]new feature  [*]improvement  [!]change  [x]bug fix
 *
 * [+] 增加repeat标签支持
 * [+] 初始化版本 2011-04-23
 */

/** 定义tags常见常量 */
define ( '_TMS_TEXT', "string");
define ( '_TMS_LINK', "http://www.taobao.com");
define ( '_TMS_IMAGE', "http://img.f2e.taobao.net/img.png_");
/**
 * TMS 通用签
 * ！此函数是为其他函数调用，请勿在模板里面直接使用，否则TMS解析不了此函数哦
 *
 * @since 0.1
 * @access private
 * @param string $args  '{"key":"va","key2":"va2"}'  Don't you think it is like JSON ? ╮(￣▽￣)╭
 * @param string $attributes  某些特殊标签的特殊值
 * @require /includes/config.php
 * @require /includes/functions.php
 * @return array
 */
function tms_common ( $args , $attributes='' ) { //---------------------------------{{{

    $defaults = array (

        /**
         * 通用key
         * 数据可以维护的对大条数，维护者在数据更新时不能超过此限制
         */
        'row' => 1,

        /*
         * 通用key
         * 缺省提供的数据条数
         */
        'defaultRow' => "1",

        /**
         * 通用key
         * 商品名称
         */
        'text' => _TMS_TEXT,

        /**
         * 通用key
         *商品链接地址
         */
        'href' => _TMS_LINK

    );

    /** 把json转为数组，必须是utf-8编码,输出之后也是utf-8 */
    $args = tb_json_decode($args);


    /*
    if(!array_key_exists('name',$args)||!array_key_exists('title',$args)||!array_key_exists('group',$args)) {
        echo "！@#￥！标签缺少name或title或group属性，上传到TMS会出错";
    }
     */
    /** 合并特殊值 */
    $defaults = tms_parse_args ( $attributes , $defaults );
    $r = tms_parse_args ( $args ,$defaults );
    $myFileds = array();

    /** 处理_tms_custom自定义fields */
    if ( isset($r['fields']) AND $r['fields'] !='' ) {
        $pos = strpos( $r['fields'],'(') || strpos($r['fields'],')');
        if($pos) {
            echo "！@#￥%！custom 标签属性里面含有非法字符串(或)，上传到TMS会出错";
        }

        $r['fields'] = explode(',',$r['fields']);

        $r2 = array();
        $mathImg = array();

        /**
         * 取fields数组第一项和第三项分别作为键值
         * 数组第二项在本地是没有用的，但是上传到tms上会被解析
         */
        foreach ( $r['fields'] as $index=>&$key ) {
			$imgmatch = preg_match('/\[([\dx]*)]\:img/',$key,$math);
            $key = explode( ':',$key );
            $r2 +=  array( $key[0] => $key[2] );
            $myFileds[] = $key[0];
            if( $imgmatch ) {
              $mathImg[$index][$key[2]] = $math[1];
            }
        }


        /** 自定义的fields有六种类型 */
		$index = 0;
        foreach ( $r2 as &$key2 ) {
            switch ( $key2 ) {
            case "boolean":
                $key2 = false;
                //$key2 = "_TMS_BOOLEAN";
                break;
            case "string":
                $key2 = _TMS_TEXT;
                break;
            case "multilString":
                $key2 = _TMS_TEXT;
                break;
            case "href":
                $key2 = _TMS_LINK;
                break;
            case "img":
                if (isset($mathImg[$index])){
                    $key2 = _TMS_IMAGE .$mathImg[$index][$key2].'.jpg';
                }
                break;
            case "date":
                $key2 = date("YmdHis");
                break;
            case "email":
                $key2 = "email";
                break;
            default:
                $key2 = _TMS_TEXT;
            }
            $index++;
        }
        /** 重新赋值 */
        unset($r['fields']);
        $r +=$r2;

    }


    $filter = array('row', 'defaultRow', 'title', 'name', 'group');
    $r3 = array();
    for ( $i = 0; $i < $r['defaultRow']; $i++ ) {
        //array_push( $r3,$r );
        $rets = array();
        foreach($r as $key => $val) {
            if (preg_match('/^http:\/\/img\.f2e\.taobao\.net(.*)/i', $val)) {
                $val = preg_replace('/\.jpg(.*)/i', '.jpg?t=' . md5(microtime()), $val);
            }

            if (!in_array($key, $filter) || in_array($key, $myFileds)){
                $rets[$key] = $val;
            }
        }
        $r3[] = $rets;
    }

    return $r3;

}//--------------------------------------------------------------}}}

/**
 * TMS 文字
 *
 * @since 0.1
 * @access publish
 * @param $args string
 * @key:
 *      name
 *      title
 *      group
 *      row
 *      defaultRow
 *      text:维护的文本内容
 */
function _tms_text ( $args='' ) {
    return _tms_common( $args );
}

/**
 * TMS 文字链接
 *
 * @since 0.1
 * @access publish
 * @param $args string
 * @key:
 *      name
 *      title
 *      group
 *      row
 *      defaultRow
 *      text:维护的文本内容
 *      href:链接地址
 */
function _tms_textLink ( $args='' ) {
    return _tms_common( $args );
}

/**
 * TMS 图片
 *
 * @since 0.1
 * @access publish
 * @param $args string
 * @key:
 *      name
 *      title
 *      group
 *      row
 *      defaultRow
 *      text:维护的文本内容
 *      img：图片地址
 */
function _tms_image ( $args='' ) {

    $argsNew = tb_json_decode($args);
    $size = preg_match('/\[([\dx]*)]/', $argsNew->title, $match);

    $attributes = array (
        /**
         * 通用key
         * 商品图片地址
         */
        'img' => _TMS_IMAGE . $match[1] . '.jpg',
    );

    return _tms_common( $args ,$attributes );
}

/**
 * TMS 图片链接
 *
 * @since 0.1
 * @access publish
 * @param $args string
 * @key:
 *      name
 *      title
 *      group
 *      row
 *      defaultRow
 *      text:维护的文本内容
 *      href:链接地址
 *      img：图片地址
 */
function _tms_imageLink ( $args='' ) {

    $argsNew = tb_json_decode($args);
    $size = preg_match('/\[([\dx]*)]/', $argsNew->title, $match);

    $attributes = array (
        /**
         * 通用key
         * 商品图片地址
         */
        'img' => _TMS_IMAGE . $match[1] . '.jpg',
    );


    return _tms_common( $args ,$attributes );
}

/**
 * TMS 商品 数据为手动填写
 *
 * @since 0.1
 * @access publish
 * @param $args string
 * @key:
 *      name
 *      title
 *      group
 *      row
 *      defaultRow
 *      text:维护的文本内容
 *      href:链接地址
 *      img：图片地址
 *  	price：商品价格
 *  	point：积分
 *  	saleNum:已售数量
 *  	extras：状态
 */
function _tms_product ( $args='' ) {

    $attributes = array (

        /**
         * 商品价格
         */
        'price' => '1999.00',

        /**
         * 积分
         */
        'point' => '10',

        /**
         * 已售数量
         */
        'saleNum' => '10',

        /**
         * 状态
         */
        'extras' => '',
        /**
         * 通用key
         * 商品图片地址
         */
        'img' => _TMS_IMAGE,
    );

    return _tms_common( $args , $attributes );
}

/**
 * TMS 商品标签 数据是按查询条件提取
 *
 * @since 0.1
 * @access publish
 * @param $args string
 * @key:
 *      name
 *      title
 *      group
 *      row
 *      defaultRow
 *      text:维护的文本内容
 *      href:链接地址
 *      img：图片地址
 *  	price：商品价格
 *  	point：积分
 *  	saleNum:已售数量
 *  	extras：状态
 */
function _tms_productList ( $args='' ) {

    $attributes = array (
        /**
         * 通用key
         * 商品图片地址
         */
        'img' => _TMS_IMAGE,
    );


    return _tms_product( $args ,$attributes );
}

/**
 * TMS 自定义
 *
 * @since 0.1
 * @access publish
 * @param $args string
 * @key:
 *      name
 *      title
 *      group
 *      row
 *      defaultRow
 *  	fields:自定义的数据字段配置,格式:key1:属性1:type1,key2:属性2:type2
 */

function _tms_custom ( $args='' ) {

    $json = json_decode( iconv( 'gbk','utf-8',$args ) , true );
    if(!array_key_exists('row',$json)||!array_key_exists('defaultRow',$json)) {
        echo "！@#￥！ _tms_custom标签缺失row或defaultRow属性，上传到TMS会出错";
        break;
    }

    $attributes = array (

        /**
         * 自定义字段
         */
        'fields' => ''

    );

    return _tms_common ( $args , $attributes);
}

function _tms_autoExtract($args = '') {
    return _tms_custom($args);
}
/**
 * TMS 文章列表
 *
 * @since 0.1
 * @access publish
 * @param $args string
 * @key:
 *      name
 *      title
 *      group
 *      row
 *      defaultRow
 id:资讯编号
 created：创建时间
 modified：发布时间
 publishedUrl：发布url
 title1：标题1
 title2：标题2
 title3：标题3
 authorId：作者序列号
 author：作者名
 authorUrl：作者URL
 articleCatalogId：类目序列号
 articleType：类型
 tag：标签
 tagLink：带链接的标签
 priority：权重
 priority2：优先级
 source：来源
 sourceUrl：来源URL
 articleAbstract：导语、摘要
 articleBody：正文
 image1：图1 1:1
 image2：图2 250x165
 image3：图3 190×150
 image4：图4 110X90
 templateId：关联模板序列号
 url：url
 positionTag：位置标签
 articlePath：文章正文存储路径
 *  	
 */
function _tms_articleList ( $args='' ) {

    $attributes = array (

        /**
         * 资讯编号
         */
        'id' => '',

        /**
         * 创建时间
         */
        'created' => '',
        'img' => _TMS_IMAGE,

        /**
         * 发布时间
         */
        'modified' => '',

        /**
         * 发布url
         */
        'publishedUrl' => '',

        /**
         * 标题1
         */
        'title1' => '',

        /**
         * 标题2
         */
        'title2' => '',

        /**
         * 标题3
         */
        'title3' => '',

        /**
         * 作者序列号
         */
        'authorId' => '',

        /**
         * 作者名
         */
        'author' => '',

        /**
         * 作者URL
         */
        'authorUrl' => '',

        /**
         * 类目序列号
         */
        'articleCatalogId' => '',

        /**
         * 类型
         */
        'articleType' => '',

        /**
         * 标签 
         */
        'tag' => '',

        /**
         * 带链接的标签
         */
        'tagLink' => '',

        /**
         * 权重
         */
        'priority' => '',

        /**
         * 优先级
         */
        'priority2' => '',

        /**
         * 来源
         */
        'source' => '',

        /**
         * 来源URL
         */
        'sourceUrl' => '',

        /**
         * 导语、摘要
         */
        'articleAbstract' => '',

        /**
         * 正文
         */
        'articleBody' => '',

        /**
         * 图1 1:1
         */
        'image1' => '',

        /**
         * 图2 250x165
         */
        'image2' => '',

        /*saleNum*
         * 图3 190×150
         */
        'image3' => '',

        /**
         * 图4 110X90
         */
        'image4' => '',

        /**
         * 关联模板序列号
         */
        'templateId' => '',

        /**
         * url
         */
        'url' => '',

        /**
         * 位置标签
         */
        'positionTag' => '',

        /**
         * 文章正文存储路径
         */
        'articlePath' => ''

    );

    return _tms_common ( $args , $attributes);
}

/**
 * TMS 类目list
 *
 * @since 0.1
 * @access publish
 * @param $args string
 * @key:
 *      name
 *      title
 *      group
 *      row
 *      defaultRow
 text：类目名称
 url：类目链接
 *      
 */
function _tms_categoryList ( $args='' ) {

    $attributes = array (

        'img' => _TMS_IMAGE,
        /**
         * url
         */
        'url' => _TMS_LINK

    );

    return _tms_common ( $args , $attributes );
}

/**
 * TMS 类目属性
 *
 * @since 0.1
 * @access publish
 * @param $args string
 * @key:
 *      name
 *      title
 *      group
 *      row
 *      defaultRow
 *     	defaultValue：pid:vid
 */
function _tms_catePropertype ( $args='' ) {

    $attributes = array (

        /**
         * pid:vid
         */
        'defaultValue' => ''

    );

    return _tms_common ( $args , $attributes );
}

/**
 * TMS 口碑
 *
 * @since 0.1
 * @access publish
 * @param $args string
 * @key:
 *      name
 *      title
 *      group
 *      row
 *      defaultRow
 text:店铺名称
 img:图片链接
 href:店铺链接
 menuList:店铺价目表
 address:店铺地址
 picTelno:电话
 p4cTelno:联系电话
 perPrice:人均消费
 comebackpercent:回头率
 userImpress:店铺印象
 koubei:口碑指数
 recommendFood:推荐菜
 isCoupon:是否有优惠:0/1
 isactivity:是否有活动:0/1
 discount：口碑卡折扣
 */
function _tms_koubei ( $args='' ) {

    $attributes = array (

        /**
         * 店铺价目表
         */
        'menuList' => '',

        'img' => _TMS_IMAGE,
        /**
         * 店铺地址
         */
        'address' => '',

        /**
         * 电话
         */
        'picTelno' => '',

        /**
         * 联系电话
         */
        'p4cTelno' => '',

        /**
         * 人均消费
         */
        'perPrice' => '',

        /**
         * 回头率
         */
        'comebackpercent' => '',

        /**
         * 店铺印象
         */
        'userImpress' => '',

        /**
         * 口碑指数
         */
        'koubei' => '',

        /**
         * 推荐菜
         */
        'recommendFood' => '',

        /**
         * 是否有优惠:0/1
         */
        'isCoupon' => '',

        /**
         * 是否有活动:0/1
         */
        'isactivity' => '',

        /**
         * 口碑卡折扣
         */
        'discount' => '',

    );

    return _tms_common ( $args , $attributes );
}

/**
 * TMS 画报
 *
 * @since 0.1
 * @access publish
 * @param $args string
 * @key:
 *      name
 *      title
 *      group
 *      row
 *      defaultRow
 title:图片标题
 fullCoverPicPath：封面默认图片
 posterAccessPath：画报链接
 userNick：创建人链接
 shortTitle：图片短标题
 *      
 */
function _tms_posterList ( $args='' ) {

    $attributes = array (

        /**
         * _tms_posterList 专用
         * 封面默认图片
         */
        'fullCoverPicPath' => '',

        'img' => _TMS_IMAGE,

        /**
         * _tms_posterList 专用
         * 画报链接
         */
        'posterAccessPath' => '',

        /**
         * _tms_posterList 专用
         * 创建人链接
         */
        'userNick' => '',

        /**
         * _tms_posterList 专用
         * 图片短标题
         */
        'shortTitle' => '',

    );

    return _tms_common ( $args , $attributes );
}

/**
 * TMS 排行榜
 *
 * @since 0.1
 * @access publish
 * @param $args string
 * @key:
 *      name
 *      title
 *      group
 *      row
 *      defaultRow
 title: 榜单标题(和循环无关)
 catName：类目标题(和循环无关)
 allHref：完整榜单链接
 toprankid：榜单ID(和循环无关)
 href：链接Url
 img图片url
 rankPubPeriod榜单展现周期
 rankId榜单ID
 objectId：supid
 idx榜单排行指标
 idxRank今日搜索排名
 idxLast昨日搜索排名
 idxRankChg排名变化
 idxChg指标变化 关注指数上升
 idxDownRank指标下降排名
 idxChgRate指标变化幅度 关注上升幅度
 idxUpRank指标上升排名
 idxUpRateRank指标上升幅度排名
 idxDownRateRank指标下降幅度排名 
 addedQuantity上周售出
 id编号
 date时间
 itemStaus
 spuId产品 SPUID 产品ID
 productName
 category产品所属类目ID
 productNwPrice产品价格
 productGroupFlag产品所属产品 族串 
 productStartDate产品上市时间
 productPriceChgWeek产品价格一周 变化
 productSellerNum产品的卖家数量
 alipayTradeNumW：ALIPAY周笔数
 alipayTradeNumIdxW：周笔 数排名 ALIPAY笔数
 *      
 */
function _tms_ranking ( $args='' ) {

    $attributes = array (

        /**
         * 类目标题(和循环无关)
         */
        'catName' => '',

        /**
         * 完整榜单链接
         */
        'allHref' => '',

        /**
         * 榜单ID(和循环无关)
         */
        'toprankid' => '',

        /**
         * 榜单展现周期
         */
        'rankPubPeriod' => '',
        'img' => _TMS_IMAGE,

        /**
         * 榜单ID
         */
        'rankId' => '',

        /**
         * supid
         */
        'objectId' => '',

        /**
         * 榜单排行指标
         */
        'idx' => '',

        /**
         * 今日搜索排名
         */
        'idxRank' => '',

        /**
         * 昨日搜索排名
         */
        'idxLast' => '',

        /**
         * 排名变化
         */
        'idxRankChg' => '',

        /**
         * 指标变化 关注指数上升
         */
        'idxChg' => '',

        /**
         * 指标下降排名
         */
        'idxDownRank' => '',

        /**
         * 指标上升排名
         */
        'idxUpRank' => '',

        /**
         * 指标上升幅度排名
         */
        'idxUpRateRank' => '',

        /**
         * 指标下降幅度排名 
         */
        'idxDownRateRank' => '',

        /**
         * 上周售出
         */
        'addedQuantity' => '',

        'itemStaus' => '',

        /**
         * 产品 SPUID 产品ID
         */
        'spuId' => '',

        /**
         * _tms_ranking 专用
         * 
         */
        'productName' => '',

        /**
         * 产品所属类目ID
         */
        'category' => '',

        /**
         * 产品价格
         */
        'productNwPrice' => '',

        /**
         * 产品所属产品 族串 
         */
        'productGroupFlag' => '',

        /**
         * 产品上市时间
         */
        'productStartDate' => '',

        /**
         * 产品价格一周 变化
         */
        'productPriceChgWeek' => '',

        /**
         * 产品的卖家数量
         */
        'productSellerNum' => '',

        /**
         * ALIPAY周笔数
         */
        'alipayTradeNumW' => '',

        /**
         * 周笔 数排名 ALIPAY笔数
         */
        'alipayTradeNumIdxW' => ''

    );

    return _tms_common ( $args , $attributes );
}

/**
 * TMS 更多
 *
 * @since 0.1
 * @access publish
 * @param $args string
 * @key:
 */

function _tms_more ( $args='' ) {
    return _tms_common ( $args );
}

/**
 * TMS 区块引用本地存在就引用本地不存在就已用线上
 * 不过如果引用线上的也是php解析出来的html
 * 真正要去的tms的区块文件只能以后有需求的在开接口
 *
 * @since 0.1
 * @access publish
 * @param $args string
 * @key:
 */

function _tms_subArea ( $args='' ) {
    /*
    $pdir = SAIL_PAGE . '/view'.$args;
    global $spk_name;
    $self = HTDOC . $spk_name .'/'. $args;
    $self_mod = HTDOC . $spk_name .'/modules/'. $args;
    $tms = new TMS_TAG;
    if(is_file($pdir)){
        $tms->repeatReplace($pdir);
    }elseif(is_file($args)){
        $tms->repeatReplace($args);
    }elseif(is_file($self)){
        $tms->repeatReplace($self);
    }else{
		require_once(SAIL_INC.'Snoopy.class.php');
		//修改为snoopy 获取 start
		$remote = new Snoopy();
		$remote->fetch( "http://www.taobao.com/go" . $args );

		return eval('{?>'.$remote->results.'<?}');

		//修改为snoopy 获取 end
        //return include ( "http://www.taobao.com/go" . $args );

    }
    */
    return;
}

/**
 * TMS 导航菜单
 *
 * @since 0.1
 * @access publish
 * @param $args string
 * @key:
 */

function _tms_nav ( $args='' ) {

    $attributes = array (
        'childList' => _TMS_TEXT
    );

    return _tms_common ( $args , $attributes );
}

/**
 * TMS 模块标签
 *
 * @since 0.1
 * @access publish
 * @param $args string
 */
function _tms_module_begin() {
    return;
}

function _tms_module_end() {
    return;
}

/**
 * TMS repeat标签
 *
 * @since 0.1
 * @access publish
 * @param $args string
 */
function _tms_repeat_begin( $arg='' ) {
    return;
}

function _tms_repeat_end() {
    return;
}
?>
