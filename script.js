function syncPageScrollLock(){
  var hasOpenDialog = document.querySelector('dialog[open]') !== null;
  document.documentElement.classList.toggle('has-open-dialog', hasOpenDialog);
  document.body.classList.toggle('has-open-dialog', hasOpenDialog);
}

(function(){
  var section = document.getElementById('competencies');
  var ambient = document.querySelector('.competency-ambient');
  if (!section) return;

  var chips = Array.prototype.slice.call(section.querySelectorAll('.competency-chip'));
  var supportsScrollTimeline = window.CSS && window.CSS.supports && window.CSS.supports('animation-timeline: view()');

  section.dataset.motionState = supportsScrollTimeline ? 'scroll-timeline' : 'js-fallback';
  console.info('[competencies-motion] ready', {
    chips: chips.length,
    mode: section.dataset.motionState
  });

  // A coprime step scatters the reveal across the cloud instead of following
  // DOM order, so line wraps never define the animation direction.
  chips.forEach(function(chip, index){
    var revealOrder = (index * 7) % chips.length;
    chip.style.setProperty('--reveal-order', revealOrder);
    chip.style.setProperty('--reveal-start', (10 + revealOrder * 1.4) + '%');
    chip.style.setProperty('--reveal-end', (46 + revealOrder * 1.4) + '%');
  });

  if (!supportsScrollTimeline) {
    document.documentElement.classList.add('has-competency-fallback');
  }

  var hasUserScrolled = false;
  var hasMaterialized = false;
  var ticking = false;

  function updateCompetencyMotion(){
    var rect = section.getBoundingClientRect();
    var viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    var isNearby = rect.top < viewportHeight * 1.16 && rect.bottom > -viewportHeight * .16;
    var isInRevealZone = rect.top < viewportHeight * .82 && rect.bottom > viewportHeight * .18;

    if (ambient) ambient.classList.toggle('is-active', hasUserScrolled && isNearby);

    if (!supportsScrollTimeline && !hasMaterialized && hasUserScrolled && isInRevealZone) {
      hasMaterialized = true;
      section.classList.add('is-materialized');
      console.info('[competencies-motion] materializing via JS fallback');
    }

    ticking = false;
  }

  function requestMotionUpdate(){
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(updateCompetencyMotion);
  }

  window.addEventListener('scroll', function(){
    hasUserScrolled = true;
    requestMotionUpdate();
  }, { passive: true });

  window.addEventListener('resize', requestMotionUpdate, { passive: true });
  updateCompetencyMotion();
})();

(function(){
  var list = document.querySelector('.consulting-case-list');
  if (!list) return;

  var cards = Array.prototype.slice.call(list.children);
  var supportsScrollTimeline = window.CSS && window.CSS.supports && window.CSS.supports('animation-timeline: view()');

  list.dataset.motionState = supportsScrollTimeline ? 'scroll-timeline' : 'js-fallback';
  console.info('[consulting-motion] ready', {
    cards: cards.length,
    mode: list.dataset.motionState
  });

  cards.forEach(function(card, index){
    card.style.setProperty('--case-order', index);
  });

  if (supportsScrollTimeline) return;

  document.documentElement.classList.add('has-consulting-fallback');

  var hasUserScrolled = false;
  var isMaterialized = false;
  var ticking = false;

  function updateConsultingMotion(){
    var rect = list.getBoundingClientRect();
    var viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    var isInRevealZone = rect.top < viewportHeight * .9 && rect.bottom > viewportHeight * .12;

    if (!isMaterialized && hasUserScrolled && isInRevealZone) {
      isMaterialized = true;
      list.classList.add('is-materialized');
      console.info('[consulting-motion] materializing via JS fallback');
    }

    ticking = false;
  }

  function requestConsultingUpdate(){
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(updateConsultingMotion);
  }

  window.addEventListener('scroll', function(){
    hasUserScrolled = true;
    requestConsultingUpdate();
  }, { passive: true });

  window.addEventListener('resize', requestConsultingUpdate, { passive: true });
  updateConsultingMotion();
})();

function trackModalOpen(id){
  if (typeof window.op === 'function') {
    window.op('track', 'modal_opened', { dialog_id: id });
  }
}

document.addEventListener('click', function(e){
  var link = e.target.closest('a[data-openpanel-link]');
  if (!link || typeof window.op !== 'function') return;

  window.op('track', 'header_' + link.dataset.openpanelLink + '_clicked', {
    link_name: link.dataset.openpanelLink,
    link_type: link.dataset.openpanelLinkType
  });
});

function openModal(id){
  var d = document.getElementById(id);
  if (!d) return;
  d.querySelectorAll('iframe[data-src]').forEach(function(f){
    if (!f.src) f.src = f.dataset.src;
  });
  if (typeof d.showModal === 'function') {
    d.showModal();
    syncPageScrollLock();
    trackModalOpen(id);
  }
}

