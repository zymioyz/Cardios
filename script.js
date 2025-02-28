document.addEventListener("DOMContentLoaded", function() {
  var container = document.getElementById("envelope");
  container.style.position = "relative";
  container.style.width = "100%";
  container.style.height = "100%";

  function createVideoElement() {
    var video = document.createElement("video");
    video.muted = true;
    video.autoplay = false; // 手动控制播放
    video.playsInline = true;
    video.style.position = "absolute";
    video.style.top = "0";
    video.style.left = "0";
    video.style.width = "100%";
    video.style.height = "100%";
    video.style.objectFit = "contain"; // 根据需要可调整为 cover
    return video;
  }

  var videoA = createVideoElement();
  var videoB = createVideoElement();

  videoA.style.display = "block";
  videoB.style.display = "none";

  container.appendChild(videoA);
  container.appendChild(videoB);

  var activeVideo = videoA;
  var inactiveVideo = videoB;
  var currentStep = 1;

  function loadVideo(videoElement, step) {
    return new Promise(function(resolve, reject) {
      while (videoElement.firstChild) {
        videoElement.removeChild(videoElement.firstChild);
      }
      var source = document.createElement("source");
      source.type = "video/mp4";
      if (step === 1) {
        videoElement.loop = true;
        source.src = "videos/step1.mp4";
      } else if (step === 2) {
        videoElement.loop = false;
        source.src = "videos/step2.mp4";
      } else if (step === 3) {
        videoElement.loop = true;
        source.src = "videos/step3.mp4";
      } else if (step === 4) {
        videoElement.loop = false;
        source.src = "videos/step4.mp4";
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

  function swapVideos() {
    activeVideo.style.display = "none";
    inactiveVideo.style.display = "block";
    var temp = activeVideo;
    activeVideo = inactiveVideo;
    inactiveVideo = temp;
  }

  function playActiveVideo() {
    activeVideo.play().catch(function(e) {
      console.error("播放错误:", e);
    });
  }

  function preloadNext(step) {
    return loadVideo(inactiveVideo, step);
  }

  // 定义 ended 事件处理函数，绑定在所有视频上
  function handleEnded() {
    if (this !== activeVideo) return; // 仅处理当前播放的视频
    if (currentStep === 2) {
      currentStep = 3;
      preloadNext(3).then(function() {
        swapVideos();
        playActiveVideo();
        // 同时预加载 step4 为后续点击做准备
        preloadNext(4).then(function() {
          console.log("Step4预加载完成");
        });
      });
    } else if (currentStep === 4) {
      currentStep = 5;
      // 预加载 PNG 文件
      var preloadedImage = new Image();
      preloadedImage.src = "images/step5.png";  // 确保路径正确
      preloadedImage.onload = function() {
        // PNG 加载完成后无缝切换到图片
        container.innerHTML = "";
        preloadedImage.alt = "最终贺卡";
        preloadedImage.className = "card-image";
        container.appendChild(preloadedImage);
      };
      preloadedImage.onerror = function(e) {
        console.error("PNG加载失败：", e);
      };
    }
  }

  // 给两个视频元素都绑定 ended 事件监听器
  videoA.addEventListener("ended", handleEnded);
  videoB.addEventListener("ended", handleEnded);

  // 初始加载 step1 到 activeVideo，并预加载 step2 到 inactiveVideo
  loadVideo(activeVideo, 1).then(function() {
    playActiveVideo();
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
});