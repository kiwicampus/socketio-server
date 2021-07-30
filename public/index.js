var settings = {
  emit_on_callback: false,
  emit_interval: 50,
  steering_angle: 1.0,
  throttle: 0.5,
  stickRadius: 300.0,
  power: 1.5,
  send_camera: false,
  call_corner_net: false,
  corner_threshold: 0.7,
  call_api: false,
  cameras: {
    left: 0,
    center: 1,
    right: 2
  },
  network_branch: "cristian-nvidia-net-basic-real-data-0.0.1"
}

var data = {
  steering_angle: 0.0,
  throttle: 0.0,
  recording: false,
  lid_opened: false,
  autonomous: false,
  auto_throttle: settings.throttle,
  auto_steering: settings.steering_angle
};

var leftNipple = {};
var rightNipple = {};

var recording = false;
var lid_opened = false;
var bot_recording = false;
var record_mode = "c2c";
var joystick_visible = true;
var autonomous = false;
var manualControl = false;
var enable_driving = false;
var last_enabled = new Date();
var last_telemetry = new Date();
var botMode = null;
var botArmed = null;
var autoActive = false;
var branches = [];
var warning = false;
var last_warning = new Date();

var steering = 0.0
var corner_prob = 0.0
var wall_crash_prob = 0.0


function set_steering_angle(new_steering_angle, data) {
  var sign = Math.sign(new_steering_angle);
  new_steering_angle = Math.abs(new_steering_angle);

  data.steering_angle = Math.pow(new_steering_angle, settings.power) * sign * settings.steering_angle;
}

function set_throttle(data, settings, new_throttle) {
  data.throttle = settings.throttle * new_throttle;
}

function onResize() {
  // console.log("RESIZE");
  leftNipple.destroy();
  rightNipple.destroy();
  enableNipples();
}

window.onresize = (e) => onResize();


var gamepad = null;