document.querySelectorAll('dialog').forEach(function(d){
  d.addEventListener('close', function(){
    d.querySelectorAll('iframe[data-src]').forEach(function(f){
      f.src = ''; // остановить видео при закрытии
    });
    syncPageScrollLock();
  });

  // клик по фону (вне modal-inner) закрывает попап
  d.addEventListener('click', function(e){
    var r = d.getBoundingClientRect();
    var inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
    if (!inside) d.close();
  });
});


(function(){
  var nav = document.getElementById('sideNav');
  if (!nav) return;

  function slugify(text){
    return text.toLowerCase().trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-');
  }

  var labels = document.querySelectorAll('.section-label');
  var sections = [];

  labels.forEach(function(labelEl){
    var sec = labelEl.closest('section') || labelEl.parentElement;
    if (!sec.id) sec.id = slugify(labelEl.textContent);

    var link = document.createElement('a');
    link.href = '#' + sec.id;
    link.textContent = labelEl.textContent.trim();
    link.setAttribute('data-label', labelEl.textContent.trim());
    link.setAttribute('aria-label', labelEl.textContent.trim());
    nav.appendChild(link);

    sections.push(sec);
  });

  var links = nav.querySelectorAll('a');

  function setActive(link){
    links.forEach(function(l){ l.classList.remove('active'); });
    if (link) link.classList.add('active');
  }

  // --- подавляем обсервер только на время самого скролла после клика ---
  var isManualScroll = false;
  var settleTimer = null;
  var hardCapTimer = null;

  function releaseManualScroll(){
    isManualScroll = false;
    clearTimeout(settleTimer);
    clearTimeout(hardCapTimer);
  }

  links.forEach(function(link){
    link.addEventListener('click', function(e){
      e.preventDefault();

      var id = link.getAttribute('href').slice(1);
      var target = document.getElementById(id);
      if (!target) return;

      isManualScroll = true;
      setActive(link);

      // скроллим так, чтобы верх блока оказался ровно в центре экрана —
      // то есть там же, где его "читает" IntersectionObserver ниже
      var rect = target.getBoundingClientRect();
      var targetY = rect.top + window.scrollY - window.innerHeight * 0.5;
      window.scrollTo({ top: Math.max(targetY, 0), behavior: 'smooth' });

      if (history.pushState) history.pushState(null, '', '#' + id);

      // сброс, как только скролл реально остановился
      clearTimeout(settleTimer);
      settleTimer = setTimeout(releaseManualScroll, 150);

      // страховка: даже если событий scroll не будет вовсе (клик по уже
      // видимому разделу) — подавление снимется само и обсервер не зависнет
      clearTimeout(hardCapTimer);
      hardCapTimer = setTimeout(releaseManualScroll, 1500);
    });
  });

  window.addEventListener('scroll', function(){
    if (!isManualScroll) return;
    clearTimeout(settleTimer);
    settleTimer = setTimeout(releaseManualScroll, 150);
  }, { passive: true });

  var observer = new IntersectionObserver(function(entries){
    if (isManualScroll) return;
    entries.forEach(function(entry){
      var link = nav.querySelector('a[href="#' + entry.target.id + '"]');
      if (!link) return;
      if (entry.isIntersecting){
        setActive(link);
      }
    });
  }, { rootMargin: '-45% 0px -45% 0px', threshold: 0 });

  sections.forEach(function(sec){ observer.observe(sec); });
})();

document.addEventListener('click', function(e){
  var img = e.target.closest('.modal-visual img');
  if (!img) return;

  var lightbox = document.getElementById('lightbox');
  var lightboxImg = document.getElementById('lightboxImg');
  if (!lightbox || !lightboxImg) return;

  lightboxImg.src = img.src;
  lightboxImg.alt = img.alt || '';
  lightbox.showModal();
  syncPageScrollLock();
  trackModalOpen('lightbox');
});

// клик на увеличенной картинке в лайтбоксе — закрывает именно лайтбокс
document.getElementById('lightboxImg').addEventListener('click', function(){
  document.getElementById('lightbox').close();
});


function copyCred(btn, text){
  function showCopied(){
    var icon = btn.querySelector('svg');
    var original = icon.outerHTML;
    icon.outerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg>';
    btn.classList.add('copied');
    setTimeout(function(){
      btn.querySelector('svg').outerHTML = original;
      btn.classList.remove('copied');
    }, 1200);
  }
  if (navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(text).then(showCopied);
  } else {
    var ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try{ document.execCommand('copy'); }catch(e){}
    document.body.removeChild(ta);
    showCopied();
  }
}
