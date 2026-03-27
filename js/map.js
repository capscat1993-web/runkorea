/* ============================================================
   RunKorea — Google Maps Module
   ============================================================ */

const MapModule = (() => {
  let mainMap = null;
  let mainMarkers = [];
  let modalMap = null;
  let modalOverlays = [];

  const FACILITY_CONFIG = {
    '주차장':    { emoji: '🅿',  color: '#3B82F6', label: '주차장' },
    '화장실':    { emoji: '🚻',  color: '#10B981', label: '화장실' },
    '편의점':    { emoji: '🏪',  color: '#F59E0B', label: '편의점' },
    '카페':      { emoji: '☕',  color: '#92400E', label: '카페' },
    '자전거 대여': { emoji: '🚲', color: '#0EA5E9', label: '자전거 대여' },
    '음수대':    { emoji: '💧',  color: '#06B6D4', label: '음수대' },
    '샤워시설':  { emoji: '🚿',  color: '#8B5CF6', label: '샤워시설' },
    '운동기구':  { emoji: '🏋',  color: '#EF4444', label: '운동기구' },
    '전망대':    { emoji: '🔭',  color: '#D97706', label: '전망대' },
  };

  const RESTAURANT_COLOR = '#DC2626';
  const CAFE_SPOT_COLOR = '#CA8A04';

  let mapsLoadPromise = null;

  function escapeHtml(s) {
    if (s == null || s === '') return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /** Google 지도 검색 + 좌표 링크 (맛집·카페 공통) */
  function googleMapsPoiLinksHtml(lat, lng, searchQuery) {
    const searchUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(searchQuery)}`;
    const coordUrl = `https://www.google.com/maps?q=${lat},${lng}&z=17&hl=ko`;
    return (
      `<a href="${searchUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;margin-top:10px;padding:8px 12px;background:#1a73e8;color:#fff!important;border-radius:8px;font-size:0.8rem;font-weight:700;text-decoration:none;text-align:center;box-sizing:border-box;width:100%">Google 지도에서 찾기</a>` +
      `<a href="${coordUrl}" target="_blank" rel="noopener noreferrer" style="display:block;margin-top:8px;font-size:0.74rem;color:#1a73e8;font-weight:600;text-decoration:underline;text-align:center">이 좌표로 지도 열기</a>`
    );
  }

  /** 추천 맛집 정보창 */
  function restaurantInfoWindowHtml(r, course) {
    const lat = r.coord[0];
    const lng = r.coord[1];
    const searchQuery = [r.name, course.city, '대한민국'].filter(Boolean).join(' ');

    const name = escapeHtml(r.name);
    const category = r.category ? escapeHtml(r.category) : '';
    const note = r.note ? escapeHtml(r.note) : '';

    return (
      `<div style="font-family:Pretendard,sans-serif;min-width:180px;max-width:260px;padding:4px 2px 2px">` +
      `<div style="font-size:0.82rem;font-weight:700;color:${RESTAURANT_COLOR};margin-bottom:4px">🍽 추천 맛집</div>` +
      `<div style="font-size:0.92rem;font-weight:700">${name}</div>` +
      (category ? `<div style="font-size:0.78rem;color:#64748B;margin-top:2px">${category}</div>` : '') +
      (note ? `<div style="font-size:0.8rem;margin-top:6px;line-height:1.45;color:#334155">${note}</div>` : '') +
      googleMapsPoiLinksHtml(lat, lng, searchQuery) +
      `</div>`
    );
  }

  /** 추천 카페 정보창 (편의시설 카페·spotCafe 공통) */
  function cafeSpotInfoWindowHtml(poi, course) {
    const lat = poi.coord[0];
    const lng = poi.coord[1];
    const searchQuery = [poi.name, course.city, '대한민국', '카페'].filter(Boolean).join(' ');
    const name = escapeHtml(poi.name);
    const category = poi.category ? escapeHtml(poi.category) : '';
    const note = poi.note ? escapeHtml(poi.note) : '';
    return (
      `<div style="font-family:Pretendard,sans-serif;min-width:180px;max-width:260px;padding:4px 2px 2px">` +
      `<div style="font-size:0.82rem;font-weight:700;color:${CAFE_SPOT_COLOR};margin-bottom:4px">☕ 추천 카페</div>` +
      `<div style="font-size:0.92rem;font-weight:700">${name}</div>` +
      (category ? `<div style="font-size:0.78rem;color:#64748B;margin-top:2px">${category}</div>` : '') +
      (note ? `<div style="font-size:0.8rem;margin-top:6px;line-height:1.45;color:#334155">${note}</div>` : '') +
      googleMapsPoiLinksHtml(lat, lng, searchQuery) +
      `</div>`
    );
  }

  /** 편의시설 (카페 제외 — 카페는 전용 마커로 표시) */
  function facilityInfoWindowHtml(fac, course, cfg) {
    const name = escapeHtml(fac.name);
    const headerColor = cfg.color || '#6B7280';
    return (
      `<div style="font-family:Pretendard,sans-serif;min-width:160px;max-width:260px;padding:4px 2px 2px">` +
      `<div style="font-size:0.82rem;font-weight:700;color:${headerColor};margin-bottom:2px">${cfg.emoji} ${escapeHtml(cfg.label)}</div>` +
      `<div style="font-size:0.88rem;font-weight:600">${name}</div>` +
      `</div>`
    );
  }

  function apiKey() {
    return (typeof window.GOOGLE_MAPS_API_KEY === 'string' && window.GOOGLE_MAPS_API_KEY.trim()) || '';
  }

  function loadGoogleMaps() {
    if (window.google && window.google.maps && typeof window.google.maps.Map === 'function') {
      return Promise.resolve();
    }
    if (mapsLoadPromise) return mapsLoadPromise;

    const key = apiKey();
    if (!key) {
      return Promise.reject(new Error('GOOGLE_MAPS_API_KEY 비어 있음'));
    }

    mapsLoadPromise = new Promise((resolve, reject) => {
      const cb = `__runKoreaGmCb_${Date.now()}`;
      window[cb] = () => {
        delete window[cb];
        resolve();
      };
      const s = document.createElement('script');
      s.async = true;
      s.defer = true;
      s.onerror = () => {
        delete window[cb];
        mapsLoadPromise = null;
        reject(new Error('Google Maps 스크립트 로드 실패'));
      };
      s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&callback=${cb}`;
      document.head.appendChild(s);
    });
    return mapsLoadPromise;
  }

  function svgPinDataUrl(color) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40"><path d="M16 0C7.163 0 0 7.163 0 16c0 10 16 24 16 24S32 26 32 16C32 7.163 24.837 0 16 0z" fill="${color}" opacity="0.92"/><circle cx="16" cy="16" r="7" fill="white" opacity="0.9"/></svg>`;
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  }

  function segmentIconDataUrl(num, color) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 30 30"><circle cx="15" cy="15" r="13" fill="${color}" stroke="#fff" stroke-width="2.5"/><text x="15" y="20" text-anchor="middle" font-size="13" font-weight="800" fill="#fff" font-family="system-ui,sans-serif">${num}</text></svg>`;
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  }

  function facilityIconDataUrl(emoji, color) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><circle cx="16" cy="16" r="14" fill="${color}" stroke="#fff" stroke-width="2"/><text x="16" y="21" text-anchor="middle" font-size="15">${emoji}</text></svg>`;
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  }

  function restaurantIconDataUrl() {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36"><circle cx="18" cy="18" r="16" fill="${RESTAURANT_COLOR}" stroke="#fff" stroke-width="2.5"/><text x="18" y="24" text-anchor="middle" font-size="17">🍽</text></svg>`;
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  }

  function cafeSpotIconDataUrl() {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36"><circle cx="18" cy="18" r="16" fill="${CAFE_SPOT_COLOR}" stroke="#fff" stroke-width="2.5"/><text x="18" y="24" text-anchor="middle" font-size="17">☕</text></svg>`;
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  }

  function latLngPath(poly) {
    return poly.map(([lat, lng]) => ({ lat, lng }));
  }

  function pushOverlay(obj) {
    modalOverlays.push(obj);
  }

  function clearModalOverlays() {
    modalOverlays.forEach((o) => {
      if (o && typeof o.setMap === 'function') o.setMap(null);
      if (o && typeof o.close === 'function') o.close();
    });
    modalOverlays = [];
  }

  function extendBounds(bounds, coord) {
    if (coord && coord.length === 2) {
      bounds.extend({ lat: coord[0], lng: coord[1] });
    }
  }

  function coordsAlmostEqual(a, b, eps = 0.00008) {
    if (!a || !b || a.length < 2 || b.length < 2) return false;
    return Math.abs(a[0] - b[0]) < eps && Math.abs(a[1] - b[1]) < eps;
  }

  function poiTreatedAsCafe(poi) {
    if (!poi || !poi.category) return false;
    const c = poi.category;
    return ['카페', '브런치', '베이커리', '커피', '디저트'].some((k) => c.includes(k));
  }

  /** 편의시설(카페 제외) + spotCafe + 카페 전용 마커 + 추천 맛집 */
  function addCoursePoiMarkers(course, bounds) {
    const facilities = course.facilityMarkers || [];
    const nonCafe = facilities.filter((f) => f.type !== '카페');
    let cafeFacs = facilities.filter((f) => f.type === '카페');
    const sr = course.spotRestaurant;
    const sc = course.spotCafe;

    if (sc && sc.coord) {
      cafeFacs = cafeFacs.filter((f) => !coordsAlmostEqual(f.coord, sc.coord));
    }
    if (sr && sr.coord) {
      cafeFacs = cafeFacs.filter((f) => !coordsAlmostEqual(f.coord, sr.coord));
    }

    nonCafe.forEach((fac) => {
      if (!fac.coord || fac.coord.length < 2) return;
      extendBounds(bounds, fac.coord);
      const cfg = FACILITY_CONFIG[fac.type] || { emoji: '📍', color: '#6B7280', label: fac.type };
      const marker = new google.maps.Marker({
        position: { lat: fac.coord[0], lng: fac.coord[1] },
        map: modalMap,
        icon: {
          url: facilityIconDataUrl(cfg.emoji, cfg.color),
          scaledSize: new google.maps.Size(32, 32),
          anchor: new google.maps.Point(16, 16),
        },
      });
      const iw = new google.maps.InfoWindow({
        content: facilityInfoWindowHtml(fac, course, cfg),
      });
      marker.addListener('click', () => iw.open({ map: modalMap, anchor: marker }));
      pushOverlay(marker);
      pushOverlay(iw);
    });

    if (course.spotCafe && course.spotCafe.coord && course.spotCafe.coord.length === 2) {
      extendBounds(bounds, course.spotCafe.coord);
      const c = course.spotCafe;
      const marker = new google.maps.Marker({
        position: { lat: c.coord[0], lng: c.coord[1] },
        map: modalMap,
        icon: {
          url: cafeSpotIconDataUrl(),
          scaledSize: new google.maps.Size(36, 36),
          anchor: new google.maps.Point(18, 18),
        },
      });
      const iw = new google.maps.InfoWindow({
        content: cafeSpotInfoWindowHtml(c, course),
      });
      marker.addListener('click', () => iw.open({ map: modalMap, anchor: marker }));
      pushOverlay(marker);
      pushOverlay(iw);
    }

    cafeFacs.forEach((fac) => {
      if (!fac.coord || fac.coord.length < 2) return;
      extendBounds(bounds, fac.coord);
      const marker = new google.maps.Marker({
        position: { lat: fac.coord[0], lng: fac.coord[1] },
        map: modalMap,
        icon: {
          url: cafeSpotIconDataUrl(),
          scaledSize: new google.maps.Size(36, 36),
          anchor: new google.maps.Point(18, 18),
        },
      });
      const iw = new google.maps.InfoWindow({
        content: cafeSpotInfoWindowHtml(fac, course),
      });
      marker.addListener('click', () => iw.open({ map: modalMap, anchor: marker }));
      pushOverlay(marker);
      pushOverlay(iw);
    });

    if (sr && sr.coord && sr.coord.length === 2) {
      extendBounds(bounds, sr.coord);
      const asCafe = poiTreatedAsCafe(sr);
      const marker = new google.maps.Marker({
        position: { lat: sr.coord[0], lng: sr.coord[1] },
        map: modalMap,
        icon: {
          url: asCafe ? cafeSpotIconDataUrl() : restaurantIconDataUrl(),
          scaledSize: new google.maps.Size(36, 36),
          anchor: new google.maps.Point(18, 18),
        },
      });
      const iw = new google.maps.InfoWindow({
        content: asCafe ? cafeSpotInfoWindowHtml(sr, course) : restaurantInfoWindowHtml(sr, course),
      });
      marker.addListener('click', () => iw.open({ map: modalMap, anchor: marker }));
      pushOverlay(marker);
      pushOverlay(iw);
    }
  }

  /* 전국 지도 */
  function initMainMap(onMarkerClick) {
    const host = document.getElementById('main-map');
    if (!host) return Promise.resolve();

    return loadGoogleMaps()
      .then(() => {
        if (host.querySelector('.map-error-msg')) {
          host.innerHTML = '';
          mainMap = null;
        }
        if (mainMap) {
          renderMainMarkers(onMarkerClick);
          return;
        }
        mainMap = new google.maps.Map(host, {
          center: { lat: 36.5, lng: 127.8 },
          zoom: 7,
          gestureHandling: 'cooperative',
          mapTypeControl: true,
          streetViewControl: true,
          fullscreenControl: true,
        });
        renderMainMarkers(onMarkerClick);
      })
      .catch((err) => {
        console.error(err);
        host.innerHTML =
          '<div class="map-error-msg">Google Maps를 불러올 수 없습니다. 프로젝트 루트에 <code>.env</code>에 <code>GOOGLE_MAPS_API_KEY</code>를 넣은 뒤 <code>npm run config</code>를 실행하세요. Cloud Console에서 <strong>Maps JavaScript API</strong>를 사용 설정했는지도 확인하세요.</div>';
      });
  }

  function renderMainMarkers(onMarkerClick) {
    if (!mainMap) return;
    mainMarkers.forEach((m) => m.setMap(null));
    mainMarkers = [];

    courses.forEach((course) => {
      const color = CITY_COLORS[course.city] || '#6B7280';
      const marker = new google.maps.Marker({
        position: { lat: course.lat, lng: course.lng },
        map: mainMap,
        title: course.name,
        icon: {
          url: svgPinDataUrl(color),
          scaledSize: new google.maps.Size(32, 40),
          anchor: new google.maps.Point(16, 40),
        },
      });
      marker.addListener('click', () => {
        if (onMarkerClick) onMarkerClick(course.id);
      });
      mainMarkers.push(marker);
    });
  }

  /* 모달 지도 */
  function initModalMap(course) {
    const el = document.getElementById('modal-map');
    if (!el) return;

    loadGoogleMaps()
      .then(() => {
        setTimeout(() => {
          if (el.querySelector('.map-error-msg')) {
            el.innerHTML = '';
            modalMap = null;
          }
          if (!modalMap) {
            modalMap = new google.maps.Map(el, {
              center: { lat: course.lat, lng: course.lng },
              zoom: 14,
              gestureHandling: 'greedy',
              mapTypeControl: true,
              streetViewControl: true,
              fullscreenControl: true,
            });
          }

          clearModalOverlays();

          const color = CITY_COLORS[course.city] || '#2563EB';
          const bounds = new google.maps.LatLngBounds();

          if (course.polyline && course.polyline.length) {
            const path = latLngPath(course.polyline);
            path.forEach((p) => bounds.extend(p));

            const outline = new google.maps.Polyline({
              path,
              strokeColor: '#ffffff',
              strokeOpacity: 0.7,
              strokeWeight: 7,
              map: modalMap,
            });
            pushOverlay(outline);

            const line = new google.maps.Polyline({
              path,
              strokeColor: color,
              strokeOpacity: 0.95,
              strokeWeight: 4,
              map: modalMap,
            });
            pushOverlay(line);

            if (course.segments && course.segments.length) {
              course.segments.forEach((seg) => extendBounds(bounds, seg.coord));
            }

            if (course.segments && course.segments.length) {
              course.segments.forEach((seg, i) => {
                if (!seg.coord) return;
                const num = i + 1;
                const marker = new google.maps.Marker({
                  position: { lat: seg.coord[0], lng: seg.coord[1] },
                  map: modalMap,
                  icon: {
                    url: segmentIconDataUrl(num, color),
                    scaledSize: new google.maps.Size(30, 30),
                    anchor: new google.maps.Point(15, 15),
                  },
                });
                const iw = new google.maps.InfoWindow({
                  content: `<div style="font-family:Pretendard,sans-serif;max-width:220px;padding:4px 2px"><b>${seg.label}</b><br/><span style="font-size:0.8rem;color:#64748B">${seg.distance}</span><br/><span style="font-size:0.8rem">${seg.desc}</span></div>`,
                });
                marker.addListener('click', () => iw.open({ map: modalMap, anchor: marker }));
                pushOverlay(marker);
                pushOverlay(iw);
              });
            }

            addCoursePoiMarkers(course, bounds);

            if (!bounds.isEmpty()) {
              modalMap.fitBounds(bounds, 44);
            }
          } else {
            const bounds = new google.maps.LatLngBounds();
            extendBounds(bounds, [course.lat, course.lng]);

            const marker = new google.maps.Marker({
              position: { lat: course.lat, lng: course.lng },
              map: modalMap,
              icon: {
                url: svgPinDataUrl(color),
                scaledSize: new google.maps.Size(32, 40),
                anchor: new google.maps.Point(16, 40),
              },
            });
            const iw = new google.maps.InfoWindow({
              content: `<strong>${course.name}</strong>`,
            });
            iw.open({ map: modalMap, anchor: marker });
            pushOverlay(marker);
            pushOverlay(iw);

            addCoursePoiMarkers(course, bounds);

            if (!bounds.isEmpty()) {
              modalMap.fitBounds(bounds, 44);
            }
          }

          google.maps.event.trigger(modalMap, 'resize');
        }, 150);
      })
      .catch((err) => {
        console.error(err);
        modalMap = null;
        el.innerHTML =
          '<div class="map-error-msg map-error-msg--light">지도를 불러올 수 없습니다. API 키와 Maps JavaScript API 설정을 확인하세요.</div>';
      });
  }

  function destroyModalMap() {
    clearModalOverlays();
  }

  function flyToSegment(coord) {
    if (!modalMap || !coord || coord.length < 2) return;
    modalMap.panTo({ lat: coord[0], lng: coord[1] });
    modalMap.setZoom(15);
  }

  function flyToRestaurant(coord) {
    if (!modalMap || !coord || coord.length < 2) return;
    modalMap.panTo({ lat: coord[0], lng: coord[1] });
    modalMap.setZoom(16);
  }

  return { initMainMap, initModalMap, destroyModalMap, flyToSegment, flyToRestaurant };
})();
