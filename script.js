document.addEventListener("DOMContentLoaded", function() {
  var container = document.getElementById("envelope");
  var loader = document.getElementById("loader");

  // 确保 loader 初始显示（假设你的 HTML 中 loader 已设置为加载 loading.mp4）
  loader.style.display = "block";

  // 设置容器样式
  container.style.position = "relative";
  container.style.width = "100%";
  container.style.height = "100%";

  // 定义媒体文件，只使用 step1、step2 和 step3
  var mediaFiles = {
    1: { type: "video", src: "videos/step1.mp4", loop: true },
    2: { type: "video", src: "videos/step2.mp4", loop: false },
    3: { type: "video", src: "videos/step3.mp4", loop: false }
  };

  // 创建 video 元素，保证属性和样式一致
  function createVideoElement() {
    var video = document.createElement("video");
    video.muted = true;
    video.autoplay = false;
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
  var currentStep = 1; // 1: step1, 2: step2, 3: step3
  var step2LoopActive = false; // 标记 step2 循环部分是否已开始

  // 定义 step2 分段循环的起始和结束时间（单位：秒）
  const loopStartTime = 4;
  const loopEndTime = 10;
  function handleSegmentLoop() {
    console.log("timeupdate: currentTime =", activeVideo.currentTime);
    if (activeVideo.currentTime >= loopEndTime) {
      console.log("达到 loopEndTime，重置到", loopStartTime);
      activeVideo.currentTime = loopStartTime;
      activeVideo.play();
      if (!step2LoopActive) {
        step2LoopActive = true;
        console.log("Step2 循环部分已开始");
      }
    }
  }

  // 将指定 step 的视频加载到给定 video 元素中
  function loadVideo(videoElement, step) {
    return new Promise(function(resolve, reject) {
      while (videoElement.firstChild) {
        videoElement.removeChild(videoElement.firstChild);
      }
      var source = document.createElement("source");
      source.type = "video/mp4";
      source.src = mediaFiles[step].src;
      // 只有 step1 是循环播放，其余不设置 loop（step2 分段循环由代码控制）
      videoElement.loop = (step === 1) ? true : false;
      videoElement.appendChild(source);
      videoElement.load();
      videoElement.onloadeddata = function() {
        videoElement.currentTime = 0;
        videoElement.pause();
        console.log("加载完成 step" + step);
        resolve();
      };
      videoElement.onerror = function(e) {
        reject(e);
      };
    });
  }

  // 预加载下一个视频到 inactiveVideo（用于无缝切换）
  function preloadNext(step) {
    return loadVideo(inactiveVideo, step);
  }

  // 播放 activeVideo 并打印日志
  function playActiveVideo() {
    activeVideo.play().then(function() {
      console.log("开始播放，当前时间：", activeVideo.currentTime);
    }).catch(function(e) {
      console.error("播放错误:", e);
    });
  }

  // 无缝切换：交换 activeVideo 与 inactiveVideo 的显示状态，并延时绑定点击事件
  function swapVideos() {
    activeVideo.style.display = "none";
    inactiveVideo.style.display = "block";
    activeVideo.removeEventListener("click", handleClick);
    var temp = activeVideo;
    activeVideo = inactiveVideo;
    inactiveVideo = temp;
    setTimeout(function() {
      activeVideo.addEventListener("click", handleClick);
    }, 50);
  }

  // 点击事件处理：
  // - step1 点击后切换到 step2，同时为 step2 添加分段循环监听器
  // - step2 点击时，只有当分段循环已启动（step2LoopActive 为 true）才切换到 step3
  function handleClick(e) {
    e.stopImmediatePropagation();
    if (currentStep === 1) {
      currentStep = 2;
      step2LoopActive = false; // 重置标记
      preloadNext(2).then(function() {
        swapVideos();
        activeVideo.currentTime = 0;
        playActiveVideo();
        // 为 step2 添加分段循环监听器
        activeVideo.addEventListener("timeupdate", handleSegmentLoop);
        // 同时预加载 step3 备用
        preloadNext(3).then(function() {
          console.log("Step3预加载完成");
        }).catch(function(e) {
          console.error("预加载step3错误:", e);
        });
      }).catch(function(e) {
        console.error("预加载step2错误:", e);
      });
    } else if (currentStep === 2) {
      // 如果还未进入循环且播放时间小于8秒，则不允许切换
      if (!step2LoopActive && activeVideo.currentTime < 8) {
        console.log("等待 step2 播放8秒后再点击");
        return;
      }
      activeVideo.removeEventListener("timeupdate", handleSegmentLoop);
      currentStep = 3;
      preloadNext(3).then(function() {
        swapVideos();
        playActiveVideo();
      }).catch(function(e) {
        console.error("预加载step3错误:", e);
      });
    }
  }

  // 初始化播放：创建两个 video 元素，加载 step1 到 activeVideo，并预加载 step2
  function startPlayback() {
    activeVideo = createVideoElement();
    inactiveVideo = createVideoElement();
    activeVideo.style.display = "block";
    inactiveVideo.style.display = "none";
    container.innerHTML = "";
    container.appendChild(activeVideo);
    container.appendChild(inactiveVideo);

    loadVideo(activeVideo, 1).then(function() {
      // 隐藏 loader 后开始播放 step1
      loader.style.display = "none";
      playActiveVideo();
      preloadNext(2).then(function() {
        console.log("Step2预加载完成");
      }).catch(function(e) {
        console.error("预加载step2错误:", e);
      });
    }).catch(function(e) {
      console.error("加载step1错误:", e);
    });

    activeVideo.addEventListener("click", handleClick);
  }

  startPlayback();
});