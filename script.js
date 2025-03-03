document.addEventListener("DOMContentLoaded", function() {
  var container = document.getElementById("envelope");
  var loader = document.getElementById("loader");
  var preloaded = {};

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
  
    } else if (file.type === "image") {
      var img = new Image();
      var promise = new Promise(function(resolve, reject) {
        img.onload = function() { 
          // 存入 preloaded 对象
          preloaded[step] = img;
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

  function preloadNext(step) {
    return new Promise(function(resolve, reject) {
      if (mediaFiles[step].type === "video") {
        loadVideo(inactiveVideo, step).then(resolve).catch(reject);
      } else if (mediaFiles[step].type === "image") {
        // 对于图片，可以直接检查 preloaded 数组中是否已加载
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

  function playActiveVideo() {
    activeVideo.play().catch(function(e) {
      console.error("播放错误:", e);
    });
  }
  
  function swapVideos() {
    // 这里采用简单的交换逻辑：隐藏 activeVideo，显示 inactiveVideo，再交换引用
    activeVideo.style.display = "none";
    inactiveVideo.style.display = "block";
    var temp = activeVideo;
    activeVideo = inactiveVideo;
    inactiveVideo = temp;
  }

  // swapVideos：交换 activeVideo 与 inactiveVideo 的显示状态
  function handleEnded() {
    if (this !== activeVideo) return; // 仅处理当前 activeVideo 的 ended 事件
    if (currentStep === 2) {
      // 使用预设的 background3 作为过渡背景
    preloadNext(3).then(function() {
      console.log("Step3预加载完成")
      var bgImg = document.createElement("img");
      bgImg.src = "images/background3.png"; // 背景图片，用于 step2 到 step3 的过渡
      bgImg.style.position = "absolute";
      bgImg.style.top = "0";
      bgImg.style.left = "0";
      bgImg.style.width = "100%";
      bgImg.style.height = "100%";
      bgImg.style.objectFit = "contain"; // 或者 cover，根据你需要的效果选择
      bgImg.style.zIndex = 10; // 确保背景图片在视频之上
      // 同时预加载 step3 到 inactiveVideo 备用

      // 立即进行切换到 step3
      setTimeout(function() {
        currentStep = 3;
        swapVideos();
        playActiveVideo();
      
        // 同时预加载 step4 到 inactiveVideo 备用
         preloadNext(4).then(function() {
          console.log("Step4预加载完成");
         });
        // 切换完成后延时移除背景图片
        setTimeout(function() {
          if (container.contains(bgImg)) {
            container.removeChild(bgImg);
          }
        }, 100);
      }, 500);
      });

    } else if (currentStep === 4) {
      preloadNext(5).then(function() { 
        console.log("Step5预加载完成"); 
      });
      // 使用预设的 background5 作为过渡背景
      var bgImg = document.createElement("img");
      bgImg.src = "images/background5.png"; // 背景图片，用于 step4 到 step5 的过渡
      bgImg.className = "card-image";
      bgImg.style.position = "absolute";
      bgImg.style.top = "0";
      bgImg.style.left = "0";
      bgImg.style.width = "100%";
      bgImg.style.height = "100%";
      bgImg.style.objectFit = "contain"; // 或者 cover，根据你需要的效果选择
      bgImg.style.zIndex = 10; // 确保背景图片在视频之上
      
      // 切换到最终的贺卡图片
      setTimeout(function() {
      currentStep = 5;
      // 为避免破坏视频元素，建议不要清空整个容器，而是将最终图片覆盖到上面
      // 这里我们直接移除两个视频播放器并添加最终图片
      container.removeChild(activeVideo);
      container.removeChild(inactiveVideo);
      
      var finalImg = new Image();
      finalImg.src = mediaFiles[5].src;
      finalImg.alt = "最终贺卡";
      finalImg.className = "card-image";
      container.appendChild(finalImg);
      
      // 移除背景图片（延时移除，保证过渡平滑）
      setTimeout(function() {
        if (container.contains(bgImg)) {
          container.removeChild(bgImg);
        }
      }, 100);
    }, 500)
    }
  }
});