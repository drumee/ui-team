<!-- ==================================== -->
<!-- Basic loader         -->
<!-- ==================================== -->

<script type="text/template" id="--gs-loader">
  <div style="position:absolute; right:5px; top:5px">
    <div class="xui-close">
      <i class="fa fa-times fa-fw"></i>
    </div>
  </div>
  <div class="full box" data-justify="center" data-flow="v">
    <svg version="1.1" viewBox="0 0 160 100" class="loader">
      <circle fill="rgba(250,250,250,0.7)" cx="80" cy="50" r="40" stroke="#ff3466" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"> </circle>
    </svg>
    <div class="margin-auto percent-digit"> 0% </div>
  </div>
</script>


<script type="text/template" id="--jump-loader">
  <svg id="--loader" width="200px" height="200px" viewBox="0 0 200 200">
    <path id="--jump" fill="none" stroke="#2d2d2d" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" stroke-miterlimit="10" d="M47.5,94.3c0-23.5,19.9-42.5,44.5-42.5s44.5,19,44.5,42.5" />
    <g stroke="#2d2d2d" stroke-width="1">
      <ellipse id="--circleL" fill="none" stroke-miterlimit="10" cx="47.2" cy="95.6" rx="10.7" ry="2.7" />
      <ellipse id="--circleR" fill="none" stroke-miterlimit="10" cx="136.2" cy="95.6" rx="10.7" ry="2.7" />
    </g>
  </svg>
</script>
