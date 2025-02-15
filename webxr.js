(function () {
  'use strict';

  function XRData() {
    this.leftProjectionMatrix = mat4.create();
    this.rightProjectionMatrix = mat4.create();
    this.leftViewMatrix = mat4.create();
    this.rightViewMatrix = mat4.create();
    this.sitStandMatrix = mat4.create();
    this.gamepads = [];
    this.controllerA = new XRControllerData();
    this.controllerB = new XRControllerData();
    this.handLeft = new XRHandData();
    this.handRight = new XRHandData();
    this.viewerHitTestPose = new XRHitPoseData();
    this.frameNumber = 0;
    this.touchIDs = [];
    this.touches = [];
    this.CreateTouch = function (pageElement, xPercentage, yPercentage) {
      let touchID = 0;
      while (this.touchIDs.includes(touchID))
      {
        touchID++;
      }
      let touch = new XRTouch(touchID, pageElement, xPercentage, yPercentage);
      this.touchIDs.push(touchID);
      this.touches.push(touch);
      return touch;
    }
    this.RemoveTouch = function (touch) {
      touch.ended = true;
      this.touchIDs = this.touchIDs.filter(function(item) {
        return item !== touch.identifier
      });
      this.touches = this.touches.filter(function(item) {
        return item !== touch
      });
    }
    this.SendTouchEvent = function(JSEventsObject, eventID, eventName, target, changedTouches) {
      let touchEvent = new XRTouchEvent(eventName, target, this.touches, this.touches, changedTouches);
      JSEventsObject.eventHandlers[eventID].eventListenerFunc(touchEvent);
    }
  }
  
  function XRControllerData() {
    this.frame = 0;
    // TODO: set enabled 0 if controller was enable and then disable
    this.enabled = 0;
    this.hand = 0;
    this.positionX = 0;
    this.positionY = 0;
    this.positionZ = 0;
    this.rotationX = 0;
    this.rotationY = 0;
    this.rotationZ = 0;
    this.rotationW = 0;
    this.trigger = 0;
    this.squeeze = 0;
    this.thumbstick = 0;
    this.thumbstickX = 0;
    this.thumbstickY = 0;
    this.touchpad = 0;
    this.touchpadX = 0;
    this.touchpadY = 0;
    this.buttonA = 0;
    this.buttonB = 0;
    this.gamepad = null;
    this.profiles = [];
    this.updatedProfiles = 0;
  }

  function XRHandData() {
    this.frame = 0;
    // TODO: set enabled 0 if hand was enable and then disable
    this.enabled = 0;
    this.hand = 0;
    this.trigger = 0;
    this.squeeze = 0;
    this.joints = [];
    for (let i = 0; i < 25; i++) {
      this.joints.push(new XRJointData());
    }
    this.poses = new Float32Array(16 * 25);
    this.radii = new Float32Array(25);
    this.jointQuaternion = new Float32Array(4);
    this.jointIndex = 0;
  }

  function XRJointData() {
    this.enabled = 0;
    this.position = [0, 0, 0];
    this.rotation = [0, 0, 0, 1];
    this.radius = 0;
  }

  function XRHitPoseData() {
    this.frame = 0;
    this.available = 0;
    this.position = [0, 0, 0];
    this.rotation = [0, 0, 0, 1];
  }

  function lerp(start, end, percentage)
  {
    return start + (end - start) * percentage;
  }

  function XRTouch(touchID, pageElement, xPercentage, yPercentage) {
    this.identifier = touchID;
    this.ended = false;
    let rect = pageElement.getBoundingClientRect();
    // It was pageElement.size / window.devicePixelRatio, but now we treat devicePixelRatio in XR session as 1
    this.clientX = lerp(rect.left, rect.left + pageElement.width / 1, xPercentage);
    this.clientY = lerp(rect.top, rect.top + pageElement.height / 1, yPercentage);
    this.layerX = this.clientX;
    this.layerY = this.clientY;
    this.offsetX = this.clientX;
    this.offsetY = this.clientY;
    this.pageX = this.clientX;
    this.pageY = this.clientY;
    this.x = this.clientX;
    this.y = this.clientY;
    this.screenX = this.clientX;
    this.screenY = this.clientY;
    this.movementX = 0; // diff between movements
    this.movementY = 0; // diff between movements
    this.UpdateTouch = function (pageElement, xPercentage, yPercentage) {
      let rect = pageElement.getBoundingClientRect();
      let newClientX = lerp(rect.left, rect.left + pageElement.width / 1, xPercentage);
      let newClientY = lerp(rect.top, rect.top + pageElement.height / 1, yPercentage);
      this.movementX = newClientX-this.clientX;
      this.movementY = newClientY-this.clientY;
      this.clientX = newClientX;
      this.clientY = newClientY;
      this.layerX = this.clientX;
      this.layerY = this.clientY;
      this.offsetX = this.clientX;
      this.offsetY = this.clientY;
      this.pageX = this.clientX;
      this.pageY = this.clientY;
      this.x = this.clientX;
      this.y = this.clientY;
      this.screenX = this.clientX;
      this.screenY = this.clientY;
    }
    this.HasMovement = function () {
      return (this.movementX != 0 || this.movementY != 0);
    }
    this.ResetMovement = function () {
      this.movementX = 0;
      this.movementY = 0;
    }
  }
  
  function XRTouchEvent(eventName, target, touches, targetTouchs, changedTouches) {
    this.type = eventName;
    this.target = target;
    this.touches = touches;
    this.targetTouches = targetTouchs;
    this.changedTouches = changedTouches;
    this.ctrlKey = false;
    this.altKey = false;
    this.metaKey = false;
    this.shiftKey = false;
    this.preventDefault = function () {};
  }

  function XRManager() {
    this.xrSession = null;
    this.viewerSpace = null;
    this.viewerHitTestSource = null;
    this.xrData = new XRData();
    this.canvas = null;
    this.ctx = null;
    this.gameModule = null;
    this.polyfill = null;
    this.didNotifyUnity = false;
    this.isARSupported = false;
    this.isVRSupported = false;
    this.onInputEvent = null;
    this.BrowserObject = null;
    this.JSEventsObject = null;
    this.init();
  }

  XRManager.prototype.init = async function () {
    if (window.WebXRPolyfill) {
      this.polyfill = new WebXRPolyfill();
    }
    
    this.attachEventListeners();

    navigator.xr.isSessionSupported('immersive-vr').then((supported) => {
      this.isVRSupported = supported;
      if (document.body.dataset.unityLoaded)
      {
        document.dispatchEvent(new CustomEvent('onVRSupportedCheck', { detail:{supported:this.isVRSupported} }));
        this.UpdateXRCapabilities();
      }
    });

    navigator.xr.isSessionSupported('immersive-ar').then((supported) => {
      this.isARSupported = supported;
      if (document.body.dataset.unityLoaded)
      {
        document.dispatchEvent(new CustomEvent('onARSupportedCheck', { detail:{supported:this.isARSupported} }));
        this.UpdateXRCapabilities();
      }
    });
  }


  XRManager.prototype.attachEventListeners = function () {
    var onToggleAr = this.toggleAr.bind(this);
    var onToggleVr = this.toggleVr.bind(this);
    var onUnityLoaded = this.unityLoaded.bind(this);
    var onToggleHitTest = this.toggleHitTest.bind(this);
    var onCallHapticPulse = this.hapticPulse.bind(this);

    // dispatched by index.html
    document.addEventListener('UnityLoaded', onUnityLoaded, false);

    document.addEventListener('toggleAR', onToggleAr, false);
    document.addEventListener('toggleVR', onToggleVr, false);

    document.addEventListener('toggleHitTest', onToggleHitTest, false);
    document.addEventListener('callHapticPulse', onCallHapticPulse, false);
  }

  XRManager.prototype.onRequestARSession = function () {
    if (!this.isARSupported) return;
    this.BrowserObject.pauseAsyncCallbacks();
    this.BrowserObject.mainLoop.pause();
    var thisXRMananger = this;
    var tempRender = function () {
      thisXRMananger.ctx.clearColor(0, 0, 0, 0);
      thisXRMananger.ctx.clear(thisXRMananger.ctx.COLOR_BUFFER_BIT | thisXRMananger.ctx.DEPTH_BUFFER_BIT);
    }
    window.requestAnimationFrame( tempRender );
    navigator.xr.requestSession('immersive-ar', {
      requiredFeatures: this.gameModule.WebXR.Settings.ARRequiredReferenceSpace,
      optionalFeatures: this.gameModule.WebXR.Settings.AROptionalFeatures
    }).then(async (session) => {
      session.isImmersive = true;
      session.isInSession = true;
      session.isAR = true;
      this.xrSession = session;
      this.onSessionStarted(session);
    }).catch((error) => {
      this.BrowserObject.resumeAsyncCallbacks();
      this.BrowserObject.mainLoop.resume();
    });
  }

  XRManager.prototype.onRequestVRSession = function () {
    if (!this.isVRSupported) return;
    this.BrowserObject.pauseAsyncCallbacks();
    this.BrowserObject.mainLoop.pause();
    var thisXRMananger = this;
    var tempRender = function () {
      thisXRMananger.ctx.clearColor(0, 0, 0, 0);
      thisXRMananger.ctx.clear(thisXRMananger.ctx.COLOR_BUFFER_BIT | thisXRMananger.ctx.DEPTH_BUFFER_BIT);
    }
    window.requestAnimationFrame( tempRender );
    navigator.xr.requestSession('immersive-vr', {
      requiredFeatures: this.gameModule.WebXR.Settings.VRRequiredReferenceSpace,
      optionalFeatures: this.gameModule.WebXR.Settings.VROptionalFeatures
    }).then(async (session) => {
      session.isImmersive = true;
      session.isInSession = true;
      session.isAR = false;
      this.xrSession = session;
      this.onSessionStarted(session);
    }).catch((error) => {
      this.BrowserObject.resumeAsyncCallbacks();
      this.BrowserObject.mainLoop.resume();
    });
  }

  XRManager.prototype.exitXRSession = function () {
    if (!this.xrSession || !this.xrSession.isInSession) {
      console.warn('No XR display to exit XR mode');
      return;
    }

    this.xrSession.end();
  }

  XRManager.prototype.onEndSession = function (xrSessionEvent) {
    if (xrSessionEvent.session) {
      xrSessionEvent.session.isInSession = false;
      xrSessionEvent.session.removeEventListener('select', this.onInputEvent);
      xrSessionEvent.session.removeEventListener('selectstart', this.onInputEvent);
      xrSessionEvent.session.removeEventListener('selectend', this.onInputEvent);
      xrSessionEvent.session.removeEventListener('squeeze', this.onInputEvent);
      xrSessionEvent.session.removeEventListener('squeezestart', this.onInputEvent);
      xrSessionEvent.session.removeEventListener('squeezeend', this.onInputEvent);
    }

    if (this.viewerHitTestSource) {
      this.viewerHitTestSource.cancel();
      this.viewerHitTestSource = null;
    }
    
    this.removeRemainingTouches();

    this.xrData.controllerA.enabled = 0;
    this.xrData.controllerB.enabled = 0;
    this.xrData.handLeft.enabled = 0;
    this.xrData.handRight.enabled = 0;

    this.xrData.controllerA.frame = -1;
    this.xrData.controllerB.frame = -1;
    this.xrData.handLeft.frame = -1;
    this.xrData.handRight.frame = -1;

    document.dispatchEvent(new CustomEvent('XRControllersData', { detail: {
      controllerA: this.xrData.controllerA,
      controllerB: this.xrData.controllerB
    }}));

    document.dispatchEvent(new CustomEvent('XRHandsData', { detail: {
      handLeft: this.xrData.handLeft,
      handRight: this.xrData.handRight
    }}));
    
    this.gameModule.WebXR.OnEndXR();
    this.didNotifyUnity = false;
    this.canvas.width = this.canvas.parentElement.clientWidth * this.gameModule.asmLibraryArg._JS_SystemInfo_GetPreferredDevicePixelRatio();
    this.canvas.height = this.canvas.parentElement.clientHeight * this.gameModule.asmLibraryArg._JS_SystemInfo_GetPreferredDevicePixelRatio();
    
    this.BrowserObject.pauseAsyncCallbacks();
    this.BrowserObject.mainLoop.pause();
    this.ctx.bindFramebuffer(this.ctx.FRAMEBUFFER);
    var thisXRMananger = this;
    window.setTimeout(function () {
      thisXRMananger.BrowserObject.resumeAsyncCallbacks();
      thisXRMananger.BrowserObject.mainLoop.resume();
    });
  }
  
  XRManager.prototype.removeRemainingTouches = function () {
    while (this.xrData.touches.length > 0)
    {
      let touch = this.xrData.touches[0];
      this.xrData.RemoveTouch(touch);
      this.xrData.SendTouchEvent(this.JSEventsObject, 8, "touchend", this.canvas, [touch]);
    }
  }
  
  XRManager.prototype.onInputSourceEvent = function (xrInputSourceEvent) {
    if (xrInputSourceEvent.type && xrInputSourceEvent.inputSource
        && xrInputSourceEvent.inputSource.handedness != 'none') {
      var hand = 0;
      var inputSource = xrInputSourceEvent.inputSource;
      var xrData = this.xrData;
      var controller = this.xrData.controllerA;
      if (inputSource.handedness == 'left') {
          hand = 1;
          controller = this.xrData.controllerB;
      } else if (inputSource.handedness == 'right') {
          hand = 2;
      }
      
      controller.enabled = 1;
      controller.hand = hand;
      
      switch (xrInputSourceEvent.type) {
        case "select":
          controller.trigger = 1;
          break;
        case "selectstart":
          controller.trigger = 1;
          break;
        case "selectend":
          controller.trigger = 0;
          break;
        case "squeeze":
          controller.squeeze = 1;
          break;
        case "squeezestart":
          controller.squeeze = 1;
          break;
        case "squeezeend":
          controller.squeeze = 0;
          break;
      }
      
      if (hand == 0 || hand == 2) {
        xrData.controllerA = controller;
        xrData.handRight.trigger = controller.trigger;
        xrData.handRight.squeeze = controller.squeeze;
      } else {
        xrData.controllerB = controller;
        xrData.handLeft.trigger = controller.trigger;
        xrData.handLeft.squeeze = controller.squeeze;
      }
    } else {
      let xPercentage = 0.5;
      let yPercentage = 0.5;
      let inputSource = xrInputSourceEvent.inputSource;
      if (inputSource) {
        if (inputSource.gamepad &&
            inputSource.gamepad.axes) {
          xPercentage = (inputSource.gamepad.axes[0] + 1.0) * 0.5;
          yPercentage = (inputSource.gamepad.axes[1] + 1.0) * 0.5;
        }
        switch (xrInputSourceEvent.type) {
          case "select": // 9 touchmove
            // no need to call touchmove here
            break;
          case "selectstart": // 7 touchstart
            inputSource.xrTouchObject = this.xrData.CreateTouch(this.canvas, xPercentage, yPercentage);
            this.xrData.SendTouchEvent(this.JSEventsObject, 7, "touchstart", this.canvas, [inputSource.xrTouchObject])
            break;
          case "selectend": // 8 touchend
            this.xrData.RemoveTouch(inputSource.xrTouchObject);
            this.xrData.SendTouchEvent(this.JSEventsObject, 8, "touchend", this.canvas, [inputSource.xrTouchObject]);
            inputSource.xrTouchObject = null;
            break;
        }
      }
    }
  }

  XRManager.prototype.toggleAr = function () {
    if (!this.gameModule)
    {
      return;
    }
    if (this.xrSession && this.xrSession.isInSession) {
      this.exitXRSession();
    } else {
      this.onRequestARSession();
    }
  }

  XRManager.prototype.toggleVr = function () {
    if (!this.gameModule)
    {
      return;
    }
    if (this.xrSession && this.xrSession.isInSession) {
      this.exitXRSession();
    } else {
      this.onRequestVRSession();
    }
  }

  XRManager.prototype.toggleHitTest = function () {
    if (!this.gameModule)
    {
      return;
    }
    if (this.xrSession && this.xrSession.isInSession && this.xrSession.isAR) {
      if (this.viewerHitTestSource) {
        this.viewerHitTestSource.cancel();
        this.viewerHitTestSource = null;
      } else {
        this.xrSession.requestReferenceSpace('local').then((refSpace) => {
          this.xrSession.localRefSpace = refSpace;
        });
        this.xrSession.requestReferenceSpace('viewer').then((refSpace) => {
          this.viewerSpace = refSpace;
          this.xrSession.requestHitTestSource({space: this.viewerSpace}).then((hitTestSource) => {
            this.viewerHitTestSource = hitTestSource;
          });
        });
      }
    }
  }
  
  XRManager.prototype.hapticPulse = function (hapticPulseAction) {
    let controller = null;
    switch(hapticPulseAction.detail.controller)
    {
      case 0:
      case 2:
        controller = this.xrData.controllerA;
        break;
      case 1:
        controller = this.xrData.controllerB;
        break;
    }
    if (controller && controller.enabled == 1 && controller.gamepad && controller.gamepad.hapticActuators && controller.gamepad.hapticActuators.length > 0)
    {
      controller.gamepad.hapticActuators[0].pulse(hapticPulseAction.detail.intensity, hapticPulseAction.detail.duration);
    }
  }

  XRManager.prototype.setGameModule = function (gameModule) {
    if (gameModule && !this.gameModule) {
      this.gameModule = gameModule;
      this.canvas = this.gameModule.canvas;
      this.ctx = this.gameModule.ctx;

      var thisXRMananger = this;
      this.JSEventsObject = this.gameModule.WebXR.GetJSEventsObject();
      this.BrowserObject = this.gameModule.WebXR.GetBrowserObject();
      this.BrowserObject.requestAnimationFrame = function (func) {
        if (thisXRMananger.xrSession && thisXRMananger.xrSession.isInSession) {
          return thisXRMananger.xrSession.requestAnimationFrame((time, xrFrame) =>
          {
            thisXRMananger.animate(xrFrame);
            func(time);
          });
        } else {
          window.requestAnimationFrame(func);
        }
      };

      // bindFramebuffer frameBufferObject null in XRSession should use XRWebGLLayer FBO instead
      this.ctx.bindFramebuffer = (oldBindFramebuffer => function bindFramebuffer(target, fbo) {
        if (!fbo) {
          if (thisXRMananger.xrSession && thisXRMananger.xrSession.isInSession) {
            if (thisXRMananger.xrSession.renderState.baseLayer) {
              fbo = thisXRMananger.xrSession.renderState.baseLayer.framebuffer;
            }
          }
        }
        return oldBindFramebuffer.call(this, target, fbo);
      })(this.ctx.bindFramebuffer);
    }
  }

  XRManager.prototype.unityLoaded = function (event) {
    document.body.dataset.unityLoaded = 'true';

    this.setGameModule(event.detail.module);

    document.dispatchEvent(new CustomEvent('onARSupportedCheck', { detail:{supported:this.isARSupported} }));
    document.dispatchEvent(new CustomEvent('onVRSupportedCheck', { detail:{supported:this.isVRSupported} }));

    this.UpdateXRCapabilities();
    
    this.onInputEvent = this.onInputSourceEvent.bind(this);
  }

  XRManager.prototype.UpdateXRCapabilities = function() {
    // Send browser capabilities to Unity.
    this.gameModule.WebXR.OnXRCapabilities(
      JSON.stringify({
        canPresentAR: this.isARSupported,
        canPresentVR: this.isVRSupported,
        hasPosition: true, // TODO: check this
        hasExternalDisplay: false // TODO: check this
      })
    );
  }
  
  // http://answers.unity.com/answers/11372/view.html
  XRManager.prototype.quaternionFromMatrix = function(offset, matrix, quaternion) {
    quaternion[3] = Math.sqrt( Math.max( 0, 1 + matrix[offset+0] + matrix[offset+5] + matrix[offset+10] ) ) / 2; 
    quaternion[0] = Math.sqrt( Math.max( 0, 1 + matrix[offset+0] - matrix[offset+5] - matrix[offset+10] ) ) / 2; 
    quaternion[1] = Math.sqrt( Math.max( 0, 1 - matrix[offset+0] + matrix[offset+5] - matrix[offset+10] ) ) / 2; 
    quaternion[2] = Math.sqrt( Math.max( 0, 1 - matrix[offset+0] - matrix[offset+5] + matrix[offset+10] ) ) / 2; 
    quaternion[0] *= Math.sign( quaternion[0] * ( matrix[offset+6] - matrix[offset+9] ) );
    quaternion[1] *= Math.sign( quaternion[1] * ( matrix[offset+8] - matrix[offset+2] ) );
    quaternion[2] *= Math.sign( quaternion[2] * ( matrix[offset+1] - matrix[offset+4] ) );
  }
  
  XRManager.prototype.getXRControllersData = function(frame, inputSources, refSpace, xrData) {
    xrData.handLeft.enabled = 0;
    xrData.handRight.enabled = 0;
    xrData.controllerA.enabled = 0;
    xrData.controllerB.enabled = 0;
    xrData.handLeft.frame = xrData.frameNumber;
    xrData.handRight.frame = xrData.frameNumber;
    xrData.controllerA.frame = xrData.frameNumber;
    xrData.controllerB.frame = xrData.frameNumber;
    if (!inputSources || !inputSources.length || inputSources.length == 0) {
      this.removeRemainingTouches();
      return;
    }
    let touchesToSend = [];
    for (var i = 0; i < inputSources.length; i++) {
      let inputSource = inputSources[i];
      // Show the input source if it has a grip space
      if (inputSource.hand) {
        var xrHand = xrData.handLeft;
        xrHand.hand = 1;
        if (inputSource.handedness == 'right') {
          xrHand = xrData.handRight;
          xrHand.hand = 2;
        }
        xrHand.enabled = 1;
        frame.fillPoses(inputSource.hand, refSpace, xrHand.poses);
        frame.fillJointRadii(inputSource.hand, xrHand.radii);
        for (let j = 0; j < 25; j++) {
          xrHand.jointIndex = j*16;
          if (!isNaN(xrHand.poses[xrHand.jointIndex])) {
            xrHand.joints[j].enabled = 1;
            xrHand.joints[j].position[0] = xrHand.poses[xrHand.jointIndex+12];
            xrHand.joints[j].position[1] = xrHand.poses[xrHand.jointIndex+13];
            xrHand.joints[j].position[2] = -xrHand.poses[xrHand.jointIndex+14];
            this.quaternionFromMatrix(xrHand.jointIndex, xrHand.poses, xrHand.jointQuaternion);
            xrHand.joints[j].rotation[0] = -xrHand.jointQuaternion[0];
            xrHand.joints[j].rotation[1] = -xrHand.jointQuaternion[1];
            xrHand.joints[j].rotation[2] = xrHand.jointQuaternion[2];
            xrHand.joints[j].rotation[3] = xrHand.jointQuaternion[3];
            if (!isNaN(xrHand.radii[j])) {
              xrHand.joints[j].radius = xrHand.radii[j];
            }
          }
        }
      } else if (inputSource.gripSpace) {
        let inputPose = frame.getPose(inputSource.gripSpace, refSpace);
        if (inputPose) {
          var position = inputPose.transform.position;
          var orientation = inputPose.transform.orientation;
          var hand = 0;
          var controller = xrData.controllerA;
          if (inputSource.handedness == 'left') {
            hand = 1;
            controller = xrData.controllerB;
          } else if (inputSource.handedness == 'right') {
            hand = 2;
          }
          
          controller.enabled = 1;
          controller.hand = hand;

          if (controller.updatedProfiles == 0)
          {
            controller.profiles = inputSource.profiles;
            controller.updatedProfiles = 1;
          }
          
          controller.positionX = position.x;
          controller.positionY = position.y;
          controller.positionZ = -position.z;
          
          controller.rotationX = -orientation.x;
          controller.rotationY = -orientation.y;
          controller.rotationZ = orientation.z;
          controller.rotationW = orientation.w;
          
          // if there's gamepad, use the xr-standard mapping
          // TODO: check for profiles
          if (inputSource.gamepad) {
            for (var j = 0; j < inputSource.gamepad.buttons.length; j++) {
              switch (j) {
                case 0:
                  controller.trigger = inputSource.gamepad.buttons[j].value;
                  break;
                case 1:
                  controller.squeeze = inputSource.gamepad.buttons[j].value;
                  break;
                case 2:
                  controller.touchpad = inputSource.gamepad.buttons[j].value;
                  break;
                case 3:
                  controller.thumbstick = inputSource.gamepad.buttons[j].value;
                  break;
                case 4:
                  controller.buttonA = inputSource.gamepad.buttons[j].value;
                  break;
                case 5:
                  controller.buttonB = inputSource.gamepad.buttons[j].value;
                  break;
              }
            }
            
            if (controller.trigger <= 0.02) {
              controller.trigger = 0;
            } else if (controller.trigger >= 0.98) {
              controller.trigger = 1;
            }
            
            if (controller.squeeze <= 0.02) {
              controller.squeeze = 0;
            } else if (controller.squeeze >= 0.98) {
              controller.squeeze = 1;
            }
            
            for (var j = 0; j < inputSource.gamepad.axes.length; j++) {
              switch (j) {
                case 0:
                  controller.touchpadX = inputSource.gamepad.axes[j];
                  break;
                case 1:
                  controller.touchpadY = -inputSource.gamepad.axes[j];
                  break;
                case 2:
                  controller.thumbstickX = inputSource.gamepad.axes[j];
                  break;
                case 3:
                  controller.thumbstickY = -inputSource.gamepad.axes[j];
                  break;
              }
            }
          }
          controller.gamepad = inputSource.gamepad;
          
          if (hand == 0 || hand == 2) {
            xrData.controllerA = controller;
          } else {
            xrData.controllerB = controller;
          }
        }
      } else if (inputSource.xrTouchObject && !inputSource.xrTouchObject.ended && inputSource.gamepad && inputSource.gamepad.axes) {
        inputSource.xrTouchObject.UpdateTouch( this.canvas,
                                               (inputSource.gamepad.axes[0] + 1.0) * 0.5,
                                               (inputSource.gamepad.axes[1] + 1.0) * 0.5);
        if (inputSource.xrTouchObject.HasMovement()) {
          touchesToSend.push(inputSource.xrTouchObject);
        }
      }
    }
    if (touchesToSend.length > 0) {
      this.xrData.SendTouchEvent(this.JSEventsObject, 9, "touchmove", this.canvas, touchesToSend);
      for (var i = 0; i < touchesToSend.length; i++) {
        touchesToSend[i].ResetMovement();
      }
    }
  }

  // Convert WebGL to Unity compatible Vector3
  XRManager.prototype.GLVec3ToUnity = function(v) {
    v[2] *= -1;
    return v;
  }

  // Convert WebGL to Unity compatible Quaternion
  XRManager.prototype.GLQuaternionToUnity = function(q) {
    q[0] *= -1;
    q[1] *= -1;
    return q;
  }

  // Convert WebGL to Unity Projection Matrix4
  XRManager.prototype.GLProjectionToUnity = function(m) {
    var out = mat4.create();
    mat4.copy(out, m)
    mat4.transpose(out, out);
    return out;
  }

  // Convert WebGL to Unity View Matrix4
  XRManager.prototype.GLViewToUnity = function(m) {
    var out = mat4.create();
    mat4.copy(out, m);
    mat4.transpose(out, out);
    out[2] *= -1;
    out[6] *= -1;
    out[10] *= -1;
    out[14] *= -1;
    return out;
  }

  XRManager.prototype.onSessionStarted = function (session) {
    let glLayer = new XRWebGLLayer(session, this.ctx);
    session.updateRenderState({ baseLayer: glLayer });
    
    
    
    let refSpaceType = 'viewer';
    if (session.isImmersive) {
      refSpaceType = this.gameModule.WebXR.Settings.VRRequiredReferenceSpace[0];
      if (session.isAR) {
        refSpaceType = this.gameModule.WebXR.Settings.ARRequiredReferenceSpace[0];
      }

      var onSessionEnded = this.onEndSession.bind(this);
      session.addEventListener('end', onSessionEnded);

      this.canvas.width = glLayer.framebufferWidth;
      this.canvas.height = glLayer.framebufferHeight;
      
      session.addEventListener('select', this.onInputEvent);
      session.addEventListener('selectstart', this.onInputEvent);
      session.addEventListener('selectend', this.onInputEvent);
      session.addEventListener('squeeze', this.onInputEvent);
      session.addEventListener('squeezestart', this.onInputEvent);
      session.addEventListener('squeezeend', this.onInputEvent);

      this.xrData.controllerA.updatedProfiles = 0;
      this.xrData.controllerB.updatedProfiles = 0;
      this.xrData.controllerA.profiles = [];
      this.xrData.controllerB.profiles = [];
    }
    
    session.requestReferenceSpace(refSpaceType).then((refSpace) => {
      session.refSpace = refSpace;
      this.BrowserObject.resumeAsyncCallbacks();
      this.BrowserObject.mainLoop.resume();
    });
  }

  XRManager.prototype.animate = function (frame) {
    let session = frame.session;
    if (!session) {
      return;
    }
    
    let glLayer = session.renderState.baseLayer;
    
    if (this.canvas.width != glLayer.framebufferWidth ||
        this.canvas.height != glLayer.framebufferHeight)
    {
      this.canvas.width = glLayer.framebufferWidth;
      this.canvas.height = glLayer.framebufferHeight;
    }
    
    this.ctx.bindFramebuffer(this.ctx.FRAMEBUFFER, glLayer.framebuffer);
    if (session.isAR) {
      this.ctx.dontClearOnFrameStart = true;
      this.ctx.clear(this.ctx.STENCIL_BUFFER_BIT | this.ctx.DEPTH_BUFFER_BIT);
    } else {
      this.ctx.clear(this.ctx.COLOR_BUFFER_BIT | this.ctx.DEPTH_BUFFER_BIT);
    }
    
    let pose = frame.getViewerPose(session.refSpace);
    if (!pose) {
      return;
    }

    if (!session.isImmersive)
    {
      return;
    }

    var xrData = this.xrData;
    xrData.frameNumber++;

    for (let view of pose.views) {
      if (view.eye === 'left') {
        xrData.leftProjectionMatrix = this.GLProjectionToUnity(view.projectionMatrix);
        xrData.leftViewMatrix = this.GLViewToUnity(view.transform.inverse.matrix);
      } else if (view.eye === 'right') {
        xrData.rightProjectionMatrix = this.GLProjectionToUnity(view.projectionMatrix);
        xrData.rightViewMatrix = this.GLViewToUnity(view.transform.inverse.matrix);
      }
    }

    this.getXRControllersData(frame, session.inputSources, session.refSpace, xrData);

    if (session.isAR && this.viewerHitTestSource) {
      xrData.viewerHitTestPose.frame = xrData.frameNumber;
      let viewerHitTestResults = frame.getHitTestResults(this.viewerHitTestSource);
      if (viewerHitTestResults.length > 0) {
        let hitTestPose = viewerHitTestResults[0].getPose(session.localRefSpace);
        xrData.viewerHitTestPose.available = 1;
        xrData.viewerHitTestPose.position[0] = hitTestPose.transform.position.x;
        let hitTestPoseBase = viewerHitTestResults[0].getPose(session.refSpace); // Ugly hack for y position on Samsung Internet
        xrData.viewerHitTestPose.position[1] = hitTestPose.transform.position.y + Math.abs(hitTestPose.transform.position.y - hitTestPoseBase.transform.position.y);
        xrData.viewerHitTestPose.position[2] = -hitTestPose.transform.position.z;
        xrData.viewerHitTestPose.rotation[0] = -hitTestPose.transform.orientation.x;
        xrData.viewerHitTestPose.rotation[1] = -hitTestPose.transform.orientation.y;
        xrData.viewerHitTestPose.rotation[2] = hitTestPose.transform.orientation.z;
        xrData.viewerHitTestPose.rotation[3] = hitTestPose.transform.orientation.w;
      } else {
        xrData.viewerHitTestPose.available = 0;
      }
      document.dispatchEvent(new CustomEvent('XRViewerHitTestPose', { detail: {
        viewerHitTestPose: xrData.viewerHitTestPose
      }}));
    }

    if (xrData.controllerA.updatedProfiles == 1 || xrData.controllerB.updatedProfiles == 1)
    {
      let inputProfiles = {};
      inputProfiles.conrtoller1 = xrData.controllerA.profiles;
      inputProfiles.conrtoller2 = xrData.controllerB.profiles;
      if (xrData.controllerA.updatedProfiles == 1)
      {
        xrData.controllerA.updatedProfiles = 2;
      }
      if (xrData.controllerB.updatedProfiles == 1)
      {
        xrData.controllerB.updatedProfiles = 2;
      }
      this.gameModule.WebXR.OnInputProfiles(JSON.stringify(inputProfiles));
    }
    
    // Dispatch event with headset data to be handled in webxr.jslib
    document.dispatchEvent(new CustomEvent('XRData', { detail: {
      leftProjectionMatrix: xrData.leftProjectionMatrix,
      rightProjectionMatrix: xrData.rightProjectionMatrix,
      leftViewMatrix: xrData.leftViewMatrix,
      rightViewMatrix: xrData.rightViewMatrix,
      sitStandMatrix: xrData.sitStandMatrix
    }}));

    document.dispatchEvent(new CustomEvent('XRControllersData', { detail: {
      controllerA: xrData.controllerA,
      controllerB: xrData.controllerB
    }}));

    document.dispatchEvent(new CustomEvent('XRHandsData', { detail: {
      handLeft: xrData.handLeft,
      handRight: xrData.handRight
    }}));
    
    if (!this.didNotifyUnity)
    {
      let eyeCount = 1;
      let leftRect = {
        x:0,
        y:0,
        w:1,
        h:1
      }
      let rightRect = {
        x:0.5,
        y:0,
        w:0.5,
        h:1
      }
      for (let view of pose.views) {
        let viewport = session.renderState.baseLayer.getViewport(view);
        if (view.eye === 'left') {
          if (viewport) {
            leftRect.x = (viewport.x / glLayer.framebufferWidth) * (glLayer.framebufferWidth / this.canvas.width);
            leftRect.y = (viewport.y / glLayer.framebufferHeight) * (glLayer.framebufferHeight / this.canvas.height);
            leftRect.w = (viewport.width / glLayer.framebufferWidth) * (glLayer.framebufferWidth / this.canvas.width);
            leftRect.h = (viewport.height / glLayer.framebufferHeight) * (glLayer.framebufferHeight / this.canvas.height);
          }
        } else if (view.eye === 'right' && viewport.width != 0 && viewport.height != 0) {
          eyeCount = 2;
          if (viewport) {
            rightRect.x = (viewport.x / glLayer.framebufferWidth) * (glLayer.framebufferWidth / this.canvas.width);
            rightRect.y = (viewport.y / glLayer.framebufferHeight) * (glLayer.framebufferHeight / this.canvas.height);
            rightRect.w = (viewport.width / glLayer.framebufferWidth) * (glLayer.framebufferWidth / this.canvas.width);
            rightRect.h = (viewport.height / glLayer.framebufferHeight) * (glLayer.framebufferHeight / this.canvas.height);
          }
        }
      }
      if (session.isAR)
      {
        this.gameModule.WebXR.OnStartAR(eyeCount, leftRect, rightRect);
      } else {
        this.gameModule.WebXR.OnStartVR(eyeCount, leftRect, rightRect);
      }
      this.didNotifyUnity = true;
    }
  }

  function initWebXRManager () {
    var xrManager = window.xrManager = new XRManager();
    return xrManager;
  }

  function init() {
    if (typeof(navigator.xr) == 'undefined') {
      var script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/webxr-polyfill@latest/build/webxr-polyfill.js';
      document.getElementsByTagName('head')[0].appendChild(script);

      script.addEventListener('load', function () {
        initWebXRManager();
      });

      script.addEventListener('error', function (err) {
        console.warn('Could not load the WebXR Polyfill script:', err);
      });
    }
    else
    {
      initWebXRManager();
    }
  }
  
  // A workaround to make it work under Firefox Reality that does not implement isContextLost()
  // Thanks Rufus31415
  // https://github.com/Rufus31415/Simple-WebXR-Unity/blob/28331fc890e316e13401618a8e0da1e84bad7a39/Assets/SimpleWebXR.jspre#L6
  if(!WebGLRenderingContext.prototype.isContextLost) {
    WebGLRenderingContext.prototype.isContextLost = function() {
      return false;
    }
  }

  init();
})();