export default class ImageLoader {
  constructor(url, options) {
    this.url = url;
    this._options = options;
  }

  async getData() {
    const response = await fetch(this.url, this._options);
    return response.json();
  }
}
