document.addEventListener("DOMContentLoaded", function() {
  var container = document.getElementById("envelope");
  var loader = document.getElementById("loader");

  // 设置容器样式，确保内部视频能重叠显示
  container.style.position = "relative";
  container.style.width = "100%";
  container.style.height = "100%";

  // 定义媒体文件信息
  var mediaFiles = {
    1: { type: "video", src: "videos/step1.mp4", loop: true },
    2: { type: "video", src: "videos/step2.mp4", loop: false },
    3: { type: "video", src: "videos/step3.mp4", loop: true },
    4: { type: "video", src: "videos/step4.mp4", loop: false },
    5: { type: "image", src: "images/step5.png" }
  };

  // 预加载所有媒体，确保播放时不会因加载问题而出现卡顿
  var preloadPromises = [];
  Object.keys(mediaFiles).forEach(function(step) {
    var file = mediaFiles[step];
    if (file.type === "video") {
      var video = document.createElement("video");
      video.muted = true;
      video.setAttribute("playsinline", "true");
      video.autoplay = false;
      video.playsInline = true;
      video.loop = file.loop;
      // 不添加到页面，仅用于预加载
      var source = document.createElement("source");
      source.type = "video/mp4";
      source.src = file.src;
      video.appendChild(source);
      
      // 选择预加载事件：桌面用 canplaythrough，移动端用 loadeddata
      var isMobile = /Mobi|Android/i.test(navigator.userAgent);
      var preloadEvent = isMobile ? "loadeddata" : "canplaythrough";
      
      var promise = new Promise(function(resolve, reject) {
        video.addEventListener(preloadEvent, function() {
          resolve();
        });
        video.onerror = function(e) {
          reject(e);
        };
        // 超时处理（例如3秒后自动resolve）
        setTimeout(function() {
          resolve();
        }, 3000);
      });
      video.load();
      preloadPromises.push(promise);
    } else if (file.type === "image") {
      var img = new Image();
      var promise = new Promise(function(resolve, reject) {
        img.onload = resolve;
        img.onerror = reject;
      });
      img.src = file.src;
      preloadPromises.push(promise);
    }
  });

  // 等待所有媒体预加载完成
  Promise.all(preloadPromises).then(function() {
    loader.style.display = "none";  // 隐藏加载动画
    startPlayback();                 // 开始播放
  }).catch(function(err) {
    console.error("媒体预加载错误：", err);
  });

  // -------------------------------
  // 以下为重叠视频播放部分（无缝衔接逻辑）
  // -------------------------------

  // 创建视频元素的函数，保证属性和样式一致
  function createVideoElement() {
    var video = document.createElement("video");
    video.muted = true;
    video.autoplay = false; // 由 JS 控制播放
    video.playsInline = true;
    video.setAttribute("playsinline", "true");
    video.style.position = "absolute";
    video.style.top = "0";
    video.style.left = "0";
    video.style.width = "100%";
    video.style.height = "100%";
    video.style.objectFit = "contain";
    video.className = "card-image";
    return video;
  }

  var activeVideo, inactiveVideo;
  var currentStep = 1;

  // 开始播放函数：创建两个视频元素，并加载 step1 到 activeVideo，同时预加载 step2 到 inactiveVideo
  function startPlayback() {
    activeVideo = createVideoElement();
    inactiveVideo = createVideoElement();
    activeVideo.style.display = "block";
    inactiveVideo.style.display = "none";
    container.innerHTML = ""; // 清空容器
    container.appendChild(activeVideo);
    container.appendChild(inactiveVideo);
    
    // 加载 step1 到 activeVideo
    loadVideo(activeVideo, 1).then(function() {
      playActiveVideo();
      // 同时预加载 step2 到 inactiveVideo
      preloadNext(2).then(function() {
        console.log("Step2预加载完成");
      });
    });

    // 点击事件：在 step1 和 step3 时响应点击（分别切换到 step2 和 step4）
    activeVideo.addEventListener("click", function() {
      if (currentStep === 1) {
        currentStep = 2;
        swapVideos();
        playActiveVideo();
      } else if (currentStep === 3) {
        currentStep = 4;
        swapVideos();
        playActiveVideo();
      }
    });

    function captureLastFrame(video) {
      var canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      var ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL(); // 返回图片数据URL
    }
    
    // 在切换前，比如在 handleEnded 中：
    if (currentStep === 2) {
      // 捕获 activeVideo 最后一帧
      var lastFrameURL = captureLastFrame(activeVideo);
      // 将其作为背景覆盖在容器上
      var bgImg = document.createElement("img");
      bgImg.src = lastFrameURL;
      bgImg.className = "card-image";
      bgImg.style.position = "absolute";
      bgImg.style.top = "0";
      bgImg.style.left = "0";
      bgImg.style.width = "100%";
      bgImg.style.height = "100%";
      container.appendChild(bgImg);
      // 然后进行视频切换，待新视频就绪后移除 bgImg
      swapVideos();
      playActiveVideo();
      // 移除背景图片
      setTimeout(function() {
        if (container.contains(bgImg)) {
          container.removeChild(bgImg);
        }
      }, 100); // 100ms 后移除，可根据需要调整
    }

    // 为两个视频都绑定 ended 事件（确保只对当前 activeVideo 生效）
    activeVideo.addEventListener("ended", handleEnded);
    inactiveVideo.addEventListener("ended", handleEnded);
  }

  // loadVideo：将指定 step 的视频加载到给定的视频元素中（利用媒体文件的 src），并等待 onloadeddata 事件
  function loadVideo(videoElement, step) {
    return new Promise(function(resolve, reject) {
      while (videoElement.firstChild) {
        videoElement.removeChild(videoElement.firstChild);
      }
      var source = document.createElement("source");
      source.type = "video/mp4";
      if (step === 1) {
        videoElement.loop = true;
        source.src = mediaFiles[1].src;
      } else if (step === 2) {
        videoElement.loop = false;
        source.src = mediaFiles[2].src;
      } else if (step === 3) {
        videoElement.loop = true;
        source.src = mediaFiles[3].src;
      } else if (step === 4) {
        videoElement.loop = false;
        source.src = mediaFiles[4].src;
      }
      videoElement.appendChild(source);
      videoElement.load();
      videoElement.onloadeddata = function() {
        videoElement.currentTime = 0;
        videoElement.pause();
        resolve();
      };
      videoElement.onerror = function(e) {
        reject(e);
      };
    });
  }

  // swapVideos：交换 activeVideo 与 inactiveVideo 的显示状态
  function swapVideos() {
    activeVideo.style.display = "none";
    inactiveVideo.style.display = "block";
    var temp = activeVideo;
    activeVideo = inactiveVideo;
    inactiveVideo = temp;
  }

  // 播放 activeVideo
  function playActiveVideo() {
    activeVideo.play().catch(function(e) {
      console.error("播放错误:", e);
    });
  }

  // preloadNext：将下一个 step 的视频加载到 inactiveVideo中
  function preloadNext(step) {
    return loadVideo(inactiveVideo, step);
  }

  // handleEnded：视频结束后的自动切换逻辑
  function handleEnded() {
    if (this !== activeVideo) return; // 仅处理当前 activeVideo 的 ended 事件
    if (currentStep === 2) {
      currentStep = 3;
      preloadNext(3).then(function() {
        swapVideos();
        playActiveVideo();
        // 同时预加载 step4 到 inactiveVideo
        preloadNext(4).then(function() {
          console.log("Step4预加载完成");
        });
      });
    } else if (currentStep === 4) {
      currentStep = 5;
      // 最后一步：加载 PNG 图片
      var img = new Image();
      img.src = mediaFiles[5].src;
      img.alt = "最终贺卡";
      img.className = "card-image";
      container.innerHTML = "";
      container.appendChild(img);
    }
  }
});