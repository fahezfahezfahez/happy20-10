
(() => {
  "use strict";

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => document.querySelectorAll(selector);

  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  const skyCanvas = $("#sky");
  const fireworksCanvas = $("#fireworks");
  const heartCanvas = $("#heartCanvas");
  const petalLayer = $("#petalLayer");

  const bgMusic = $("#bgMusic");
  const musicToggle = $("#musicToggle");
  const volumeSlider = $("#volumeSlider");
  const musicStatus = $("#musicStatus");

  const skyCtx = skyCanvas?.getContext("2d");
  const fireworksCtx = fireworksCanvas?.getContext("2d");
  const heartCtx = heartCanvas?.getContext("2d");

  let currentPage = "hero";
  let skyAnimationId = null;
  let heartAnimationId = null;
  let fireworksAnimationId = null;
  let resizeTimeout = null;
  let navigationToken = 0;

  let stars = [];
  let heartParticles = [];
  let fireworks = [];

  let heartRotation = 0;
  let heartLastTime = 0;
  let fireworksLastLaunch = 0;

  // ================================================
  // 1. CHUYỂN TRANG
  // ================================================

  function showPage(id) {
    const nextPage = document.getElementById(id);

    if (!nextPage || id === currentPage) return;

    const oldPage = document.getElementById(currentPage);
    const token = ++navigationToken;

    if (oldPage) {
      oldPage.classList.remove("is-leaving");
      oldPage.classList.add("is-leaving");
    }

    window.setTimeout(() => {
      // Bỏ qua lần chuyển trang cũ nếu người dùng bấm nhanh.
      if (token !== navigationToken) return;

      if (oldPage) {
        oldPage.classList.remove("is-active", "is-leaving");
      }

      nextPage.classList.add("is-active");
      currentPage = id;

      window.scrollTo({
        top: 0,
        behavior: reducedMotion ? "auto" : "smooth"
      });

      if (id === "letterPage") {
        startLetterAnimation();
      }

      if (id === "finale") {
        startHeartAnimation();
        startFireworks();
      } else {
        stopFinaleAnimations();
      }
    }, reducedMotion ? 0 : 360);
  }

  $$("[data-page]").forEach((button) => {
    button.addEventListener("click", () => {
      showPage(button.dataset.page);
    });
  });

  // Có thể gọi showPage("finale") từ console nếu cần kiểm tra.
  window.showPage = showPage;


  // ================================================
  // 2. CHỮ TRONG THƯ HIỆN DẦN
  // ================================================

  function startLetterAnimation() {
    const letter = $(".letter");
    if (!letter) return;

    letter.classList.remove("animate-in");

    // Khởi động lại animation khi mở thư lần nữa.
    void letter.offsetWidth;

    letter.classList.add("animate-in");
  }


  // ================================================
  // 3. NHẠC NỀN - ƯU TIÊN ĐỘ ỔN ĐỊNH
  // ================================================

  function setMusicStatus(message) {
    if (musicStatus) {
      musicStatus.textContent = message;
    }
  }

  function setMusicButton(isPlaying) {
    if (!musicToggle) return;

    musicToggle.textContent = isPlaying
      ? "♫ Tắt nhạc"
      : "♫ Bật nhạc";

    musicToggle.setAttribute(
      "aria-pressed",
      String(isPlaying)
    );
  }

  if (bgMusic) {
    bgMusic.loop = true;
    bgMusic.volume = volumeSlider
      ? Number(volumeSlider.value) / 100
      : 0.35;

    // Cập nhật nút theo trạng thái thực của audio.
    bgMusic.addEventListener("play", () => {
      setMusicButton(true);
      setMusicStatus("Nhạc đang phát ♪");
    });

    bgMusic.addEventListener("pause", () => {
      setMusicButton(false);
      setMusicStatus("Nhạc đã tạm dừng.");
    });

    bgMusic.addEventListener("ended", () => {
      setMusicButton(false);
    });

    bgMusic.addEventListener("canplay", () => {
      setMusicStatus("");
    });

    bgMusic.addEventListener("error", () => {
      setMusicButton(false);
      setMusicStatus(
        "Không tải được nhạc. Hãy kiểm tra file music.mp3."
      );
    });
  }

  if (musicToggle && bgMusic) {
    musicToggle.addEventListener("click", async () => {
      if (!bgMusic.paused) {
        bgMusic.pause();
        return;
      }

      setMusicStatus("Đang tải nhạc...");

      try {
        // Trình duyệt cho phép phát nhạc sau thao tác nhấn nút.
        await bgMusic.play();
      } catch (error) {
        console.error("Lỗi phát nhạc:", error);

        setMusicButton(false);
        setMusicStatus(
          "Chưa phát được nhạc. Kiểm tra file music.mp3 và thử lại."
        );
      }
    });
  }

  if (volumeSlider && bgMusic) {
    volumeSlider.addEventListener("input", () => {
      const volume = Number(volumeSlider.value) / 100;

      bgMusic.volume = Math.max(0, Math.min(1, volume));

      // Nếu âm lượng bằng 0, nhạc vẫn phát nhưng sẽ im lặng.
      if (volume === 0) {
        setMusicStatus("Âm lượng đang ở mức 0.");
      } else if (!bgMusic.paused) {
        setMusicStatus("Nhạc đang phát ♪");
      }
    });
  }


  // ================================================
  // 4. HÀM CHỈNH KÍCH THƯỚC CANVAS
  // ================================================

  function setupCanvas(canvas, ctx, width, height) {
    if (!canvas || !ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.max(1, Math.round(width * dpr));
    canvas.height = Math.max(1, Math.round(height * dpr));

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }


  // ================================================
  // 5. NỀN SAO LẤP LÁNH
  // ================================================

  function resizeSky() {
    if (!skyCanvas || !skyCtx) return;

    setupCanvas(
      skyCanvas,
      skyCtx,
      window.innerWidth,
      window.innerHeight
    );

    stars = Array.from({ length: 120 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      radius: Math.random() * 1.4 + 0.3,
      alpha: Math.random() * 0.65 + 0.2,
      direction: Math.random() > 0.5 ? 1 : -1,
      speed: Math.random() * 0.006 + 0.002
    }));
  }

  function drawSky() {
    if (!skyCtx) return;

    skyCtx.clearRect(
      0, 0,
      window.innerWidth,
      window.innerHeight
    );

    for (const star of stars) {
      star.alpha += star.speed * star.direction;

      if (star.alpha > 0.95 || star.alpha < 0.15) {
        star.direction *= -1;
      }

      skyCtx.beginPath();
      skyCtx.arc(
        star.x,
        star.y,
        star.radius,
        0,
        Math.PI * 2
      );

      skyCtx.fillStyle =
        `rgba(255, 225, 246, ${star.alpha})`;

      skyCtx.fill();
    }

    if (!reducedMotion) {
      skyAnimationId = requestAnimationFrame(drawSky);
    }
  }


  // ================================================
  // 6. CÁNH HOA RƠI
  // ================================================

  function createPetals() {
    if (!petalLayer) return;

    petalLayer.replaceChildren();

    if (reducedMotion) return;

    for (let i = 0; i < 18; i++) {
      const petal = document.createElement("span");

      petal.className = "petal";
      petal.style.left = `${Math.random() * 100}%`;
      petal.style.animationDelay = `${Math.random() * -15}s`;
      petal.style.animationDuration =
        `${9 + Math.random() * 10}s`;

      petalLayer.appendChild(petal);
    }
  }


  // ================================================
  // 7. TRÁI TIM HẠT SÁNG XOAY 3D
  // ================================================

  function heartPoint(t) {
    return {
      x: 16 * Math.pow(Math.sin(t), 3),

      y: -(
        13 * Math.cos(t)
        - 5 * Math.cos(2 * t)
        - 2 * Math.cos(3 * t)
        - Math.cos(4 * t)
      )
    };
  }

  function resizeHeart() {
    if (!heartCanvas || !heartCtx) return;

    const stage = heartCanvas.parentElement;

    const width = stage?.clientWidth || 500;
    const height = stage?.clientHeight || 380;

    setupCanvas(heartCanvas, heartCtx, width, height);

    heartParticles = [];

    for (let i = 0; i < 760; i++) {
      const point = heartPoint(
        Math.random() * Math.PI * 2
      );

      // Phân bố hạt bên trong hình trái tim.
      const fill = Math.sqrt(Math.random());

      heartParticles.push({
        x: point.x * fill,
        y: point.y * fill,
        z: (Math.random() - 0.5) * 12,
        size: Math.random() * 1.6 + 0.45,
        alpha: Math.random() * 0.6 + 0.35
      });
    }
  }

  function drawHeart(time = 0) {
    if (!heartCtx || currentPage !== "finale") {
      heartAnimationId = null;
      return;
    }

    const stage = heartCanvas.parentElement;
    const width = stage?.clientWidth || 500;
    const height = stage?.clientHeight || 380;

    heartCtx.clearRect(0, 0, width, height);

    if (heartLastTime === 0) {
      heartLastTime = time;
    }

    const delta = Math.min(time - heartLastTime, 40);
    heartLastTime = time;

    heartRotation += delta * 0.00075;

    const cos = Math.cos(heartRotation);
    const sin = Math.sin(heartRotation);

    const scale = Math.min(width / 39, height / 34) * 0.82;
    const centerX = width / 2;
    const centerY = height / 2;

    for (const particle of heartParticles) {
      // Xoay hạt quanh trục Y.
      const rotatedX =
        particle.x * cos - particle.z * sin;

      const rotatedZ =
        particle.x * sin + particle.z * cos;

      // Phối cảnh tạo cảm giác chiều sâu.
      const perspective = 260 / (260 + rotatedZ * 2.2);

      const x = centerX + rotatedX * scale * perspective;
      const y = centerY + particle.y * scale * perspective;

      const radius = Math.max(
        0.3,
        particle.size * perspective
      );

      heartCtx.beginPath();
      heartCtx.arc(x, y, radius, 0, Math.PI * 2);

      heartCtx.fillStyle =
        `rgba(255, 125, 195, ${particle.alpha})`;

      heartCtx.shadowBlur = 9;
      heartCtx.shadowColor = "rgba(255, 65, 170, 0.85)";
      heartCtx.fill();
    }

    heartCtx.shadowBlur = 0;

    if (!reducedMotion) {
      heartAnimationId = requestAnimationFrame(drawHeart);
    } else {
      heartAnimationId = null;
    }
  }

  function startHeartAnimation() {
    if (!heartCanvas || !heartCtx) return;
    if (heartAnimationId !== null) return;

    resizeHeart();
    heartLastTime = 0;

    if (reducedMotion) {
      drawHeart(0);
    } else {
      heartAnimationId = requestAnimationFrame(drawHeart);
    }
  }


  // ================================================
  // 8. PHÁO HOA
  // ================================================

  function resizeFireworks() {
    if (!fireworksCanvas || !fireworksCtx) return;

    setupCanvas(
      fireworksCanvas,
      fireworksCtx,
      window.innerWidth,
      window.innerHeight
    );
  }

  function launchFirework(x, y) {
    const colors = [
      [255, 112, 188],
      [255, 220, 140],
      [190, 145, 255],
      [130, 225, 255],
      [255, 155, 170]
    ];

    const color = colors[
      Math.floor(Math.random() * colors.length)
    ];

    const count = 75;

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 3.6 + 0.6;

      fireworks.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        decay: Math.random() * 0.012 + 0.008,
        size: Math.random() * 1.8 + 0.6,
        color
      });
    }
  }

  function drawFireworks(time = 0) {
    if (!fireworksCtx || currentPage !== "finale") {
      fireworksAnimationId = null;
      return;
    }

    fireworksCtx.clearRect(
      0, 0,
      window.innerWidth,
      window.innerHeight
    );

    // Tạo chùm pháo hoa mới theo thời gian.
    if (time - fireworksLastLaunch > 720) {
      launchFirework(
        window.innerWidth * (0.12 + Math.random() * 0.76),
        window.innerHeight * (0.12 + Math.random() * 0.42)
      );

      fireworksLastLaunch = time;
    }

    fireworks = fireworks.filter(
      (particle) => particle.life > 0
    );

    for (const particle of fireworks) {
      particle.x += particle.vx;
      particle.y += particle.vy;

      particle.vy += 0.025;
      particle.vx *= 0.992;
      particle.vy *= 0.992;
      particle.life -= particle.decay;

      const [r, g, b] = particle.color;

      fireworksCtx.beginPath();
      fireworksCtx.arc(
        particle.x,
        particle.y,
        particle.size,
        0,
        Math.PI * 2
      );

      fireworksCtx.fillStyle =
        `rgba(${r}, ${g}, ${b}, ${Math.max(0, particle.life)})`;

      fireworksCtx.shadowBlur = 12;
      fireworksCtx.shadowColor = `rgb(${r}, ${g}, ${b})`;
      fireworksCtx.fill();
    }

    fireworksCtx.shadowBlur = 0;

    if (!reducedMotion) {
      fireworksAnimationId = requestAnimationFrame(drawFireworks);
    } else {
      fireworksAnimationId = null;
    }
  }

  function startFireworks() {
    if (!fireworksCanvas || !fireworksCtx) return;
    if (fireworksAnimationId !== null) return;

    resizeFireworks();
    fireworks = [];

    launchFirework(
      window.innerWidth * 0.25,
      window.innerHeight * 0.28
    );

    launchFirework(
      window.innerWidth * 0.5,
      window.innerHeight * 0.2
    );

    launchFirework(
      window.innerWidth * 0.75,
      window.innerHeight * 0.32
    );

    fireworksLastLaunch = 0;

    if (reducedMotion) {
      drawFireworks(1000);
    } else {
      fireworksAnimationId = requestAnimationFrame(drawFireworks);
    }
  }


  // ================================================
  // 9. DỪNG HIỆU ỨNG KHI RỜI TRANG CUỐI
  // ================================================

  function stopFinaleAnimations() {
    if (heartAnimationId !== null) {
      cancelAnimationFrame(heartAnimationId);
      heartAnimationId = null;
    }

    if (fireworksAnimationId !== null) {
      cancelAnimationFrame(fireworksAnimationId);
      fireworksAnimationId = null;
    }

    fireworks = [];

    if (fireworksCtx) {
      fireworksCtx.clearRect(
        0, 0,
        window.innerWidth,
        window.innerHeight
      );
    }

    if (heartCtx && heartCanvas) {
      const stage = heartCanvas.parentElement;

      heartCtx.clearRect(
        0, 0,
        stage?.clientWidth || 500,
        stage?.clientHeight || 380
      );
    }

    heartLastTime = 0;
  }


  // ================================================
  // 10. KHỞI TẠO VÀ THAY ĐỔI KÍCH THƯỚC
  // ================================================

  function init() {
    resizeSky();
    resizeFireworks();
    resizeHeart();
    createPetals();

    if (reducedMotion) {
      drawSky();
    } else {
      skyAnimationId = requestAnimationFrame(drawSky);
    }
  }

  window.addEventListener("resize", () => {
    clearTimeout(resizeTimeout);

    resizeTimeout = setTimeout(() => {
      resizeSky();
      resizeFireworks();

      if (currentPage === "finale") {
        resizeHeart();

        if (reducedMotion) {
          drawHeart(0);
          drawFireworks(1000);
        }
      }

      if (reducedMotion) {
        drawSky();
      }
    }, 120);
  });

  init();
})();
