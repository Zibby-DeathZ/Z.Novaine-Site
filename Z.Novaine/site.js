(function () {
  'use strict';

  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ============================================================
     Hero background scroll-zoom effect
     ============================================================ */
  function updateHeroParallax() {
    var bg = document.querySelector('.hero-bg');
    var clouds = document.querySelector('.hero-clouds');
    if (prefersReducedMotion) return;
    var maxScroll = window.innerHeight;
    var progress = Math.min(window.scrollY / maxScroll, 1);

    if (bg) {
      var bgScale = 1 + progress * 0.22;
      var bgTranslateY = progress * -30;
      bg.style.transform = 'scale(' + bgScale + ') translateY(' + bgTranslateY + 'px)';
      bg.style.opacity = String(0.5 + progress * 0.4);
    }

    if (clouds) {
      var cloudScale = 1 + progress * 0.1;
      var cloudTranslateY = progress * -180;
      clouds.style.transform = 'scale(' + cloudScale + ') translateY(' + cloudTranslateY + 'px)';
      clouds.style.opacity = String(Math.max(1 - progress * 1.4, 0));
    }
  }

  var ticking = false;
  window.addEventListener('scroll', function () {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(function () {
      updateHeroParallax();
      ticking = false;
    });
  }, { passive: true });

  /* ============================================================
     Book cover image fallback
     Re-bound after every in-place page swap, since new <img> tags
     arrive without their own listeners attached.
     ============================================================ */
  function initCoverFallbacks() {
    document.querySelectorAll('.book-cover-slot img').forEach(function (img) {
      img.addEventListener('error', function () {
        img.style.display = 'none';
        if (img.nextElementSibling) img.nextElementSibling.style.display = 'flex';
      });
    });
  }

  function initPageContent() {
    initCoverFallbacks();
    updateHeroParallax();
    window.scrollTo(0, 0);
  }

  /* ============================================================
     Persistent background music
     The <audio> element lives outside #page-content, so it is
     never recreated while navigating between pages in-place.
     ============================================================ */
  var audio = document.getElementById('themeAudio');
  var musicBtn = document.getElementById('musicToggle');
  var musicLabel = document.getElementById('musicLabel');
  var userToggledMusic = false;

  function setMusicUI(isPlaying) {
    if (!musicBtn) return;
    musicBtn.classList.toggle('playing', isPlaying);
    musicBtn.setAttribute('aria-pressed', String(isPlaying));
    if (musicLabel) musicLabel.textContent = isPlaying ? 'Pause theme' : 'Play theme';
  }

  function autoplayOnFirstInteraction(e) {
    if (userToggledMusic) return;
    if (e.target && e.target.closest && e.target.closest('#musicToggle')) return;
    audio.play().catch(function () {});
    stopAutoplayListeners();
  }

  function stopAutoplayListeners() {
    document.removeEventListener('click', autoplayOnFirstInteraction);
    document.removeEventListener('keydown', autoplayOnFirstInteraction);
  }

  if (audio && musicBtn) {
    audio.addEventListener('play', function () { setMusicUI(true); });
    audio.addEventListener('pause', function () { setMusicUI(false); });

    musicBtn.addEventListener('click', function () {
      userToggledMusic = true;
      stopAutoplayListeners();
      if (audio.paused) {
        audio.play().catch(function () {
          if (musicLabel) musicLabel.textContent = 'Add audio/theme.mp3';
        });
      } else {
        audio.pause();
      }
    });

    // Attempt autoplay as soon as the real page loads. Browsers block
    // audio with sound until the visitor interacts at least once, so if
    // this is rejected, the very next click or keypress anywhere on the
    // page (other than the toggle button, which handles itself) starts it.
    var playAttempt = audio.play();
    if (playAttempt !== undefined) {
      playAttempt.catch(function () {
        document.addEventListener('click', autoplayOnFirstInteraction);
        document.addEventListener('keydown', autoplayOnFirstInteraction);
      });
    }
  }

  /* ============================================================
     In-place navigation
     Swaps only #page-content so the audio, nav, and background
     layers are never destroyed when moving between pages.
     Falls back to a normal page load if fetch is unavailable
     (e.g. when opening the files directly as file:// URLs).
     ============================================================ */
  function updateActiveNav(url) {
    document.querySelectorAll('.nav-links a').forEach(function (a) {
      if (a.href === url.href) {
        a.setAttribute('aria-current', 'page');
      } else {
        a.removeAttribute('aria-current');
      }
    });
  }

  function swapContent(html, url, pushState) {
    var doc = new DOMParser().parseFromString(html, 'text/html');
    var newContent = doc.getElementById('page-content');
    var current = document.getElementById('page-content');
    if (!newContent || !current) {
      window.location.href = url.href;
      return;
    }
    current.replaceWith(newContent);
    document.title = doc.title;
    updateActiveNav(url);
    if (pushState) {
      history.pushState({ url: url.href }, '', url.href);
    }
    initPageContent();
  }

  function navigateTo(url, pushState) {
    fetch(url.href)
      .then(function (res) {
        if (!res.ok) throw new Error('Network response was not ok');
        return res.text();
      })
      .then(function (html) {
        swapContent(html, url, pushState);
      })
      .catch(function () {
        // Most likely running from a file:// URL, where fetch of local
        // files is blocked by the browser. Fall back to a real navigation.
        window.location.href = url.href;
      });
  }

  document.addEventListener('click', function (e) {
    var a = e.target.closest('a');
    if (!a) return;
    if (a.target === '_blank' || a.hasAttribute('download')) return;

    var url;
    try {
      url = new URL(a.getAttribute('href'), window.location.href);
    } catch (err) {
      return;
    }

    if (url.origin !== window.location.origin) return;
    if (!/\.html?$/.test(url.pathname)) return;

    e.preventDefault();
    if (url.href === window.location.href) return;
    navigateTo(url, true);
  });

  window.addEventListener('popstate', function () {
    navigateTo(new URL(window.location.href), false);
  });

  /* ============================================================
     Initial setup for whichever page actually loaded
     ============================================================ */
  initPageContent();
})();
