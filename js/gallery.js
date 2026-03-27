/* ============================================================
   RunKorea — Lightbox Gallery Module
   ============================================================ */

const GalleryModule = (() => {
  let images = [];
  let currentIdx = 0;

  const lightbox     = document.getElementById('lightbox');
  const lbImg        = document.getElementById('lightbox-img');
  const lbClose      = document.getElementById('lightbox-close');
  const lbPrev       = document.getElementById('lightbox-prev');
  const lbNext       = document.getElementById('lightbox-next');
  const lbCounter    = document.getElementById('lightbox-counter');

  function open(imgList, startIndex) {
    images = imgList;
    currentIdx = startIndex || 0;
    show();
    lightbox.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function close() {
    lightbox.classList.remove('open');
    document.body.style.overflow = '';
    lbImg.src = '';
  }

  function show() {
    lbImg.style.opacity = '0';
    lbImg.src = images[currentIdx];
    lbImg.onload = () => { lbImg.style.opacity = '1'; };
    lbCounter.textContent = `${currentIdx + 1} / ${images.length}`;
    lbPrev.style.display = images.length <= 1 ? 'none' : '';
    lbNext.style.display = images.length <= 1 ? 'none' : '';
  }

  function prev() {
    currentIdx = (currentIdx - 1 + images.length) % images.length;
    show();
  }

  function next() {
    currentIdx = (currentIdx + 1) % images.length;
    show();
  }

  /* Event listeners */
  lbClose.addEventListener('click', close);
  lbPrev.addEventListener('click', prev);
  lbNext.addEventListener('click', next);

  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) close();
  });

  document.addEventListener('keydown', (e) => {
    if (!lightbox.classList.contains('open')) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') prev();
    if (e.key === 'ArrowRight') next();
  });

  return { open, close };
})();
