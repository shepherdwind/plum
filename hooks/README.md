#hook 规范

##定义

hook表示为钩子，服务器从`server.js`进入`origin.js`，origin是系统默认执行，主要完
成静态服务器功能。每个hook对应一个js文件，hook标准在`hook.js`中。hook 定义在
`server.json`中，hooks定义了系统hook和服务器特定hooks，执行顺序从服务器 hook一直
到系统hook。每个url对应一个或多个文件，每个文件执行一个钩子，如果某个钩子执行失
败，最近进入`origin.js`。

##标准

hook标准实现，简单说，就是，判断哪些文件(文件自动提供)需要操作，然后执行需要进行
的操作，操作结束后，发布一个执行成功的事件，事件中把操作获得的数据返回。标准实现
在hook.js(hook-simple.js是无注释版本)中，直接修改相应的部分即可。

通常情况下，直接实现`parse`和`_do`方法就可以了。初始化需要执行的操作，写在
`_init`中调用。

- 初始化方法，如果初始化方法有异步操作，需要设置initialized为false，并且在异步操
作完成以后设置initialized为true，如果不设置，parse逻辑会一直不执行

		this.set('initialized', true); 

- parse方法中condiction需要设置。conditction决定哪些文件需要进行解析，比如，less
hook中，判断依据是以相同文件名的less文件是否存在，如果存在，less 解析替代 css本
身，如果less不存在，回滚到origin，加载css文件。

		var filePath = basePath + file.replace('.css', '.less');
		path.exists(filePath, this._do.bind(this, file, i));

- _do方法中，操作完一个文件后，*需要把计数器加1*
		
		this._add();

- _do方法成功后，需要发布一个事件，事件data是数组，数组由`string`或`buffer`组成

		this.fire('dataLoad', {data: [], index: i})

##例子

server.json配置如下:

    {
      "servers": {
        "a.tbcdn.cn": {
          "path": "/Users/eward/assets",
          "hooks": {
            ".css": ["proxy"], 
          }
        }
      },
      "hooks": {
        ".php" : ["php"],
        ".css" : ["less"]
      }
    }

###说明

访问`url: http://a.tbcdn.cn/tmse/5038/assets/css/index.css` 根据服务器规则，首先
执行servers下的hooks，proxy(代理规则)，如果本地不存在对应文件，则从服务器读取。
如果本地有，退出proxy规则，进入第二个hook，第二个是系统全局的hooks，less规则，
less执行规则是，对应文件后缀改为less的文件存在，如果less文件存在，则执行less解析
并且返回结果，如果不存在，退出，进入静态服务器模式，读取文件。