$(function() {

  document.body.style.backgroundColor = "black";

  ///////////////////////////
  //// load settings
  ///////////////////////////

  readUrlParams();
  var savedSettings = JSON.parse(localStorage.getItem("settings"));
  if (savedSettings) {
    settings = Object.assign(settings, savedSettings);
  }

  $("#throttle-viewer").html(settings.throttle.toFixed(2));
  $("#steering-viewer").html(settings.steering_angle.toFixed(2));

  ///////////////////////
  /// Virtual Joysticks
  ///////////////////////

  enableNipples();

  ///////////////////////
  ///// GAMEPAD /////////
  ///////////////////////
  gamepad = new Gamepad();

  //////////////////////////////////////////////
  ///// Button mappings in Playstation controller
  ///// button_1 -> X
  ///// button_2 -> O
  ///// button_3 -> []
  ///// button_4 -> /\
  //////////////////////////////////////////////

  gamepad.on('connect', function(e) {
    console.log(`controller connected!`, gamepad);
  });

  gamepad.on('press', 'button_1', (e) => {
    set_throttle(data, settings, 1.0);
  });

  gamepad.on('release', 'button_1', (e) => {
    set_throttle(data, settings, 0.0);
    // enableDriving();
  });

  gamepad.on('release', 'start', (e) => {
    enableDriving();
    // console.log("start");
  });
  // gamepad.on('release', 'select', (e) => {
  //   console.log("select");
  // });

  gamepad.on('release', 'stick_button_right', (e) => {
    joystick_visible = !joystick_visible;
    onResize();
  });
  gamepad.on('release', 'stick_button_left', (e) => {
    joystick_visible = !joystick_visible;
    onResize();
  });

  // Left arrows
  // gamepad.on('release', 'd_pad_down', (e) => {
  //   console.log("d_pad_down");
  // });
  // gamepad.on('release', 'd_pad_up', (e) => {
  //   console.log("d_pad_up");
  // });
  // gamepad.on('release', 'd_pad_left', (e) => {
  //   console.log("d_pad_left");
  // });
  // gamepad.on('release', 'd_pad_right', (e) => {
  //   console.log("d_pad_right");
  // });
  
  // gamepad.on('press', 'button_2', (e) => {
  //   set_throttle(data, settings, -1.0);
  //   console.log("button_2");
  // });
  
  gamepad.on('release', 'button_2', (e) => {
    toggleRecord("crossing");
  });
  
  gamepad.on('release', 'button_3', (e) => {
    toggleOpenLid();
    // console.log("button_3");
  });
  
  gamepad.on('release', 'button_4', (e) => {
    toggleRecord("c2c");
    // console.log("button_4");
  });

  gamepad.on('hold', 'stick_axis_left', (e) => {
    set_steering_angle(e.value[0], data);
  });

  gamepad.on('release', 'stick_axis_left', (e) => {
    data.steering_angle = 0.0;
  });

  gamepad.on('hold', 'stick_axis_right', (e) => {
    set_throttle(data, settings, -e.value[1]);
  });

  gamepad.on('release', 'stick_axis_right', (e) => {
    data.throttle = 0.0;
  });

  gamepad.on('hold', 'shoulder_bottom_left', (e) => {
    set_throttle(data, settings, -e.value);
    // console.log(e.value);
  });

  gamepad.on('release', 'shoulder_bottom_left', (e) => {
    data.throttle = 0.0;
  });

  gamepad.on('hold', 'shoulder_bottom_right', (e) => {
    set_throttle(data, settings, e.value);
  });

  gamepad.on('release', 'shoulder_bottom_right', (e) => {
    data.throttle = 0.0;
  });

  gamepad.on('release', 'shoulder_top_right', (e) => {
    settings.throttle = Math.min(settings.throttle + 0.025, 1.5)
    $("#throttle-viewer").html(settings.throttle.toFixed(2));
  });
  gamepad.on('release', 'shoulder_top_left', (e) => {
    settings.throttle = Math.max(settings.throttle - 0.025, 0.0)
    $("#throttle-viewer").html(settings.throttle.toFixed(2));
    
  });


  /////////////////
  // BUTTONS
  /////////////////
  function resetStates() {
    manualControl = false;
    autonomous = false;
  }

  $("#toggle-lid").on('touchstart', function() {
    toggleOpenLid();
  });

  $("#toggle-record").on('touchstart', function() {
    toggleRecord("c2c");
  });
  $("#toggle-record2").on('touchstart', function() {
    toggleRecord("crossing");
  });

  $("#load-settings").on('touchstart', function() {
    loadSettings();
  });

  $("#toogle-manual").on('touchstart', function() {
    manualControl = botMode != "local";
    autonomous = false;

    if (botMode != "local") {
      setTimeout(resetStates, 200);
    }
  });

  $("#toggle-autonomous").on('touchstart', function() {
    if (autoActive) {
      autonomous = botMode != "auto";
      manualControl = false;

      if (botMode != "auto") {
        setTimeout(resetStates, 200);
      }
    }
  });

  $("#increment-throttle").on('touchstart', function() {
    settings.throttle = Math.min(settings.throttle + 0.025, 1.0)
    $("#throttle-viewer").html(settings.throttle.toFixed(2));
  });

  $("#decrement-throttle").on('touchstart', function() {
    settings.throttle = Math.max(settings.throttle - 0.025, 0.0)
    $("#throttle-viewer").html(settings.throttle.toFixed(2));
  });

  $("#increment-steering").on('touchstart', function() {
    settings.steering_angle = Math.min(settings.steering_angle + 0.025, 2.0)
    $("#steering-viewer").html(settings.steering_angle.toFixed(2));
  });

  $("#decrement-steering").on('touchstart', function() {
    settings.steering_angle = Math.max(settings.steering_angle - 0.025, 0.0)
    $("#steering-viewer").html(settings.steering_angle.toFixed(2));
  });

  $("#toggle-enable-driving").on('touchstart', function() {
    enableDriving();
  });

  $("#select-network-branch").on('touchstart', function() {
    // console.log("select network_branch");

    $('#settings-modal').modal('close');

    submitSettings();

    data.network_branch = settings.network_branch;

    setTimeout(function() {
        delete data.network_branch;
      },
      1000
    );
  });




  $("#settings-modal").modal({
    complete: submitSettings
  });

  /////////////////
  // on page close
  /////////////////
  window.document.addEventListener("visibilitychange", function() {
    // console.log("visibilitychange");

    data.throttle = 0.0;
    data.steering_angle = 0.0;
    emit_data();
  });

  $(window).blur(function() {
    // console.log("blur");

    data.throttle = 0.0;
    data.steering_angle = 0.0;
    emit_data();
  });


  ///////////////////
  // SOCKETIO
  ///////////////////

  var socket = io();

  function emit_data() {

    data.auto_throttle = settings.throttle;
    data.auto_steering = settings.steering_angle;
    data.send_camera = settings.send_camera;
    data.call_corner_net = settings.call_corner_net;
    data.corner_threshold = settings.corner_threshold;
    data.call_api = settings.call_api;
    data.local = manualControl;
    data.autonomous = autonomous;
    data.enable_driving = enable_driving;

    // console.log([data.left_camera_num, data.center_camera_num, data.right_camera_num]);

    socket.emit("steer", data);

    if (data.network_branch) {
      console.log(data.network_branch);
    }

  }

  if (!settings.emit_on_callback) {
    window.setInterval(emit_data, settings.emit_interval);
  }

  var videoElem = $("#video");

  socket.on("telemetry", function(msg) {
    last_telemetry = new Date();

    if (msg.image) {
      videoElem.attr('src', "data:image/jpg;base64," + msg.image);
    }

    if (msg.steering) {
      $("#bot-steering").html(msg.steering);
    }

    if (msg.steering_angle) {
      $("#bot-steering").html(msg.steering_angle);
    }

    if (msg.space_left) {
      space = Number(msg.space_left);
      $("#spaceleft-viewer").html(space.toFixed(1) + "%");
    }

    if (msg.number_images) {
      $("#numberimages-viewer").html(msg.number_images);
    }


    if (msg.steering_angle || msg.steering || msg.corner_prob || msg.wall_crash_prob) {

      steering = Number(msg.steering || msg.steering_angle || steering);
      corner_prob = Number(msg.corner_prob || corner_prob);
      wall_crash_prob = Number(msg.wall_crash_prob || wall_crash_prob);

      var red, green, blue;
      steering = Math.min(Math.max(-1, steering), 1);

      if (steering > 0) {
        red = 255;
        green = Math.round((1 - steering) * 255);
        blue = Math.round((1 - steering) * 255);
      } else {
        steering = Math.abs(steering);

        red = Math.round((1 - steering) * 255);
        green = Math.round((1 - steering) * 255);
        blue = 255;
      }
      var color = "rgb(" + red + "," + green + "," + blue + ")";

      $("#bot-steering").html(steering.toFixed(2) + " " + corner_prob.toFixed(2) + " " + wall_crash_prob.toFixed(2));
      $("#bot-steering").css("background-color", color);
    }

    if (msg.left_camera) {
      $("#left-camera-label").html(msg.left_camera);
      $("#center-camera-label").html(msg.center_camera);
      $("#right-camera-label").html(msg.right_camera);
    }

    if (msg.mode) {
      botMode = msg.mode;

      if (msg.mode == "local") {
        $("#toogle-manual").css("background-color", "rgb(0,255,0)");
        $("#toggle-autonomous").css("background-color", "rgb(38, 166, 154)");
      } else if (msg.mode == "auto") {
        $("#toggle-autonomous").css("background-color", "rgb(0,255,0)");
        $("#toogle-manual").css("background-color", "rgb(38, 166, 154)");
      } else {
        $("#toggle-autonomous").css("background-color", "rgb(38, 166, 154)");
        $("#toogle-manual").css("background-color", "rgb(38, 166, 154)");
      }
    }

    if (msg.auto_active) {
      autoActive = msg.auto_active == "True";

      if (!autoActive) {
        $("#toggle-autonomous").css("background-color", "rgb(100, 100, 100)");
      } else if (autoActive && botMode != "auto") {
        $("#toggle-autonomous").css("background-color", "rgb(38, 166, 154)");
      }
    }

    if (msg.armed) {
      botArmed = msg.armed;

      if (msg.armed == "True") {
        $("#toggle-enable-driving").css("background-color", "rgb(38, 166, 154)");
      } else {
        $("#toggle-enable-driving").css("background-color", "rgb(255, 0, 0)");
      }
    }

    var toast_warning_message = 'Warning!';

    function removeWarningToasts() {
      $(".toast").each(function(index) {
        if ($(this).text() == toast_warning_message) {
          var toastInstance = this.M_Toast;
          toastInstance.remove();
        }
      });
    }

    if (msg.warning) {
      last_warning = new Date();

      if (msg.warning == "True" && !warning) {
        warning = true;
        Materialize.toast(toast_warning_message, 40000);
      } else if (msg.warning == "False" && warning) {
        warning = false;
        removeWarningToasts();
      }
    } else if (warning && (new Date() - last_warning) > 300) {
      warning = false;
      removeWarningToasts();
    }

    if (msg.info) {
      Materialize.toast(msg.info, 4000);
    }

    // console.log(Object.keys(msg));

    if (msg.recording) {
      msgRecording = msg.recording == "True";

      if (msgRecording != bot_recording) {
        bot_recording = msgRecording;
        var color_c2c = (bot_recording && record_mode == "c2c" ) ? "rgb(0,255,0)" : "rgb(38, 166, 154)";
        var color_crossing = (bot_recording && record_mode == "crossing" ) ? "rgb(0,255,0)" : "rgb(38, 166, 154)";
        $("#toggle-record").css("background-color", color_c2c);
        $("#toggle-record2").css("background-color", color_crossing);
      }
    }

    if (settings.emit_on_callback) {
      emit_data();
    }
  });

  ////////////////////
  // connection interval
  ////////////////////

  window.setInterval(() => {
    if ((new Date() - last_telemetry) > 2000) {
      $("#connection-status").removeClass("indigo");
      $("#connection-status").addClass("red");
    } else {
      $("#connection-status").removeClass("red");
      $("#connection-status").addClass("indigo");
    }

  }, 100);
});


