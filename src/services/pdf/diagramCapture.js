import { toPng } from 'html-to-image';

const DIAGRAM_TARGETS = [
  {
    id: 'architecture-v2-current',
    sectionId: 'architecture',
    title: 'Architecture V2 diagram',
    selector: '.architecture-v2-tab .arch-v2-map'
  },
  {
    id: 'architecture-system-legacy',
    sectionId: 'architecture',
    title: 'System architecture diagram',
    selector: '#system-architecture-diagram'
  },
  {
    id: 'architecture-data-flow-legacy',
    sectionId: 'architecture',
    title: 'Dynamic data flow diagram',
    selector: '#dynamic-flow-diagram'
  },
  {
    id: 'architecture-tech-stack-legacy',
    sectionId: 'architecture',
    title: 'Technology stack diagram',
    selector: '#tech-stack-diagram'
  },
  {
    id: 'repository-graph-current',
    sectionId: 'repository-graph',
    title: 'Repository relationship map',
    selector: '.ca-repo-graph-canvas'
  },
  {
    id: 'debug-trace-graph-current',
    sectionId: 'debug-navigator',
    title: 'Debug trace graph',
    selector: '.ca-debug-graph-card'
  }
];

const CONTROL_SELECTOR = [
  'button',
  'input',
  'select',
  'textarea',
  '.react-flow__controls',
  '.react-flow__minimap',
  '.react-flow__attribution',
  '.ca-repo-canvas-controls',
  '.ca-repo-fullscreen-button',
  '.arch-v2-canvas-toolbar'
].join(', ');

function getVisibleTarget(selector) {
  const element = document.querySelector(selector);
  if (!element) return null;

  const rect = element.getBoundingClientRect();
  if (rect.width < 80 || rect.height < 80) return null;
  return element;
}

function setControlsHidden(element, hidden) {
  const controls = Array.from(element.querySelectorAll(CONTROL_SELECTOR));
  controls.forEach(control => {
    if (hidden) {
      control.dataset.pdfPreviousDisplay = control.style.display || '';
      control.style.display = 'none';
    } else {
      control.style.display = control.dataset.pdfPreviousDisplay || '';
      delete control.dataset.pdfPreviousDisplay;
    }
  });
}

async function captureElementAsPng(element) {
  setControlsHidden(element, true);

  try {
    await new Promise(resolve => window.requestAnimationFrame(resolve));
    return await toPng(element, {
      cacheBust: true,
      backgroundColor: '#0f172a',
      pixelRatio: 1.5,
      quality: 0.92,
      filter: node => !node?.classList?.contains?.('react-flow__attribution')
    });
  } finally {
    setControlsHidden(element, false);
  }
}

export async function capturePdfDiagrams({ onProgress } = {}) {
  if (typeof document === 'undefined') return [];

  const captures = [];

  for (let index = 0; index < DIAGRAM_TARGETS.length; index += 1) {
    const target = DIAGRAM_TARGETS[index];
    onProgress?.(`Capturing diagrams (${index + 1}/${DIAGRAM_TARGETS.length})`);

    try {
      const element = getVisibleTarget(target.selector);
      if (!element) continue;

      const image = await captureElementAsPng(element);
      if (!image) continue;

      captures.push({
        id: target.id,
        sectionId: target.sectionId,
        title: target.title,
        image
      });
    } catch (error) {
      console.warn(`Could not capture ${target.title}:`, error);
    }
  }

  return captures;
}
