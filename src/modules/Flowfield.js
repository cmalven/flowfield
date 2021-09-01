import colors from 'nice-color-palettes';
import SimplexNoise from 'simplex-noise';

/**
 * Boilerplate module using canvas
 */

class Flowfield {
  // Canvas
  canvas = null;
  ctx = null;

  // Items
  item = {
    size: 100,
    scale: 1,
  };

  // Set the size
  width = 1000;

  // Time
  lastTime = performance.now() / 1000;
  time = 0;

  // Settings
  settings = {
    resolution: 1.5,
    gridResolution: 0.015,
    noiseScale: 0.007,
    noiseIteration: 1,
    strokeCount: 8000,
    maxStrokeLength: 0.9,
    minStrokeThickness: 0.1,
    maxStrokeThickness: 0.5,
    strokeSegmentLength: 10,
    background: '#212322',
    blackAndWhite: false,
    drawGrid: false,
  };

  // Color palette
  palette;

  // Grid
  grid = [];

  // Noise
  simplex = new SimplexNoise()

  // Keep track of the number of lines drawn
  linesDrawnCount = 0;

  constructor(options = {
    containerSelector: '[data-app-container]',
  }) {
    this.options = options;
    this.container = document.querySelector(this.options.containerSelector);

    this.init();
  }

  init = () => {
    this.createGui();
    this.createCanvas();
    this.setup();
    this.update();
  }

  createGui = () => {
    if (!window.APP.gui) return;

    const folder = window.APP.gui.setFolder('Flowfield');
    folder.open();

    window.APP.gui.add(this.settings, 'gridResolution', 0.01, 0.1);
    window.APP.gui.add(this.settings, 'noiseScale', 0.0001, 0.02);
    window.APP.gui.add(this.settings, 'noiseIteration', 0.1, 5);
    window.APP.gui.add(this.settings, 'strokeCount', 100, 20000);
    window.APP.gui.add(this.settings, 'maxStrokeLength', 0.001, 1);
    window.APP.gui.add(this.settings, 'strokeSegmentLength', 0.5, 100);
    window.APP.gui.add(this.settings, 'minStrokeThickness', 0.02, 3);
    window.APP.gui.add(this.settings, 'maxStrokeThickness', 0.02, 3);
    window.APP.gui.addColor(this.settings, 'background');
    window.APP.gui.add(this.settings, 'blackAndWhite');
    window.APP.gui.add(this.settings, 'drawGrid');

    // Restart on change
    const controllers = window.APP.gui.getControllers();
    controllers.forEach(controller => {
      controller.onChange(() => {
        document.documentElement.style.setProperty('--background-color', this.settings.background);
        this.clear();
        this.resize();
        this.setup();
      });
    });
  }

  setup = () => {
    this.linesDrawnCount = 0;
    this.palette = colors[Math.floor(Math.random() * 50)];
    this.createGrid();
    this.drawGrid();
  };

  createGrid = () => {
    this.grid = [];
    const width = this.canvas.width;
    const height = this.canvas.height;
    const leftX = width * -0.5;
    const rightX = width * 1.5;
    const topY = height * -0.5;
    const bottomY = height * 1.5;
    const resolution = width * this.settings.gridResolution;
    const numColumns = (rightX - leftX) / resolution;
    const numRows = (bottomY - topY) / resolution;
    for (var columnIdx = 0, columnLength = numColumns; columnIdx < columnLength; columnIdx++) {
      let column = [];

      for (var rowIdx = 0, rowLength = numRows; rowIdx < rowLength; rowIdx++) {
        const noise = this.simplex.noise3D(columnIdx * this.settings.noiseScale, rowIdx * this.settings.noiseScale, this.settings.noiseIteration);
        const angle = this.mapToRange(noise, 0.0, 1.0, 0.0, Math.PI * 2);
        column.push(angle);
      }

      // Add the column
      this.grid.push(column);
    }
  };

  mapToRange = (value, inMin, inMax, outMin, outMax) => {
    return (value - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;
  }

  createCanvas = () => {
    this.canvas = document.createElement('canvas');
    this.container.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');
    
    // Resize
    window.addEventListener('resize', this.resize);
    this.resize();
  }

  resize = () => {
    const winRatio = window.innerHeight / window.innerWidth;
    const height = this.width * winRatio;

    this.canvas.width = this.width * this.settings.resolution;
    this.canvas.height = height * this.settings.resolution;

    this.setup();
  };

  clear = () => {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  };

  gridItemForPosition = (x, y) => {
    const columnSize = this.canvas.width / this.grid.length;
    const rowSize = this.canvas.height / this.grid[0].length;
    const gridColumn = Math.floor(x / columnSize);
    const gridRow = Math.floor(y / rowSize);
    return this.grid[gridColumn][gridRow];
  };

  drawStrokes = () => {
    if (this.linesDrawnCount >= this.settings.strokeCount) return;

    const strokesPerDraw = 300;

    for (var strokeIdx = 0; strokeIdx < strokesPerDraw; strokeIdx++) {
      // Draw
      let position = {
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
      };

      this.ctx.strokeStyle = this.settings.blackAndWhite
        ? `rgba(255, 255, 255, 1)`
        : this.palette[Math.floor(Math.random() * this.palette.length)];
      this.ctx.lineWidth = Math.random() * (this.settings.maxStrokeThickness - this.settings.minStrokeThickness) + this.settings.minStrokeThickness;
      this.ctx.beginPath();
      this.ctx.moveTo(position.x, position.y);

      let totalStrokeLength = this.settings.maxStrokeLength * Math.max(this.canvas.width, this.canvas.height);
      while (totalStrokeLength > 0) {
        let angle = this.gridItemForPosition(position.x, position.y);
        const endX = position.x + Math.cos(angle) * this.settings.strokeSegmentLength;
        const endY = position.y + Math.sin(angle) * this.settings.strokeSegmentLength;
        if (endX < 0 || endX > this.canvas.width || endY < 0 || endY > this.canvas.height) {
          totalStrokeLength = 0;
          break;
        }
        this.ctx.lineTo(endX, endY);
        position = { x: endX, y: endY };
        totalStrokeLength -= this.settings.strokeSegmentLength;
      }

      this.ctx.stroke();
      this.linesDrawnCount++;
    }
  }

  drawGrid = () => {
    if (!this.settings.drawGrid) return;
    const columnSize = this.canvas.width / this.grid.length;
    const rowSize = this.canvas.height / this.grid[0].length;

    this.grid.forEach((column, columnIdx) => {
      column.forEach((row, rowIdx) => {
        this.ctx.strokeStyle = `rgba(255, 255, 255, 0.3)`;
        this.ctx.beginPath();
        const length = columnSize * 0.8;
        const startX = columnIdx * columnSize;
        const startY = rowIdx * rowSize;
        const endX = startX + Math.cos(row) * length;
        const endY = startY + Math.sin(row) * length;
        this.ctx.moveTo(startX, startY);
        this.ctx.lineTo(endX, endY);
        this.ctx.stroke();
      });
    });
  };

  update = () => {
    if (window.APP.stats) window.APP.stats.begin();

    // Update time
    const now = performance.now() / 1000;
    this.time += now - this.lastTime;
    this.lastTime = now;

    // Update + draw
    // this.clear();
    this.drawStrokes();

    if (window.APP.stats) window.APP.stats.end();

    window.requestAnimationFrame(this.update);
  }
}

export default Flowfield;
