#Plum

by: 翰文，来自垂直市场

##基于node搭建demo服务器

###来源

#### 基德的node代理工具
  
  虽然是基于基德的代理工具，实际上，和基德的代理工具没有什么关系了，完整重写实现
  。主要借机其实现原理。Node代理工具中，最有意思的一点是，node作为一个服务器，可
  以获取http请求，这个请求node可以随意处理，虽然，这一点很多服务器软件都可以做到
  ，比如 Apache，写一些路由重写规则可以实现转发，不够Apache适用正则表达式，毕竟
  没有一门完整的语言这么强大，而且使用门槛比较高。python自身也可以搭建服务器，不
  过，我相信，大多数前端对python的熟悉程度肯定媛媛比不上js。更重要的是，node本身
  诞生于互联网环境，比起python，更时候做服务器。此外，现在有一个趋势，前端领域的
  开发工具(比如jslint,csslint, less)渐渐都往node靠拢，node作为服务器，它可以无缝
  接入这些。

#### 从node代理工具，应该可以用来解析less

  less的引入是毋庸置疑的，看过less的人们肯定都不愿意再使用很挫的css了。less的推
  广，最大的门槛不是语法，而是每次改完需要编译一下。这个过程比较麻烦。也许，大家
  说，winless 他们可以监听文件修改事件啊，这个实际上是不能满足实际开发的。比如：
  通常情况下，一个 less文件需要拆分模块的，使用import来导入，这样单个文件不至于
  那么庞大，而且，可以很方便维护，多人合作开发，这时候，很可能的情况是，a.css对
  应a.less，a.less引入b.less, c.less，我们不会直接修改a.less，而是修改模块b.less
  ，这个时候，生成b.css完全没有必要。但是，服务器请求的肯定是a.css，我们可以知道
  最终需要的less文件是a.less，所以，如果请求的时候使用node来自己解析less，这样，
  就不必麻烦去编译了。

  这个实现，我和本地市场的元晃讨论过，然后他还实现了。我想把这个引入到垂直市场，
  然后，问他怎么使用，然后就是直接基于的代理工具修改，使用是把demo也使用代理，在
  demo写a.tbcdn.cn这样的地址，我觉得，这样太麻烦，不够友好，而且还得处理apache
  和node两个端口的问题。apache做请求转发可以解决端口冲突的问题，不过开两个服务器
  ， demo写a.tbcdn.cn这样不够优雅。less解析交给node来做是非常合适的，但问题是，
  我们的demo是php环境的，需要apache。

#### apache本身是不能跑php的，php是有php解析器的。

  想到这点，我很兴奋，如果直接用node来转发请求，直接交给php，那就什么问题都没有
  了。 node就是服务器，node完整取代apache啊，这太好了。

###展望

#### 在tms中，PHP是一种模板语言
  
  在垂直市场还有另外一个问题，常之做的sdk，曾经有加上过tms标签预览的功能。这个
  让我想到，最近在推广的vmsdk，vmsdk的原理也是做vm模板的预览，通过一个json数据
  作为模板的数据，这样，就可以实现demo预览效果了。vm是模板，tms中，php也是模板。
  那么，如果可以捕获http请求，那么在处理php之前，对php文件进行一些操作，这个应该
  是没有问题。类似于vmsdk的实现，tms的php文件预览应该也是可以实现的。

#### vm模板解析

  和上面说的差不多，php模板可以解析，vmsdk主要还是做vm模板解析的工作，如果可以把
  vm模板解析作为一个开发的接口，那么node也可以解析vm了。或者，使用js实现一套vm解
  析，这个已经有人实现了，不过还只是在客户端实现，要做完整的vm解析，还有很多事情
  需要处理。

#### 自动化发布

  自动化发布包括，自动压缩文件，打包工作，less编译文件生成等等。

#### 其他

  集成其他工具，比如jslint，csslint，css编译工作(我正在做的一个css工具，还处理概
  念阶段)。或者其他我们还没有想到的。

###实现

  想法好了，实现蓝图也ok了，下面就是如何设计了。我使用的是如下方式:

#### server.json[配置文件](https://github.com/shepherdwind/plum#hooks)

  配置一个类似于虚拟主机，提供path路径

