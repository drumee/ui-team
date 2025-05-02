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
    .main-body{
      display: flex;
      flex-direction: column;
      width: 100vw;
      height: 100vh;
      justify-content: center;
      justify-items: center;
      align-items: center;
      align-content: center;
      background-color: grey;
    }
    .main-body .message{
      background: yellow;
      padding: 10px;
      border-radius: 3px;
    }
  </style>
</head>

<body style="background-color: #fff">
  <script src="../public/offline.js"></script>
  <div class="main-body"  >
    <div class="message" id="message-box" onclick="handleClick">
    NO NETWORK CONNECTION
    </div>
  </div>
</body>

</html>