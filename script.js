document.addEventListener("DOMContentLoaded", function() {
  var container = document.getElementById("envelope");
  var loader = document.getElementById("loader");

  container.style.position = "relative";
  container.style.width = "100%";
  container.style.height = "100%";

  // 定义媒体文件，只保留 step1、step2 和 step3
  var mediaFiles = {
    1: { type: "video", src: "videos/step1.mp4", loop: true },
    2: { type: "video", src: "videos/step2.mp4", loop: false },
    3: { type: "video", src: "videos/step3.mp4", loop: false }
  };

  loader.style.display = "none";

  // 创建视频元素的函数
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
  var currentStep = 1;

  // 将指定 step 的视频加载到指定 video 元素中
  function loadVideo(videoElement, step) {
    return new Promise(function(resolve, reject) {
      while (videoElement.firstChild) {
        videoElement.removeChild(videoElement.firstChild);
      }
      var source = document.createElement("source");
      source.type = "video/mp4";
      source.src = mediaFiles[step].src;
      videoElement.loop = mediaFiles[step].loop;
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

  // 播放 activeVideo
  function playActiveVideo() {
    activeVideo.play().catch(function(e) {
      console.error("播放错误:", e);
    });
  }

  // 交换 activeVideo 与 inactiveVideo 的显示状态，并绑定点击事件
  function swapVideos() {
    activeVideo.style.display = "none";
    inactiveVideo.style.display = "block";
    activeVideo.removeEventListener("click", handleClick);
    var temp = activeVideo;
    activeVideo = inactiveVideo;
    inactiveVideo = temp;
    // 延时绑定点击事件，避免同一次点击残留影响
    setTimeout(function() {
      activeVideo.addEventListener("click", handleClick);
    }, 50);
  }

  // 初始化播放：加载 step1 到 activeVideo
  function startPlayback() {
    activeVideo = createVideoElement();
    inactiveVideo = createVideoElement();
    activeVideo.style.display = "block";
    inactiveVideo.style.display = "none";
    container.innerHTML = "";
    container.appendChild(activeVideo);
    container.appendChild(inactiveVideo);

    loadVideo(activeVideo, 1).then(function() {
      playActiveVideo();
    });
    activeVideo.addEventListener("click", handleClick);
  }

  // 定义 step2 分段循环的起始和结束时间（单位：秒）
  const loopStartTime = 4;
  const loopEndTime = 10;
  function handleSegmentLoop() {
    if (activeVideo.currentTime >= loopEndTime) {
      activeVideo.currentTime = loopStartTime;
      activeVideo.play();
    }
  }

  // 点击事件处理：step1 点击切换到 step2，step2 点击切换到 step3
  function handleClick() {
    if (currentStep === 1) {
      currentStep = 2;
      // 加载 step2 并切换，同时为 step2 添加分段循环逻辑
      loadVideo(inactiveVideo, 2).then(function() {
        swapVideos();
        activeVideo.currentTime = 0;
        playActiveVideo();
        // 为 step2 添加分段循环监听器
        activeVideo.addEventListener("timeupdate", handleSegmentLoop);
      });
    } else if (currentStep === 2) {
      // step2 点击时先移除分段循环监听器，再切换到 step3
      activeVideo.removeEventListener("timeupdate", handleSegmentLoop);
      currentStep = 3;
      loadVideo(inactiveVideo, 3).then(function() {
        swapVideos();
        playActiveVideo();
      });
    }
  }

  startPlayback();
});