#### 方便的插件机制

  构建一个抽象模型，方便各种不同文件处理自动以操作的接入。插件是通过hooks来实现
  的，每个hook对应一个中规则。前面所分析的，代理和less编译，分别代表proxy和less
  两个规则。
  
  * proxy规则：判断css文件在本地是否存在，如果存在，从本地读取文件，不存在，从线
  上取。
  * less规则：读取文件是否存在路径相对应的less文件，如果存在，less编译，返回结果
  * [hooks文档](https://github.com/shepherdwind/plum/blob/master/hooks/README.md)

#### 统一控制origin

  origin是一个特殊的hook，作为hook，执行静态文件读取的功能。同时，兼职请求分发，
  和对外统一发布数据，文件目录列表展示三个功能。

###问题与解决方案

####异步处理
  
处理异步，在node中非常麻烦的，node所有造成都是异步，判断文件是否存在，读取文件等
等，同时forEach等操作，都是使用匿名函数执行，异步回调，匿名还是不断嵌套，提到
node，大家都会表示，这个很难搞，这个很蛋疼，node的硬伤。

* 老赵的Jscex

  D2的时候，听过老赵激情演讲，觉得很不错，把异步都同步处理了。不过，自我感觉，对
  Jscex 不是很熟，而且，感觉，通常没有觉得异步操作有什么烦人的，没必要同步吧。放
  弃。

* Async.js

        async.map(['file1','file2','file3'], fs.stat, function(err, results){
            // results is now an array of stats for each file
        });
  
  逻辑实现不一致，放弃。

###事件发布，一致的this上下文，属性管理

#### 统一的事件机制
  
  服务器处理也是io的一种，node中io事件都是：data end error，这三种，因为error事
  件会导致node异常退出，改为err事件。初始化server.js，实例一个origin，origin发布
  data事件，每次data输出一部分数据，结束时，请求结束。

#### 一致上下文环境，从回调中退出

  在forEach可以指定this，让this始终保持，可以把回调函数和调用回调的函数统一写在
  对象原型上，级别一直，看起来就更加清晰。
  [例子](https://github.com/shepherdwind/plum/blob/master/hooks/hook-simple.js)
  
        files.forEach(function(file, i){
          if (file === false) return this._add();
          var basePath = this.get('path');
          var filePath = basePath + file;
          path.exists(filePath, this._do.bind(this, file, i));
          return null;
        }, this);

#### 属性管理，控制混乱

  在很多异步操作的情况下，很多东西是无法确定的。比如一个combine的，带有less和
  proxy 规则的css url，请求6个css，可能出现如下的情况:

        [Origin begin]:5 files
        [Hook proxy] Got file /apps/hesper/tmse/footer.css(2). spend time:109
        [Hook proxy] Got file /p/global/1.0/global-min.css(1). spend time:262
        [Hook proxy] Got file /tbsp/tbsp.css(0). spend time:263
        [Hook less] Got file /tmse/5038/assets/css/header.css(4). spend time:296
        [Origin file]: Get file /p/market/2011/common_v2.css(3). Spend time: 303
        [Origin end] spend time: 304ms

  最先获取到的是footer.css，但是它是第二个文件，为了保证顺序，只能等等...这时候
  状态记录非常头痛了。文件是分段获取的，需要同时保持文件之间的顺序和文件内部顺序
  。一个文件读取结束，需要判断接下来的文件是否已经提前ok了，如果已经提前好了，需
  要结束以后立即把获取的数据发布出去。不过，最好，状态的管理也还是一件烦人的事情
  ，不过，有了状态记录，至少，可以有据可查。node就是一运行起来，你用于不知道下一
  秒将会发生什么，就连log信息都是混乱的，一个请求的log经常和其他请求的同时发布出
  来，所有，log状态也需要保存，等待请求结束，一起log出来。

  不过，混乱的好处是，随时都有事情发生，感觉js一点都不偷懒。

#### 三者的统一，stdclass.js

  stdclass是我用于浏览器的一个base类，完成事件继承，属性管理的任务。比较有特殊的
  ，事件方式: change事件，once实现，属性分类，统一接口。和KISSY的base，个人更喜
  欢，change:xxx:xxx类似的事件，习惯而已。stdclass处理事件，内部事件基本上是通过
  set 属性来操作的，看到set，肯定是为了改变某个属性状态，然后，在_bind中可以找到
  相对应的操作。

####gbk编码

node不支持gbk，非常麻烦，所以，在node中，最好少用string，io操作基本上都是通过
buffer 的。文件可以使用createReadStream来操作，虽然这个模块稳定级别还不够高，不
过，应该问题不大。

###结束

####[hook-simple](https://github.com/shepherdwind/plum/blob/master/hooks/hook-simple.js), 基本结构

####[进展](https://github.com/shepherdwind/plum#hooks)

完成proxy和less规则，静态服务器解析，combine支持，php cli解析，通过php cli解析
php文件，现在还不支持post和get请求，作为demo环境基本够用，执行 效率和由php 自身
性能决定，和转发者是node还是apache无关。
