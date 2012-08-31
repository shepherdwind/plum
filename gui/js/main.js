(function (){
  var editor = ace.edit("code");
  editor.getSession().setMode("ace/mode/json");
  editor.setHighlightActiveLine(false);
  var modeEl = document.getElementById("mode");
  var themeEl = document.getElementById("theme");
  var vim = require("ace/keyboard/vim").handler;
  var emacs = require("ace/keyboard/emacs").handler;
  var HashHandler = require("ace/keyboard/hash_handler").HashHandler;
  
  var keybindings = {
    // Null = use "default" keymapping
    ace: null,
    vim: vim,
    emacs: emacs,
    // This is a way to define simple keyboard remappings
    custom: new HashHandler({
      "gotoright":      "Tab",
      "indent":         "]",
      "outdent":        "[",
      "gotolinestart":  "^",
      "gotolineend":    "$"
    })
  };

  function bindDropdown(id, callback) {
    var el = document.getElementById(id);
    if (localStorage && localStorage.getItem(id))
      el.value = localStorage.getItem(id);

    var onChange = function() {
      callback(el.value);
      saveOption(el);
    };

    el.onchange = onChange;
    onChange();
  }

  function saveOption(el, val) {
    if (!el.onchange && !el.onclick)
      return;

    if ("checked" in el) {
      if (val !== undefined)
        el.checked = val;

      localStorage && localStorage.setItem(el.id, el.checked ? 1 : 0);
    }
    else {
      if (val !== undefined)
        el.value = val;

      localStorage && localStorage.setItem(el.id, el.value);
    }
  }

  bindDropdown("theme", function(value) {
    if (!value) return;
    editor.setTheme(value);
    themeEl.selectedValue = value;
  });

  bindDropdown("keybinding", function(value) {
    editor.setKeyboardHandler(keybindings[value]);
  });

  var form = document.getElementById('form');
  form.onsubmit = function(e){
    form['code'].value = editor.getValue();
  };
  setTimeout(function(){
    document.getElementById('J_msg').className = 'hidden';
  }, 5000);

  var commands = editor.commands;
  commands.addCommand({
    name: "save",
    bindKey: {win: "Ctrl-S", mac: "Command-S"},
    exec: function(){
      form['code'].value = editor.getValue();
      form.submit();
    }
  });


})();
