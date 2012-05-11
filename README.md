#Plum

基于node的Demo服务器。Node作为http请求控制中心，通过`server.json`配置，根据请求
域名，找到所请求的文件，同时根据服务器配置的`hook`，对文件执行解析分发。

##Use
  
    node server.js

依赖php cli和node的less模块，请首先安装。

##config

配置文件: `server.json`。配置方式和Apache基本一直，不过没有那么复杂。

- *port*: 端口，默认80
- *dirIndex*: 目录中默认查找文件
- *servers*: 虚拟主机相关配置，包括域名对应的base路径和特定hooks
- *hooks*: 全局hook，比如.php: php，所有的php文件都会通过`hooks/php.js`执行
- *MIME*: 需要支持的文件类型

        {
          "port": 80,
            "dirIndex": ["index.html", ..],
            "servers": {
              "a.tbcdn.cn": {
                "path": "/Users/eward/assets",
                "hooks": {
                  ".css": ["proxy"], 
                  ...
                }
              },
              ...
            },
            "hooks": {
              ".php" : ["php"],
              ".css" : ["less"]
            },
            "MIME": {
              ".js": "application/x-javascript",
              ...
            }
        }

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

##TODO

- php使用php-cgi和fpm来执行。对fpm和php-cgi不是很了解，学习中。
- vm模板解析
