/* ============================================================
   RunKorea — Main Entry Point
   ============================================================ */

(function () {
  /* ── DOM references ───────────────────── */
  const grid          = document.getElementById('courses-grid');
  const countEl       = document.getElementById('course-count');
  const noResults     = document.getElementById('no-results');
  const resetBtn      = document.getElementById('reset-filter');

  const citySelect    = document.getElementById('filter-city');
  const diffBtns      = document.querySelectorAll('.diff-btn');
  const distSlider    = document.getElementById('filter-distance');
  const distVal       = document.getElementById('distance-val');
  const searchInput   = document.getElementById('filter-search');

  const modalOverlay  = document.getElementById('modal-overlay');
  const modalClose    = document.getElementById('modal-close');

  /* ── Card Rendering ───────────────────── */
  function renderCards(list) {
    grid.innerHTML = '';

    if (list.length === 0) {
      noResults.classList.remove('hidden');
      countEl.textContent = '';
      return;
    }

    noResults.classList.add('hidden');
    countEl.textContent = `(${list.length}개)`;

    list.forEach((course, i) => {
      const card = document.createElement('div');
      card.className = 'course-card';
      card.style.animationDelay = `${i * 0.06}s`;
      card.dataset.id = course.id;

      const cityColor = CITY_COLORS[course.city] || '#6B7280';
      const diffColor = DIFF_COLORS[course.difficulty] || '#6B7280';

      card.innerHTML = `
        <div class="card-img-wrap">
          <img
            src="${course.images[0]}"
            alt="${course.name}"
            loading="lazy"
            onerror="this.style.background='#E2E8F0'"
          />
          <span class="card-city-badge" style="background:${cityColor}">${course.city}</span>
          <span class="card-diff-badge" style="background:${diffColor}">${course.difficulty}</span>
        </div>
        <div class="card-body">
          <h3 class="card-title">${course.name}</h3>
          <div class="card-meta">
            <div class="card-meta-item">
              <span class="meta-icon">📏</span>${course.distance}km
            </div>
            <div class="card-meta-item">
              <span class="meta-icon">⏱️</span>${course.duration}
            </div>
          </div>
          <p class="card-excerpt">${course.description}</p>
          <div class="card-seasons">
            ${course.season.map(s => `<span class="season-tag">${s}</span>`).join('')}
          </div>
        </div>`;

      card.addEventListener('click', () => openModal(course.id));
      grid.appendChild(card);
    });
  }

  function applyFilters() {
    const filtered = FilterModule.getFiltered();
    renderCards(filtered);
  }

  /* ── Filter Events ────────────────────── */
  citySelect.addEventListener('change', () => {
    FilterModule.setState('city', citySelect.value);
    applyFilters();
  });

  diffBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      diffBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      FilterModule.setState('difficulty', btn.dataset.diff);
      applyFilters();
    });
  });

  distSlider.addEventListener('input', () => {
    const val = parseInt(distSlider.value, 10);
    distVal.textContent = val >= 20 ? '20km 이하' : `${val}km 이하`;
    FilterModule.setState('maxDistance', val);
    applyFilters();
  });

  searchInput.addEventListener('input', () => {
    FilterModule.setState('keyword', searchInput.value.trim());
    applyFilters();
  });

  resetBtn.addEventListener('click', () => {
    FilterModule.reset();
    citySelect.value = '전체';
    diffBtns.forEach(b => b.classList.remove('active'));
    document.querySelector('.diff-btn[data-diff="전체"]').classList.add('active');
    distSlider.value = 20;
    distVal.textContent = '20km 이하';
    searchInput.value = '';
    applyFilters();
  });

  /* ── Hero City Buttons ────────────────── */
  document.querySelectorAll('.city-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const city = btn.dataset.city;
      FilterModule.setState('city', city);
      citySelect.value = city;
      applyFilters();
      document.getElementById('courses').scrollIntoView({ behavior: 'smooth' });
    });
  });

  /* ── Modal ────────────────────────────── */
  function openModal(courseId) {
    const course = courses.find(c => c.id === courseId);
    if (!course) return;

    const cityColor = CITY_COLORS[course.city] || '#6B7280';
    const diffColor = DIFF_COLORS[course.difficulty] || '#6B7280';

    /* Badges */
    document.getElementById('modal-badges').innerHTML = `
      <span class="modal-badge" style="background:${cityColor}">${course.city}</span>
      <span class="modal-badge" style="background:${diffColor}">${course.difficulty}</span>`;

    /* Title */
    document.getElementById('modal-title').textContent = course.name;

    /* Stats */
    document.getElementById('modal-stats').innerHTML = `
      <div class="stat-box">
        <div class="stat-label">거리</div>
        <div class="stat-value">${course.distance}km</div>
      </div>
      <div class="stat-box">
        <div class="stat-label">예상 시간</div>
        <div class="stat-value" style="font-size:.9rem">${course.duration}</div>
      </div>
      <div class="stat-box">
        <div class="stat-label">추천 시즌</div>
        <div class="stat-value" style="font-size:.9rem">${course.season.join(' · ')}</div>
      </div>
      <div class="stat-box">
        <div class="stat-label">난이도</div>
        <div class="stat-value" style="color:${diffColor}">${course.difficulty}</div>
      </div>`;

    /* Description */
    document.getElementById('modal-desc').textContent = course.description;

    /* Segments */
    const segmentsEl = document.getElementById('modal-segments');
    if (course.segments && course.segments.length) {
      segmentsEl.innerHTML = `
        <h4>코스 구간</h4>
        <div class="segment-list">
          ${course.segments.map((seg, i) => `
            <div class="segment-item${seg.coord ? ' segment-clickable' : ''}" data-seg-idx="${i}">
              <div class="segment-left">
                <div class="segment-dot">${i + 1}</div>
                <div class="segment-line"></div>
              </div>
              <div class="segment-content">
                <div class="segment-label">${seg.label}${seg.coord ? '<span class="segment-map-hint">지도에서 보기 ›</span>' : ''}</div>
                <div class="segment-distance">${seg.distance}</div>
                <div class="segment-desc">${seg.desc}</div>
              </div>
            </div>`).join('')}
        </div>`;

      segmentsEl.querySelectorAll('.segment-clickable').forEach(el => {
        el.addEventListener('click', () => {
          const idx = parseInt(el.dataset.segIdx, 10);
          const seg = course.segments[idx];
          if (seg && seg.coord) {
            MapModule.flyToSegment(seg.coord);
            segmentsEl.querySelectorAll('.segment-item').forEach(s => s.classList.remove('segment-active'));
            el.classList.add('segment-active');
          }
        });
      });
    } else {
      segmentsEl.innerHTML = '';
    }

    /* Facilities */
    document.getElementById('modal-facilities').innerHTML = `
      <h4>편의시설</h4>
      <div class="facilities-list">
        ${course.facilities.map(f => `<span class="facility-tag">✓ ${f}</span>`).join('')}
      </div>`;

    /* 추천 맛집 */
    const restEl = document.getElementById('modal-restaurant');
    if (course.spotRestaurant && course.spotRestaurant.name) {
      const r = course.spotRestaurant;
      restEl.innerHTML = `
        <h4>코스 근처 추천 맛집</h4>
        <div class="restaurant-card${r.coord ? ' restaurant-card-clickable' : ''}" id="modal-restaurant-card">
          <div class="restaurant-card-head">
            <span class="restaurant-emoji">🍽</span>
            <div>
              <div class="restaurant-name">${r.name}</div>
              <div class="restaurant-category">${r.category || ''}</div>
            </div>
          </div>
          ${r.note ? `<p class="restaurant-note">${r.note}</p>` : ''}
          ${r.coord ? '<span class="restaurant-map-hint">지도에서 위치 보기 ›</span>' : ''}
        </div>`;
      if (r.coord) {
        const card = document.getElementById('modal-restaurant-card');
        card.addEventListener('click', () => MapModule.flyToRestaurant(r.coord));
      }
    } else {
      restEl.innerHTML = '';
    }

    /* Transport */
    document.getElementById('modal-transport').innerHTML = `
      <h4>대중교통</h4>
      <p class="transport-text">${course.transport}</p>`;

    /* Gallery (hidden — accessible via photo button) */
    const galleryEl = document.getElementById('modal-gallery');
    galleryEl.innerHTML = course.images
      .map((src, idx) => `
        <div class="gallery-thumb" data-index="${idx}">
          <img src="${src}" alt="${course.name} 사진 ${idx + 1}" loading="lazy"
            onerror="this.style.background='#E2E8F0'" />
        </div>`)
      .join('');

    /* Photo button */
    const photoBtn = document.getElementById('modal-photo-btn');
    photoBtn.onclick = () => GalleryModule.open(course.images, 0);

    /* Map label */
    const labelEl = document.getElementById('modal-map-label');
    labelEl.innerHTML = `<span style="width:10px;height:10px;border-radius:50%;background:${cityColor};display:inline-block;flex-shrink:0"></span> ${course.name} 코스 경로`;

    /* Facility legend (카페·맛집은 지도 전용 마커와 동일 색상) */
    const legendEl = document.getElementById('map-facility-legend');
    function categoryLooksCafe(cat) {
      if (!cat) return false;
      return ['카페', '브런치', '베이커리', '커피', '디저트'].some((k) => cat.includes(k));
    }
    const facList = course.facilityMarkers || [];
    const showCafeLegend =
      facList.some((f) => f.type === '카페') ||
      (course.spotCafe && course.spotCafe.coord) ||
      (course.spotRestaurant && course.spotRestaurant.coord && categoryLooksCafe(course.spotRestaurant.category));
    const showRestaurantLegend =
      course.spotRestaurant && course.spotRestaurant.coord && !categoryLooksCafe(course.spotRestaurant.category);

    const otherTypes = [...new Set(facList.map((f) => f.type).filter((t) => t !== '카페'))];

    if (otherTypes.length || showCafeLegend || showRestaurantLegend) {
      const FACILITY_COLORS = {
        '주차장': '#3B82F6', '화장실': '#10B981', '편의점': '#F59E0B',
        '자전거 대여': '#0EA5E9', '음수대': '#06B6D4',
        '샤워시설': '#8B5CF6', '운동기구': '#EF4444', '전망대': '#D97706',
      };
      const FACILITY_EMOJI = {
        '주차장': '🅿', '화장실': '🚻', '편의점': '🏪',
        '자전거 대여': '🚲', '음수대': '💧', '샤워시설': '🚿', '운동기구': '🏋', '전망대': '🔭',
      };
      let legendHtml = otherTypes.map((t) => `
        <div class="legend-fac-item">
          <span class="legend-fac-dot" style="background:${FACILITY_COLORS[t] || '#6B7280'}">${FACILITY_EMOJI[t] || '📍'}</span>
          <span>${t}</span>
        </div>`).join('');
      if (showCafeLegend) {
        legendHtml += `
        <div class="legend-fac-item">
          <span class="legend-fac-dot" style="background:#CA8A04">☕</span>
          <span>추천 카페</span>
        </div>`;
      }
      if (showRestaurantLegend) {
        legendHtml += `
        <div class="legend-fac-item">
          <span class="legend-fac-dot" style="background:#DC2626">🍽</span>
          <span>추천 맛집</span>
        </div>`;
      }
      legendEl.innerHTML = legendHtml;
      legendEl.style.display = 'flex';
    } else {
      legendEl.style.display = 'none';
    }

    /* Modal map */
    MapModule.initModalMap(course);

    /* Open */
    modalOverlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    modalOverlay.classList.remove('open');
    document.body.style.overflow = '';
    MapModule.destroyModalMap();
  }

  modalClose.addEventListener('click', closeModal);
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalOverlay.classList.contains('open')) closeModal();
  });

  /* ── Map Section Lazy Init ────────────── */
  const mapSection = document.getElementById('main-map');
  let mainMapInited = false;

  const mapObserver = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting && !mainMapInited) {
      mainMapInited = true;
      MapModule.initMainMap((courseId) => openModal(courseId));
    }
  }, { threshold: 0.1 });

  mapObserver.observe(mapSection);

  /* ── Init ─────────────────────────────── */
  applyFilters();
})();
