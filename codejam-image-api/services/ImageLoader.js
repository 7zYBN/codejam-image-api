export default class ImageLoader {
  async getData(url, options) {
    const response = await fetch(url, options);
    return response.json();
  }
}
