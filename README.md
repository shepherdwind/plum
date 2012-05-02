#Plum

A litte server environment by node, work for demo deveploer. Easy to expand, or
add an plugin to it.

##Use
  
    node server.js

##config

the file server.json is an config file

##hooks

hooks is the plugin for server, config in the server.json, the when parser some
kind of file, it would run the hooks first, then, you can do any thing you want
to do. Such as

* parser css file use lessc
* get combined css or javascript files
* parser php file use php cli
* parser template language use node
* build files, such as compress css js