////////////////////////
// functions
///////////////////////

function toggleOpenLid() {
  lid_opened = !lid_opened;
  data.lid_opened = lid_opened;
  var color = lid_opened ? "rgb(0,255,0)" : "rgb(38, 166, 154)";
  $("#toggle-lid").css("background-color", color);
}

function enableDriving(){
  enable_driving = botArmed != "True";

  setTimeout(() => {
    enable_driving = false;
  }, 200);
}

function toggleRecord(record_mod) {
  record_mode = record_mod;
  recording = !recording;
  data.recording = recording;
  data.record_mode = record_mod;
}



function enableNipples() {
  var radius = document.getElementById('left').offsetHeight;

  var leftOptions = {
    zone: document.getElementById('left'),
    mode: 'static',
    size: radius,
    position: {
      left: "50%",
      top: "35%"
    },
    dataOnly: !joystick_visible
  };
  var rightOptions = {
    zone: document.getElementById('right'),
    mode: 'static',
    size: radius,
    position: {
      right: "25%",
      top: "35%"
    },
    dataOnly: !joystick_visible
  };

  leftNipple = nipplejs.create(leftOptions);
  rightNipple = nipplejs.create(rightOptions);

  rightNipple.on('move', function(evt, d) {
    var new_throttle = (d.distance * Math.sin(d.angle.radian) * 2) / leftNipple.options.size;
    set_throttle(data, settings, new_throttle);
  });
  rightNipple.on('end', function(evt, d) {
    data.throttle = 0;
  });

  leftNipple.on('move', function(evt, d) {
    var new_steering_angle = (d.distance * Math.cos(d.angle.radian) * 2) / rightNipple.options.size;
    set_steering_angle(new_steering_angle, data);
  });

  leftNipple.on('end', function(evt, d) {
    data.steering_angle = 0;
  });
}

