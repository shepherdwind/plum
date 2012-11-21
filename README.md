#Plum

基于node的Demo服务器。Node作为http请求控制中心，通过`server.json`配置，根据请求
域名，找到所请求的文件，同时根据服务器配置的`hook`，对文件执行解析分发。

[doc](http://git.shepherdwind.com/plum/)

##Use
  
      sudo npm install plum -g
      sudo plum

依赖php cli和node的less模块，请首先安装。

##config

配置文件: `server.json`。配置方式和Apache基本一直，不过没有那么复杂。

- *port*: 端口，默认80
- *dirIndex*: 目录中默认查找文件
- *servers*: 虚拟主机相关配置，包括域名对应的base路径和特定hooks
- *hooks*: 全局hook，比如.php: php，所有的php文件都会通过`hooks/php.js`执行

##hooks

[文档](https://github.com/shepherdwind/plum/blob/master/hooks/README.md)。
server.js是入口文件，完成请求分发工作。主要解析过程由hooks目录下的js执行。

- *origin*

  origin首先判断请求为文件还是目录，如果是目录，生成目录列表。如果是文件，根据文
  件后缀，初始化相对于的hook，并且接受hook发送数据请求事件。控制文件输出到客户端
  的属性，和错误情况的处理。同时，在没有hook的情况下，完成静态文件读取的功能。

- *hook*和*hook-simple*

  这两个是hook规范事例，并没有具体实现，是扩展hook的规范

- *less*

  less完成less解析工作，初始化时，判断文件相对应的less文件是否存在，如果存在执行
  less编译，返回结果，如果不存在，退出，交给origin处理。

- *proxy*

  淘宝cdn代理实现。初始化时候，首先判断文件在本地是否存在(文件查找规则由请求url
  和 server.json配置的path决定)，如果不存在，从cdn服务器获取数据。如果存在，则退
  出，origin处理自动。

- *php/cli*

  通过php cli解析php文件，现在还不支持post和get请求，作为demo环境基本够用，执行
  效率和由php 自身性能决定，和转发者是node还是apache无关。

- *php/tms*

  模拟tms函数，生成demo。判断规则是：文件是php，并且含有.tms，tms规则支持tms文件
  引用，不过要求，每次只引用一个文件(`<?php include 'a.tms.php';?>`)，而且文件名
  中含有.tms。demo的数据根据请求的文件名，把后缀改为json，比如访问a.tms.php，demo
  数据源为a.tms.json，运行时，每个函数通过name来定位数据。

##change log

- version 0.3.10
  - 修复两个斜杠开头时代理错误的bug
- [2012-11-14 11:40:24] version 0.3.9
  - 简化log判断，改为两条log输出规则，log和debug，log使用支持通配符`*`，匹配需要
    输出log信息的url。debug打开所有的log信息
  - 修复bug [#9](https://github.com/shepherdwind/plum/issues/9)
  - 增加`agent`钩子，用于完全代理任意域名

- [2012-08-09 08:44:24] version 0.3.1
  - 增加log信息过滤配置，logFiles配置可显示log信息的文件，logHooks配置hook日志,
    logBasic显示基本信息，显示所有请求文件和请求执行时间. debug所有细节都log到
    控制台。
    
```
  "logFiles":[
    {
      "path":"tmse/5137/assets",
      "ext":[".css", ".js"]
    }
  ],
  "logHooks":["less"],
  "logBasic":false,
  "debug":false
```
  - 增加执行时配置，使用[config](http://127.0.0.1/config)进行执行时配置，无需重启
  服务器。
  - 修改hook `php/proxy`，使用php5.4启动php内置服务器，请求转发到php自带服务器，
  支持post，get请求。需要php版本>=5.4
  - 增加hook `proxyAll`和`statics`，proxyAll对所有请求都从a.tbcdn.cn上取数据，
  statics为静态文件hook，本来和origin.js和在一起，现在拆分开。
  - 增加子规则maps配置，用于设置域名下路径映射和hook规则
   
```
  "maps":{
    "/tmse/5137/assets/":{
      "path":"/Users/eward/Sites/dev/nongye/sdk/assets/",
      "hooks":{
        ".css":["less"],
        "statics":["statics"]
      }
    }
  }
```

- [2012-06-12 15:44:03] 
  - 增加`proxy=pre`作为使用预发assets的接口
  - tms规则下，build时，生成文件名对应的html文件，用于fed上预览
  - 去除tms规则下，引用模块文件名必须以`.tms.php`结尾的规则
  - tms规则下，自动生成.json文件，方便修改
  - 增加自动更新提示

##TODO

- php使用php-cgi和fpm来执行。对fpm和php-cgi不是很了解，学习中。
- vm模板解析
