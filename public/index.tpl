<!DOCTYPE html>
<!--
_____  _ __ _   _ _   _  ___  ___
|  _ \| '__| | | | \_/ |/ _ \/ _ \
| |_) | |  | |_| | | | | \__/ \__/
|____/|_|  (_____|_| |_|\___|\___|

-->

<html translate="no" xmlns="http://www.w3.org/1999/xhtml">

<head>
  <meta charset=UTF-8>
  <meta http-equiv="Content-Type" content="text/html">
  <meta http-equiv="Cache-Control" Content="Public">
  <meta http-equiv="Content-Language" content="fr,en">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
  <title>
    Drumee
  </title>
  <script>
    var xia_lang = "fr";
    var verbose = 1;
    const DEBUG =  {};

    function loadApp() {
      setTimeout(() => {
        document.getElementById("splash-screen").style.zIndex = 1;
        document.getElementById("splash-screen").style.display = 'none';
      }, 4000)
    }


  </script>
  <style>
    #splash-screen {
      position: absolute;
      background: #657bdc;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 1111;
    }

    #splash-screen lottie-player {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
    }
  </style>
  <link rel="stylesheet" href="loader.css" media="screen">
</head>

<body style="background-color: #fff" onload="loadApp()">
  <div id='splash-screen' style="background-color: #657bdc">
    <script src="../public/lottie-player.js"></script>
    <lottie-player src="../public/data1.json" background="transparent" speed="1" style="width: 100px; height: 100px;"
      loop autoplay></lottie-player>
  </div>
  <div class="margin-auto -top" id="--router" >
    <div class="unsupported-main" style="width:100vw; height:100vh;">
    </div>
  </div>
  <div class="margin-auto" id="--wrapper"><%= main %></div>
  <script type="text/javascript" src="<%= main %>" crossorigin="true"></script>
  <script>
    if (typeof module === 'object') { window.module = module; module = undefined; }
  </script>
  <script>if (window.module) module = window.module;</script>
</body>

</html>