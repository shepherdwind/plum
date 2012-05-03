/**
 * @fileoverview hook标准实现，初始化函数_init，执行逻辑parse，需要自定义的。简
 * 单说，自定义的内容包括，判断哪些文件(文件自动提供)需要操作，然后执行需要进行
 * 的操作，操作结束后，发布一个执行成功的事件，事件中把操作获得的数据返回。
 *
 * 1. 初始化方法，如果初始化方法有异步操作，需要设置initialized为false，并且在异
 * 步操作完成以后设置initialized为true，this.set('initialized', true); 
 * 2. _condiction自行设置，conditction决定哪些文件需要进行解析。比如，less hook
 * 中，判断依据是以相同文件名的less文件是否存在，如果存在，less 解析替代css 本身
 * ，如果less不存在，回滚到origin，加载css文件 
 * 3. _do方法中，操作完一个文件后，需要把计数器加1，this._add()，保存do执行中发
 * 生错误或者成功 
 * 4. _do方法成功后，需要发布一个事件，事件data是数组，数组由string或buffer组成
 * this.fire('dataLoad', {data: [], index: i}); 
 * @author hanwen<hanwen.sah@taobao.com>
 */
'use strict';
var stdclass = require('../lib/stdclass');
var path = require('path');
var fs = require('fs');

function Hook(){
  this.init.apply(this, arguments);
}

stdclass.extend(Hook, stdclass, {

  /**
   * attributes, 定义需要操作的数据，path和files定义操作的文件路径和文件名， len
   * 是一个计数器，当len从0增长到和数组files的长度一致的时候，解析器完成操作，后
   * 续交给对象origin处理，或者进入下一个钩子，操作后续的文件。 initialized定义
   * 初始化是否需要等待，如果无需等待，设置为true，等待意味着在_init方法中有异步
   * 操作，等待异步操作完成，设置initialized为true，parse 将继续执行
   */
  attributes: {
    path: '',
    files: [],
    len: 0,
    initialized: true
  },

  CONSIT: {},

  /**
   * 初始化方法，对象new操作立即执行的操作
   */
  _init: function init(){
    this._bind();
  },

  _bind: function bind(){
    this.on('change:initialized', function(e){
      if (e.now) this.parse();
    });
  },
  /**
   * 解析方法，主要业务逻辑实现
   */
  parse: function parse(){

    //判断是否等待
    if (!this.get('initialized')) return;

    //获取文件
    var files = this.get('files');

    files.forEach(function(file, i){
      //文件已经解析完成，file等于false
      if (file !== false) return this._add();

      /**
       * 判断逻辑，自定义，表示文件在某种情况下执行解析，如果无需解析，则自动进
       * 入origin解析，或者下一个hook
       */
      var filePath = basePath + file.replace('.css', '.less');
      path.exists(filePath, this._do.bind(this, file, i));

      return null;

    }, this);

  },

  //增加计数器，当计数器等于files的长度，表示解析所有文件完成
  _add: function(){
    this.set('len', this.get('len') + 1);
  },

  /**
   * 操作单个文件逻辑自行实现，需要注意的事，成功以后请发布一个事件，事件规范
   * this.fire('dataLoad', {data: [], index: i}); data为数组，数组由string或者
   * buffer构成, index为函数传递的参数i
   * @param file {string} 文件路径
   * @param i {number} 文件id
   * @param exist {bool} 表示文件是否存在，path.exists 回调参数
   */
  _do: function _do(file, i, exist){
    if (exist) return this._add();
    //you code
  }

});

module.exports = Hook;