function readUrlParams() {
  var params = new URLSearchParams(window.location.search);

  if (params.get("emit-interval"))
    settings.emit_interval = Number(params.get("emit-interval"));
  if (params.get("corner-threshold"))
    settings.corner_threshold = Number(params.get("corner-threshold"));
  if (params.get("steering-angle"))
    settings.steering_angle = Number(params.get("steering-angle"));
  if (params.get("throttle"))
    settings.throttle = Number(params.get("throttle"));
  if (params.get("stick-radius"))
    settings.stickRadius = Number(params.get("stick-radius"));
  if (params.get("power"))
    settings.power = Number(params.get("power"));
}



function loadSettings() {
  // open modal
  $('#settings-modal').modal('open');

  //load settings

  $("#send-camera").prop('checked', settings.send_camera);
  $("#call-corner-net").prop('checked', settings.call_corner_net);
  $("#call-api").prop('checked', settings.call_api);
  $("#emit-interval").val(String(settings.emit_interval));
  $("#corner-threshold").val(String(settings.corner_threshold));
  $("#steering").val(String(settings.steering_angle));
  $("#throttle-viewer").html(settings.throttle.toFixed(2));
  $("#steering-viewer").html(settings.steering_angle.toFixed(2));
  $("#throttle").val(String(settings.throttle));
  $("#stick-radius").val(String(settings.stickRadius));
  $("#power").val(String(settings.power));

  $("#left-camera").val(String(settings.cameras.left));
  $("#center-camera").val(String(settings.cameras.center));
  $("#right-camera").val(String(settings.cameras.right));


  $("#emit-interval").trigger("autoresize");
  $("#corner-threshold").trigger("autoresize");
  $("#steering").trigger("autoresize");
  $("#throttle").trigger("autoresize");
  $("#stick-radius").trigger("autoresize");
  $("#power").trigger("autoresize");

  //update materialize
  Materialize.updateTextFields();
  $('select').material_select();

  // request cameras info
  data.calibrate_cameras = true;


}

