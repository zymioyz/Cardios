document.addEventListener("DOMContentLoaded", function() {
  var container = document.getElementById("envelope");
  var loader = document.getElementById("loader");
  var preloaded = {};  // 存储预加载后的媒体元素

  // 设置容器样式，确保内部视频能重叠显示
  container.style.position = "relative";
  container.style.width = "100%";
  container.style.height = "100%";

  // 定义媒体文件信息
  // 注意：这里的 src 保留作参考，实际 HLS 播放时我们会使用 "hls/stepX.m3u8"
  var mediaFiles = {
    1: { type: "video", src: "hls/step1.m3u8", loop: true },
    2: { type: "video", src: "hls/step2.m3u8", loop: false },
    3: { type: "video", src: "hls/step3.m3u8", loop: true },
    4: { type: "video", src: "hls/step4.m3u8", loop: false },
    5: { type: "image", src: "images/step5.png" }
  };

  // -------------------------------
  // 预加载所有媒体
  // -------------------------------
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
      // 不再添加 <source> 元素，此处直接调用 loadVideo() 来加载 HLS
      var promise = loadVideo(video, step); // 使用新的 loadVideo() 实现 HLS加载
      preloaded[step] = video;
      preloadPromises.push(promise);
    } else if (file.type === "image") {
      var img = new Image();
      var promise = new Promise(function(resolve, reject) {
        img.onload = function() { 
          preloaded[step] = img; // 存入 preloaded 对象
          resolve(); 
        };
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

  // 创建视频元素的函数，属性和样式保持一致
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

  // preloadNext：将下一个 step 的视频加载到 inactiveVideo
  function preloadNext(step) {
    return new Promise(function(resolve, reject) {
      if (mediaFiles[step].type === "video") {
        loadVideo(inactiveVideo, step).then(resolve).catch(reject);
      } else if (mediaFiles[step].type === "image") {
        if (preloaded[step]) {
          resolve();
        } else {
          reject("图片未预加载");
        }
      }
    });
  }

  // 开始播放函数：创建两个视频元素，并加载 step1 到 activeVideo，同时预加载 step2 到 inactiveVideo
  function startPlayback() {
    activeVideo = createVideoElement();
    inactiveVideo = createVideoElement();
    // 采用常驻DOM方式，仅通过 CSS 切换显示
    activeVideo.style.display = "block";
    inactiveVideo.style.display = "none";
    container.innerHTML = ""; // 确保容器为空
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

    // 绑定 ended 事件，确保只处理 activeVideo 的结束事件
    activeVideo.addEventListener("ended", handleEnded);
    inactiveVideo.addEventListener("ended", handleEnded);
  }

  // 修改后的 loadVideo()：用于加载 HLS 视频
  function loadVideo(videoElement, step) {
    return new Promise(function(resolve, reject) {
      // 清空现有内容
      while (videoElement.firstChild) {
        videoElement.removeChild(videoElement.firstChild);
      }
      // 构造 HLS 流 URL，假设放在 hls 文件夹中
      var hlsUrl = "hls/step" + step + ".m3u8";
      // 如果浏览器原生支持 HLS（如 iOS Safari）
      if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
        videoElement.src = hlsUrl;
        videoElement.addEventListener('loadedmetadata', function() {
          videoElement.currentTime = 0;
          videoElement.pause();
          resolve();
        });
        videoElement.addEventListener('error', function(e) {
          reject(e);
        });
      } else if (typeof Hls !== "undefined" && Hls.isSupported()) {
        // 使用 hls.js 播放 HLS 流
        var hls = new Hls();
        hls.loadSource(hlsUrl);
        hls.attachMedia(videoElement);
        hls.on(Hls.Events.MANIFEST_PARSED, function() {
          videoElement.currentTime = 0;
          videoElement.pause();
          resolve();
        });
        hls.on(Hls.Events.ERROR, function(event, data) {
          reject(data);
        });
      } else {
        reject("HLS not supported");
      }
    });
  }

  function playActiveVideo() {
    activeVideo.play().catch(function(e) {
      console.error("播放错误:", e);
    });
  }
  
  function swapVideos() {
    // 采用仅修改显示方式，不清空容器
    activeVideo.style.display = "none";
    inactiveVideo.style.display = "block";
    var temp = activeVideo;
    activeVideo = inactiveVideo;
    inactiveVideo = temp;
  }

  // 自动切换逻辑：视频结束后自动切换步骤
  function handleEnded() {
    if (this !== activeVideo) return; // 仅处理 activeVideo 的 ended 事件
    if (currentStep === 2) {
      // step2 结束后，自动切换到 step3
      // 这里我们可以加入延时以及背景图片过渡
      var bgImg = document.createElement("img");
      bgImg.src = "images/background3.png"; // 预设的 background3
      bgImg.className = "card-image";
      bgImg.style.position = "absolute";
      bgImg.style.top = "0";
      bgImg.style.left = "0";
      bgImg.style.width = "100%";
      bgImg.style.height = "100%";
      bgImg.style.objectFit = "contain";
      bgImg.style.zIndex = 10;
      container.appendChild(bgImg);
      // 延时后切换
      setTimeout(function() {
        preloadNext(3).then(function() {
          console.log("Step3预加载完成");
          currentStep = 3;
          swapVideos();
          playActiveVideo();
          // 预加载 step4 到 inactiveVideo
          preloadNext(4).then(function() {
            console.log("Step4预加载完成");
          });
          setTimeout(function() {
            if (container.contains(bgImg)) {
              container.removeChild(bgImg);
            }
          }, 100);
        });
      }, 50);
    } else if (currentStep === 4) {
      // step4 结束后自动切换到最终图片（step5）
      preloadNext(5).then(function() { 
        console.log("Step5预加载完成"); 
      });
      var bgImg = document.createElement("img");
      bgImg.src = "images/background5.png"; // 预设的 background5
      bgImg.className = "card-image";
      bgImg.style.position = "absolute";
      bgImg.style.top = "0";
      bgImg.style.left = "0";
      bgImg.style.width = "100%";
      bgImg.style.height = "100%";
      bgImg.style.objectFit = "contain";
      bgImg.style.zIndex = 10;
      container.appendChild(bgImg);
      setTimeout(function() {
        currentStep = 5;
        // 移除视频播放器，直接显示最终图片
        if (container.contains(activeVideo)) container.removeChild(activeVideo);
        if (container.contains(inactiveVideo)) container.removeChild(inactiveVideo);
        var finalImg = new Image();
        finalImg.src = mediaFiles[5].src;
        finalImg.alt = "最终贺卡";
        finalImg.className = "card-image";
        container.appendChild(finalImg);
        setTimeout(function() {
          if (container.contains(bgImg)) {
            container.removeChild(bgImg);
          }
        }, 100);
      }, 50);
    }
  }
});