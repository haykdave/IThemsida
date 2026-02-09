(function () {
    // Desktop-only: mouse + hover
    const isDesktop = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    if (!isDesktop) return;

    const dot = document.querySelector(".cursor-dot");
    const ring = document.querySelector(".cursor-ring");
    if (!dot || !ring) return;

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;

    let ringX = mouseX;
    let ringY = mouseY;

    // Follow mouse
    window.addEventListener("mousemove", (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;

      dot.style.left = mouseX + "px";
      dot.style.top = mouseY + "px";
    });

    // Smooth ring lag
    function animate() {
      ringX += (mouseX - ringX) * 0.15;
      ringY += (mouseY - ringY) * 0.15;

      ring.style.left = ringX + "px";
      ring.style.top = ringY + "px";

      requestAnimationFrame(animate);
    }
    animate();

    // Hide when leaving window
    window.addEventListener("mouseleave", () => {
      dot.style.opacity = "0";
      ring.style.opacity = "0";
    });
    window.addEventListener("mouseenter", () => {
      dot.style.opacity = "1";
      ring.style.opacity = "0.95";
    });

    // Extra pop on click
    window.addEventListener("mousedown", () => {
      ring.style.width = "26px";
      ring.style.height = "26px";
    });
    window.addEventListener("mouseup", () => {
      ring.style.width = "34px";
      ring.style.height = "34px";
    });
  })();