function submitSettings() {
  // stop camera info request
  delete data.calibrate_cameras;

  //
  var stickRadius = settings.stickRadius;
  var emit_on_callback = settings.emit_on_callback;
  var left_camera = settings.cameras.left;
  var center_camera = settings.cameras.center;
  var right_camera = settings.cameras.right;

  // console.log("Setting settings");

  settings.send_camera = $("#send-camera").is(":checked");
  settings.call_corner_net = $("#call-corner-net").is(":checked");
  settings.call_api = $("#call-api").is(":checked");
  settings.emit_interval = Number($("#emit-interval").val());
  settings.corner_threshold = Number($("#corner-threshold").val());
  settings.steering_angle = Number($("#steering").val());
  settings.throttle = Number($("#throttle").val());
  settings.stickRadius = Number($("#stick-radius").val());
  settings.power = Number($("#power").val());

  settings.cameras.left = Number($("#left-camera").val());
  settings.cameras.center = Number($("#center-camera").val());
  settings.cameras.right = Number($("#right-camera").val());

  settings.network_branch = String($("#network-branch").val());

  localStorage.setItem("settings", JSON.stringify(settings));

  $("#throttle-viewer").html(settings.throttle.toFixed(2));
  $("#steering-viewer").html(settings.steering_angle.toFixed(2));

  if (stickRadius != settings.stickRadius) {
    onResize();
  }

  if (emit_on_callback != settings.emit_on_callback) {
    location.reload();
    // console.log("emit_on_callback change");
  }

  if (settings.cameras.left != left_camera || settings.cameras.center != center_camera || settings.cameras.right != right_camera) {
    data.left_camera_num = settings.cameras.left;
    data.center_camera_num = settings.cameras.center;
    data.right_camera_num = settings.cameras.right;

    setTimeout(function() {
        delete data.left_camera_num;
        delete data.center_camera_num;
        delete data.right_camera_num;
      },
      1000
    );
  }
}

//Enable nav bar
$(".button-collapse").sideNav();
$('select').material_select();
