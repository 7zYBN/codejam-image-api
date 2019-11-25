export default class CanvasComponent {
  constructor(size) {
    this._size = { width: size, height: size };

    this._initCanvas();
  }

  changeCanvasSize(value) {
    this._size = { width: value, height: value };
    this._initCanvas();
  }

  get _virtualPixel() {
    const style = getComputedStyle(this._canvas);
    const realWidth = parseFloat(style.getPropertyValue("width"));
    const realHeight = parseFloat(style.getPropertyValue("height"));
    const virtualWidth = this._canvas.width;
    const virtualHeight = this._canvas.height;

    return {
      width: realWidth / virtualWidth,
      height: realHeight / virtualHeight,
    };
  }

  _initCanvas() {
    this._canvas = document.querySelector(".canvas");

    this._canvas.width = this._size.width;
    this._canvas.height = this._size.height;
    this._context = this._canvas.getContext("2d");
    this._context.imageSmoothingEnabled = false;

    const dataURL = localStorage.getItem("canvas");

    return (dataURL) ? this.draw(dataURL) : this._clearCanvas();
  }

  _clearCanvas() {
    this._context.clearRect(0, 0, this._canvas.width, this._canvas.height);
    this.fill(undefined, "white");
  }

  _posAndSize(width, height) {
    const widthCoefficient = this._canvas.width / width;
    const heightCoefficient = this._canvas.height / height;
    const coefficient = widthCoefficient < heightCoefficient ? widthCoefficient : heightCoefficient;
    const imageWidth = width * coefficient;
    const imageHeight = height * coefficient;
    const startWidthCoordinate = (this._canvas.width - imageWidth) / 2;
    const startHeightCoordinate = (this._canvas.height - imageHeight) / 2;

    return {
      start: {
        x: startWidthCoordinate,
        y: startHeightCoordinate,
      },
      size: {
        width: imageWidth,
        height: imageHeight,
      },
    };
  }

  draw(dataURL) {
    this._image = dataURL;
    this._clearCanvas();

    const newImage = new Image();


    newImage.onload = () => {
      const { width, height } = newImage;
      const posAndSize = this._posAndSize(width, height);
      const { start, size } = posAndSize;
      this._context.drawImage(newImage, start.x, start.y, size.width, size.height);
      this._saveToLocalStorage();
    };

    newImage.crossOrigin = "Anonymous";
    newImage.src = dataURL;
  }

  redrawInBlackAndWhite() {
    if (this._image) {
      this._grayScale();
      this._saveToLocalStorage();
    } else alert("Load image at first"); // eslint-disable-line no-alert
  }

  _transformToRGBString(colorArray) {
    return (this) ? `rgb(${ colorArray[0] }, ${ colorArray[1] }, ${ colorArray[2] })` : this;
  }

  fill(coords, color) {
    this._context.fillStyle = color;
    this._context.fillRect(0, 0, this._canvas.width, this._canvas.height);
    this._saveToLocalStorage();
  }

  pickColor(coords) {
    const colorArray = this._context.getImageData(coords.x, coords.y, 1, 1).data;

    return this._transformToRGBString(colorArray);
  }

  drawLine(coords, color) {
    const { width, height } = this._virtualPixel;
    const rectWidthStart = Math.trunc(coords.x / width) * width;
    const rectHeightStart = Math.trunc(coords.y / height) * height;

    this._context.fillStyle = color;
    this._context.fillRect(rectWidthStart, rectHeightStart, width, height);
    this._saveToLocalStorage();
  }

  _saveToLocalStorage() {
    localStorage.setItem("canvas", this._canvas.toDataURL());
  }

  _grayScale() {
    const imgData = this._context.getImageData(0, 0, this._canvas.width, this._canvas.height);
    const pixels = imgData.data;

    for (let i = 0; i < pixels.length; i += 4) {
      const red = pixels[i];
      const green = pixels[i + 1];
      const blue = pixels[i + 2];
      const gray = (red * 0.3) + (green * 0.59) + (blue * 0.11);

      pixels[i] = gray;
      pixels[i + 1] = gray;
      pixels[i + 2] = gray;
    }

    this._context.putImageData(imgData, 0, 0);
  }
}
