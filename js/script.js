(() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  const form = $('#qr-form');
  let input = $('#qr-input');
  const output = $('#qr-output');
  const heroOutput = $('#hero-qr');
  const generateButton = $('#generate-button');
  const downloadSvgButton = $('#download-svg');
  const downloadPngButton = $('#download-png');
  const copySvgButton = $('#copy-svg');
  const error = $('#field-error');
  const feedback = $('#action-feedback');
  const previewState = $('#preview-state');
  const menuToggle = $('.menu-toggle');
  const nav = $('.main-nav');
  const typeTabs = $$('.type-tab');
  const dotStyle = $('#dot-style');
  const cornerStyle = $('#corner-style');
  const qrColor = $('#qr-color');
  const bgColor = $('#bg-color');
  const errorLevel = $('#error-level');

  let qrCode = null;
  let currentSvg = '';
  let generationCount = 0;
  let activeType = 'website';
  let latestContent = 'https://example.com';

  document.documentElement.classList.add('js-motion');

  const progressBar = $('.scroll-progress span');
  let scrollQueued = false;

  const updateProgress = () => {
    if (!progressBar) return;

    const max = document.documentElement.scrollHeight - innerHeight;
    const progress = max > 0 ? Math.min(1, scrollY / max) : 0;

    progressBar.style.transform = `scaleX(${progress})`;
    scrollQueued = false;
  };

  addEventListener('scroll', () => {
    if (!scrollQueued) {
      requestAnimationFrame(updateProgress);
      scrollQueued = true;
    }
  }, { passive: true });

  updateProgress();

  const revealTargets = $$(
    '.section-heading, .section-heading h2, .section-intro, ' +
    '.feature-card, .feature-card h3, .feature-card p, ' +
    '.studio-heading, .studio-shell, .how-card, .how-card h3, ' +
    '.how-card p, .faq-heading, .faq-list, .closing-inner h2, ' +
    '.closing-inner .button, .hero-copy .eyebrow, .hero-copy h1, ' +
    '.hero-description, .hero-actions, .hero-footnote'
  );

  if (
    'IntersectionObserver' in window &&
    !matchMedia('(prefers-reduced-motion: reduce)').matches
  ) {
    const revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.12,
      rootMargin: '0px 0px -30px 0px'
    });

    revealTargets.forEach(element => revealObserver.observe(element));
  } else {
    revealTargets.forEach(element => {
      element.classList.add('is-visible');
    });
  }

  // Reveal heading characters in sequence when headings enter the viewport.
  const typingHeadings = $$(
    '.section-heading h2, .studio-heading h2, .how-heading h2, ' +
    '.faq-heading h2, .closing-inner h2, .feature-card h3, .how-card h3'
  );

  const splitTextNodes = (node, counter) => {
    [...node.childNodes].forEach(child => {
      if (child.nodeType === Node.TEXT_NODE) {
        const fragment = document.createDocumentFragment();

        [...child.textContent].forEach(character => {
          if (character === '\n') return;

          const span = document.createElement('span');

          span.className = 'letter-char';
          span.style.setProperty('--char-index', counter.value++);
          span.setAttribute('aria-hidden', 'true');
          span.textContent = character === ' ' ? '\u00a0' : character;

          fragment.appendChild(span);
        });

        child.replaceWith(fragment);
      } else if (
        child.nodeType === Node.ELEMENT_NODE &&
        child.tagName !== 'BR'
      ) {
        splitTextNodes(child, counter);
      }
    });
  };

  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
    typingHeadings.forEach(heading => {
      if (heading.dataset.lettersReady) return;

      heading.dataset.lettersReady = 'true';

      heading.setAttribute(
        'aria-label',
        heading.textContent.replace(/\s+/g, ' ').trim()
      );

      const counter = { value: 0 };

      splitTextNodes(heading, counter);
    });

    if ('IntersectionObserver' in window) {
      const typingObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.remove('typing-visible');

            requestAnimationFrame(() => {
              entry.target.classList.add('typing-visible');
            });

            typingObserver.unobserve(entry.target);
          }
        });
      }, {
        threshold: 0.45,
        rootMargin: '0px 0px -8% 0px'
      });

      typingHeadings.forEach(heading => {
        typingObserver.observe(heading);
      });
    } else {
      typingHeadings.forEach(heading => {
        heading.classList.add('typing-visible');
      });
    }
  }

  const field = (
    label,
    name,
    placeholder,
    type = 'text',
    full = false
  ) => `
    <div class="field-group${full ? ' full' : ''}">
      <label for="extra-${name}">${label}</label>
      <input
        id="extra-${name}"
        name="${name}"
        type="${type}"
        placeholder="${placeholder}"
        maxlength="500"
        ${name === 'email' ? 'autocomplete="email"' : ''}
      >
    </div>
  `;

  const typeConfig = {
    website: {
      label: 'WEBSITE URL',
      placeholder: 'https://example.com',
      inputType: 'url',
      hint: 'Paste the full web address you want people to visit.',
      value: 'https://example.com'
    },

    text: {
      label: 'YOUR TEXT',
      placeholder: 'Write a message, address or note…',
      inputType: 'text',
      hint: 'Plain text is encoded directly into the QR code.',
      value: ''
    },

    pdf: {
      label: 'PUBLIC PDF LINK',
      placeholder: 'https://example.com/document.pdf',
      inputType: 'url',
      hint: 'Paste a shareable link to a PDF already hosted online.',
      value: ''
    },

    image: {
      label: 'PUBLIC IMAGE LINK',
      placeholder: 'https://example.com/image.jpg',
      inputType: 'url',
      hint: 'Paste a public link to an image already hosted online.',
      value: ''
    },

    vcard: {
      label: 'CONTACT NAME',
      placeholder: 'Full name',
      inputType: 'text',
      hint: 'Create a contact card that can be saved from a phone.',
      value: ''
    },

    email: {
      label: 'RECIPIENT EMAIL',
      placeholder: 'hello@example.com',
      inputType: 'email',
      hint: 'Creates a mailto link that opens the visitor’s email app.',
      value: ''
    }
  };

  let currentInput = input;

  function configureType(type) {
    if (!typeConfig[type] || !currentInput) return;

    activeType = type;

    typeTabs.forEach(tab => {
      const selected = tab.dataset.type === type;

      tab.classList.toggle('active', selected);
      tab.setAttribute('aria-selected', String(selected));
    });

    const config = typeConfig[type];
    const label = $('#content-label');
    const hint = $('#field-hint');
    const extraFields = $('#extra-fields');

    currentInput.type = config.inputType;
    currentInput.value = config.value;
    currentInput.placeholder = config.placeholder;
    currentInput.required = true;

    if (label) label.textContent = config.label;
    if (hint) hint.textContent = config.hint;

    if (extraFields) extraFields.innerHTML = '';

    if (type === 'text' && currentInput.tagName !== 'TEXTAREA') {
      currentInput.outerHTML = `
        <textarea
          id="qr-input"
          name="content"
          placeholder="Write a message, address or note…"
          maxlength="2000"
          required
        ></textarea>
      `;

      currentInput = $('#qr-input');
    } else if (
      type !== 'text' &&
      currentInput.tagName === 'TEXTAREA'
    ) {
      currentInput.outerHTML = `
        <input
          id="qr-input"
          name="content"
          type="${config.inputType}"
          placeholder="${config.placeholder}"
          maxlength="2000"
          required
        >
      `;

      currentInput = $('#qr-input');
    }

    input = currentInput;

    if (type === 'vcard' && extraFields) {
      extraFields.innerHTML =
        field('PHONE NUMBER', 'phone', '+1 555 0100', 'tel') +
        field('EMAIL ADDRESS', 'contact-email', 'name@example.com', 'email') +
        field('ORGANISATION', 'org', 'Company or organisation');
    } else if (type === 'email' && extraFields) {
      extraFields.innerHTML =
        field('EMAIL SUBJECT', 'subject', 'A quick hello') +
        field(
          'MESSAGE (OPTIONAL)',
          'message',
          'Write a short message',
          'text',
          true
        );
    }

    if (error) error.textContent = '';
    currentInput?.removeAttribute('aria-invalid');

    if (feedback) {
      feedback.textContent =
        type === 'pdf' || type === 'image'
          ? 'Use a public, shareable file URL.'
          : 'Choose your content, then generate your code.';
    }
  }

  typeTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      configureType(tab.dataset.type);
    });
  });

  const getContent = () => {
    const value = currentInput.value.trim();

    if (activeType === 'vcard') {
      const phone = $('#extra-phone')?.value.trim() || '';
      const email = $('#extra-contact-email')?.value.trim() || '';
      const org = $('#extra-org')?.value.trim() || '';

      return [
        'BEGIN:VCARD',
        'VERSION:3.0',
        `FN:${value}`,
        phone && `TEL:${phone}`,
        email && `EMAIL:${email}`,
        org && `ORG:${org}`,
        'END:VCARD'
      ].filter(Boolean).join('\n');
    }

    if (activeType === 'email') {
      const subject = $('#extra-subject')?.value.trim() || '';
      const message = $('#extra-message')?.value.trim() || '';

      return `mailto:${value}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
    }

    return value;
  };

  const normaliseUrl = value => {
    if (!/^[a-zA-Z][a-zA-Z\d+.-]*:/.test(value)) {
      return `https://${value}`;
    }

    return value;
  };

  const isUrlType = () => {
    return ['website', 'pdf', 'image'].includes(activeType);
  };

  const validateContent = content => {
    if (!content.trim()) {
      return 'Please add content before generating your QR code.';
    }

    if (content.length > 2000) {
      return 'Please keep the encoded content under 2,000 characters.';
    }

    if (isUrlType()) {
      try {
        const url = new URL(normaliseUrl(content));

        if (!['http:', 'https:'].includes(url.protocol)) {
          return 'Please use a valid public http or https link.';
        }
      } catch {
        return 'Please enter a valid URL, including its domain name.';
      }
    }

    if (
      activeType === 'email' &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(content)
    ) {
      return 'Please enter a valid email address.';
    }

    if (activeType === 'vcard' && !content) {
      return 'Please enter a contact name.';
    }

    return '';
  };

  const qrOptions = (data, size, type = 'svg') => ({
    width: size,
    height: size,
    type,
    data,
    margin: 8,

    qrOptions: {
      errorCorrectionLevel: errorLevel.value
    },

    dotsOptions: {
      color: qrColor.value,
      type: dotStyle.value
    },

    cornersSquareOptions: {
      color: qrColor.value,
      type: cornerStyle.value
    },

    cornersDotOptions: {
      color: qrColor.value,
      type: cornerStyle.value === 'square' ? 'square' : 'dot'
    },

    backgroundOptions: {
      color: bgColor.value
    }
  });

  const getSvg = async instance => {
    const blob = await instance.getRawData('svg');

    if (!blob) {
      throw new Error('SVG export is unavailable. Please try again.');
    }

    return typeof blob === 'string' ? blob : await blob.text();
  };

  async function generate() {
    if (!currentInput || !form) return;

    const raw = currentInput.value.trim();
    let content = getContent();

    if (isUrlType() && raw) {
      content = normaliseUrl(raw);
    }

    const validation = validateContent(
      activeType === 'vcard' || activeType === 'email'
        ? raw
        : content
    );

    if (validation) {
      error.textContent = validation;
      currentInput.setAttribute('aria-invalid', 'true');
      currentInput.focus();
      return;
    }

    if (typeof QRCodeStyling === 'undefined') {
      error.textContent =
        'The QR generator could not load. Check your internet connection and refresh.';

      feedback.textContent = 'Generator unavailable.';
      return;
    }

    error.textContent = '';
    currentInput.removeAttribute('aria-invalid');

    generateButton.disabled = true;
    $('.button-label', generateButton).textContent = 'Generating…';

    feedback.textContent = 'Creating your QR code…';
    previewState.textContent = 'GENERATING';

    try {
      latestContent = content;
      output.innerHTML = '';

      qrCode = new QRCodeStyling(
        qrOptions(content, 640, 'svg')
      );

      qrCode.append(output);

      await new Promise(resolve => requestAnimationFrame(resolve));

      currentSvg = await getSvg(qrCode);

      generationCount += 1;

      previewState.textContent =
        `READY / ${String(generationCount).padStart(3, '0')}`;

      downloadSvgButton.disabled = false;
      downloadPngButton.disabled = false;
      copySvgButton.disabled = false;

      feedback.textContent =
        'Your QR code is ready. Scan it with your phone to test it.';
    } catch (err) {
      currentSvg = '';

      downloadSvgButton.disabled = true;
      downloadPngButton.disabled = true;
      copySvgButton.disabled = true;

      previewState.textContent = 'TRY AGAIN';

      feedback.textContent =
        err.message || 'Something went wrong. Please try again.';
    } finally {
      generateButton.disabled = false;
      $('.button-label', generateButton).textContent = 'Generate QR code';
    }
  }

  if (form) {
    form.addEventListener('submit', event => {
      event.preventDefault();
      generate();
    });

    form.addEventListener('input', event => {
      if (event.target.matches('#qr-input')) {
        error.textContent = '';
        event.target.removeAttribute('aria-invalid');
      }
    });
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = filename;

    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  downloadSvgButton.addEventListener('click', () => {
    if (!currentSvg) return;

    downloadBlob(
      new Blob([currentSvg], {
        type: 'image/svg+xml;charset=utf-8'
      }),
      'scanzo-qr-code.svg'
    );

    feedback.textContent = 'SVG download started.';
  });

  downloadPngButton.addEventListener('click', async () => {
    if (!latestContent) return;

    try {
      const pngQr = new QRCodeStyling(
        qrOptions(latestContent, 1200, 'canvas')
      );

      const blob = await pngQr.getRawData('png');

      if (!blob) {
        throw new Error('PNG export could not be created.');
      }

      downloadBlob(blob, 'scanzo-qr-code.png');

      feedback.textContent = 'PNG download started.';
    } catch (err) {
      feedback.textContent =
        err.message || 'PNG export failed. Please try again.';
    }
  });

  copySvgButton.addEventListener('click', async () => {
    if (!currentSvg) return;

    try {
      await navigator.clipboard.writeText(currentSvg);

      feedback.textContent = 'SVG markup copied to clipboard.';
    } catch {
      const area = document.createElement('textarea');

      area.value = currentSvg;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.opacity = '0';

      document.body.appendChild(area);
      area.select();

      const copied = document.execCommand('copy');

      area.remove();

      feedback.textContent = copied
        ? 'SVG markup copied to clipboard.'
        : 'Clipboard access was blocked by your browser.';
    }
  });

  [dotStyle, cornerStyle, qrColor, bgColor, errorLevel].forEach(control => {
    control.addEventListener('change', () => {
      $('#qr-color-value').textContent = qrColor.value.toUpperCase();
      $('#bg-color-value').textContent = bgColor.value.toUpperCase();

      if (qrCode && currentSvg) {
        generate();
      }
    });
  });

  qrColor.addEventListener('input', () => {
    $('#qr-color-value').textContent = qrColor.value.toUpperCase();
  });

  bgColor.addEventListener('input', () => {
    $('#bg-color-value').textContent = bgColor.value.toUpperCase();
  });

  // Mobile navigation menu.
  menuToggle.addEventListener('click', () => {
    const open = menuToggle.getAttribute('aria-expanded') === 'true';

    menuToggle.setAttribute('aria-expanded', String(!open));
    nav.classList.toggle('open', !open);
  });

  // Navigation links and their matching page sections.
  const navLinks = $$('.nav-link');

  const navSections = navLinks
    .map(link => {
      const href = link.getAttribute('href');

      if (!href || !href.startsWith('#')) return null;

      return $(href);
    })
    .filter(Boolean);

  navLinks.forEach(link => {
    link.addEventListener('click', () => {
      nav.classList.remove('open');
      menuToggle.setAttribute('aria-expanded', 'false');
    });
  });

  // Set the active navigation item.
  const setActiveNav = id => {
    navLinks.forEach(link => {
      const active = link.getAttribute('href') === `#${id}`;

      link.classList.toggle('active', active);

      if (active) {
        link.setAttribute('aria-current', 'location');
      } else {
        link.removeAttribute('aria-current');
      }
    });
  };

  // Update the active navigation item during manual scrolling.
  let scrollFrame = false;

  const updateActiveNav = () => {
    scrollFrame = false;

    if (!navSections.length) return;

    const activationLine = Math.min(180, innerHeight * 0.3);
    let currentSection = navSections[0];

    navSections.forEach(section => {
      if (section.getBoundingClientRect().top <= activationLine) {
        currentSection = section;
      }
    });

    // Keep the final navigation item active at the bottom of the page.
    if (
      scrollY + innerHeight >=
      document.documentElement.scrollHeight - 2
    ) {
      currentSection = navSections[navSections.length - 1];
    }

    if (currentSection) {
      setActiveNav(currentSection.id);
    }
  };

  addEventListener('scroll', () => {
    if (!scrollFrame) {
      requestAnimationFrame(updateActiveNav);
      scrollFrame = true;
    }
  }, { passive: true });

  addEventListener('resize', updateActiveNav);

  // Keep the navigation correct when a link or browser history changes the hash.
  addEventListener('hashchange', () => {
    const id = location.hash.slice(1);

    if (navSections.some(section => section.id === id)) {
      setActiveNav(id);
    }
  });

  // Set the correct item on initial page load.
  if (location.hash) {
    const id = location.hash.slice(1);

    if (navSections.some(section => section.id === id)) {
      setActiveNav(id);
    } else {
      updateActiveNav();
    }
  } else {
    updateActiveNav();
  }

  // Build the interactive QR pattern in the hero section.
  function buildInteractiveHero() {
    if (!heroOutput || typeof QRCodeStyling === 'undefined') return;

    if (typeof window.qrcode !== 'function') {
      heroOutput.innerHTML =
        '<div class="hero-qr-fallback">SCANZO</div>';
      return;
    }

    const matrix = window.qrcode(0, 'M');

    matrix.addData('https://fawasul-rahuman.github.io/Scanzo/');
    matrix.make();

    const count = matrix.getModuleCount();
    const fragment = document.createDocumentFragment();
    const darkCells = [];

    heroOutput.style.setProperty('--qr-count', count);
    heroOutput.innerHTML = '';

    for (let row = 0; row < count; row++) {
      for (let col = 0; col < count; col++) {
        const cell = document.createElement('span');
        const dark = matrix.isDark(row, col);

        cell.className = `qr-cell${dark ? ' is-dark' : ''}`;
        cell.dataset.row = String(row);
        cell.dataset.col = String(col);

        fragment.appendChild(cell);

        if (dark) {
          darkCells.push({ element: cell, row, col });
        }
      }
    }

    heroOutput.appendChild(fragment);

    const finePointer =
      matchMedia('(hover: hover) and (pointer: fine)').matches &&
      !matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!finePointer) return;

    let pointer = null;
    let frame = 0;

    const clear = () => {
      darkCells.forEach(cell => {
        cell.element.classList.remove('is-active', 'is-near');
      });
    };

    const update = () => {
      frame = 0;

      if (!pointer) return;

      const bounds = heroOutput.getBoundingClientRect();
      const unitX = bounds.width / count;
      const unitY = bounds.height / count;

      const col = Math.max(
        0,
        Math.min(
          count - 1,
          Math.floor((pointer.x - bounds.left) / unitX)
        )
      );

      const row = Math.max(
        0,
        Math.min(
          count - 1,
          Math.floor((pointer.y - bounds.top) / unitY)
        )
      );

      let closest = null;
      let closestDistance = Infinity;

      darkCells.forEach(cell => {
        const dx = cell.col - col;
        const dy = cell.row - row;
        const distance = Math.hypot(dx, dy);

        cell.element.classList.remove('is-active', 'is-near');

        cell.element.style.removeProperty('--ndx');
        cell.element.style.removeProperty('--ndy');

        if (distance < closestDistance) {
          closestDistance = distance;
          closest = cell;
        }

        if (distance > 0 && distance <= 2.7) {
          cell.element.classList.add('is-near');

          cell.element.style.setProperty(
            '--ndx',
            `${Math.sign(dx || 1) * (2.7 - distance) * 1.6}px`
          );

          cell.element.style.setProperty(
            '--ndy',
            `${Math.sign(dy || -1) * (2.7 - distance) * 1.6}px`
          );
        }
      });

      if (closest) {
        closest.element.classList.add('is-active');

        closest.element.style.setProperty(
          '--dx',
          `${(closest.col - col) * 2}px`
        );

        closest.element.style.setProperty(
          '--dy',
          `${(closest.row - row) * 2}px`
        );

        closest.element.style.setProperty(
          '--rx',
          `${(row - closest.row) * 3}deg`
        );

        closest.element.style.setProperty(
          '--ry',
          `${(col - closest.col) * 3}deg`
        );
      }
    };

    heroOutput.addEventListener('pointermove', event => {
      pointer = {
        x: event.clientX,
        y: event.clientY
      };

      if (!frame) {
        frame = requestAnimationFrame(update);
      }
    });

    heroOutput.addEventListener('pointerleave', () => {
      pointer = null;

      if (frame) {
        cancelAnimationFrame(frame);
        frame = 0;
      }

      clear();
    });
  }

  // Load the QR matrix library for the hero animation.
  const matrixScript = document.createElement('script');

  matrixScript.src =
    'https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js';

  matrixScript.onload = buildInteractiveHero;

  matrixScript.onerror = () => {
    if (heroOutput) {
      heroOutput.innerHTML =
        '<div class="hero-qr-fallback">SCANZO</div>';
    }
  };

  document.head.appendChild(matrixScript);

  // Display a sample QR code when the generator first loads.
  const initialQr = () => {
    if (
      typeof QRCodeStyling === 'undefined' ||
      !output ||
      !downloadSvgButton ||
      !downloadPngButton ||
      !copySvgButton
    ) {
      return;
    }

    qrCode = new QRCodeStyling(
      qrOptions('https://example.com', 640, 'svg')
    );

    output.innerHTML = '';
    qrCode.append(output);

    getSvg(qrCode)
      .then(svg => {
        currentSvg = svg;
        latestContent = 'https://example.com';

        downloadSvgButton.disabled = false;
        downloadPngButton.disabled = false;
        copySvgButton.disabled = false;

        previewState.textContent = 'READY / 001';

        feedback.textContent =
          'Sample QR ready — change the content and generate your own.';

        generationCount = 1;
      })
      .catch(() => {});
  };

  initialQr();
})();
