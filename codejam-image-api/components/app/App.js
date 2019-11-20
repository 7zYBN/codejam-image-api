import Canvas from "../canvas/CanvasComponent.js";
import ImageLoader from "../../services/ImageLoader.js";

export default class App {
  constructor() {
    this._elements = {
      current: document.querySelector(".current"),
      previous: document.querySelector(".previous"),
      tools: document.querySelector(".tools"),
      canvas: document.querySelector(".canvas"),
      "paint-bucket": document.querySelector(".paint-bucket"),
      "choose-color": document.querySelector(".choose-color"),
      pencil: document.querySelector(".pencil"),
      transform: document.querySelector(".transform"),
    };

    this._state = { color: this._initCurrentStateColor() };
  }

  _auth() {
    const authenticator = new netlify.default({}); // eslint-disable-line new-cap
    authenticator.authenticate({ provider: "github", scope: "user" }, async (err, data) => {
      if (err) {
        alert(`Error Authenticating with GitHub: ${ err }`);// eslint-disable-line no-alert
      } else {
        const url = "https://api.github.com/user";
        const options = {
          headers: {
            Authorization: `token ${ data.token }`,
          },
        };
        const imageLoader = new ImageLoader(url, options);
        const fetchedObject = await imageLoader.getData();

        this._createLoginElements(fetchedObject);
      }
    });
  }

  _createLoginElements(fetchedObject) {
    const container = document.querySelector(".auth_block");
    const avatar = document.createElement("img");
    const username = document.createElement("label");

    avatar.src = fetchedObject.avatar_url;
    avatar.width = 40;
    username.innerHTML = fetchedObject.login;

    container.innerHTML = "";
    container.appendChild(avatar);
    container.appendChild(username);

    return this;
  }

  _setLogInListener() {
    document.querySelector(".auth_block--button").addEventListener("click", () => {
      this._auth();
    });
  }

  build() {
    this._getInfoFromLocalStorage();
    this._buildMainElements();
    this._setEventListeners();
    this._activateTool((this._storage) ? this._storage.tool : "Pencil");
  }

  _initCurrentStateColor() {
    const { current, previous } = this._elements;

    return {
      current: current.style.backgroundColor || this._getComputedBackground(current),
      previous: previous.style.backgroundColor || this._getComputedBackground(previous),
    };
  }

  get _currentColor() {
    return this._state.color.current;
  }

  _getInfoFromLocalStorage() {
    const storageInfo = JSON.parse(localStorage.getItem("state"));

    this._storage = storageInfo;
  }

  _setInfoToLocalStorage() {
    const storageInfo = {
      tool: this._state.tool,
      color: this._state.color,
      resizerValue: document.querySelector("output").value,
    };

    localStorage.setItem("state", JSON.stringify(storageInfo));
  }

  _buildMainElements() {
    const { current, previous } = this._elements;

    if (this._storage) {
      document.querySelector("input[type=\"range\"]").value = this._storage.resizerValue;
      this._calculateResizerStyles();
      current.style.backgroundColor = this._storage.color.current;
      previous.style.backgroundColor = this._storage.color.previous;
      this._state.color = this._initCurrentStateColor();
    }

    this._canvas = new Canvas(document.querySelector("output").value);
  }

  _setEventListeners() {
    this._setToolsListeners();
    this._setColorsListeners();
    this._setCanvasListener();
    this._setCanvasButtonsListeners();
    this._setSizerListeners();
    this._setLogInListener();
    this._setDocumentListeners();
  }

  _setToolsListeners() {
    const transformTool = this._elements.tools.lastElementChild;

    this._elements.tools.addEventListener("click", () => {
      const tool = event.target.closest(".tool.option");

      if (tool !== transformTool) {
        this._selectTool(tool);
      }
    });
  }

  _selectTool(tool) {
    [...this._elements.tools.children].forEach(children => children.classList.remove("selected-tool"));
    tool.classList.add("selected-tool");
    this._state.tool = tool.querySelector(".text").innerHTML;
    this._setInfoToLocalStorage();
  }

  _setColorsListeners() {
    const colors = document.querySelector(".colors");
    const currentColorBlock = colors.firstElementChild;
    const colorInput = document.querySelector("#color-input");

    colors.addEventListener("click", () => {
      const color = event.target.closest(".color.option");

      if (color === currentColorBlock) {
        document.querySelector(".current.icon").click();
      } else {
        this._changeColor(this._getComputedBackground(event.target.closest(".color").querySelector(".icon")));
      }

      this._setInfoToLocalStorage();
    });

    colorInput.addEventListener("change", () => {
      this._changeColor(event.target.value);
      this._setInfoToLocalStorage();
    });
  }

  _setCanvasListener() {
    const { fill, pickColor, drawLine } = this._canvas;
    const actionsDependedOnTool = {
      "Paint bucket": fill.bind(this._canvas),
      "Choose color": pickColor.bind(this._canvas),
      Pencil: drawLine.bind(this._canvas),
    };

    const applyTool = tool => actionsDependedOnTool[tool];

    let drawing = false;
    let color;
    let coords;

    const { canvas } = this._elements;

    canvas.addEventListener("mousedown", () => {
      drawing = true;
      coords = this._getCoords();
      if (this._state.tool) color = applyTool(this._state.tool)(coords, this._currentColor);
    });

    canvas.addEventListener("mousemove", () => {
      if (drawing) {
        coords = this._getCoords();
        if (this._state.tool) color = applyTool(this._state.tool)(coords, this._currentColor);
      }
    });


    canvas.addEventListener("mouseup", () => {
      drawing = false;
      if (color) this._changeColor(color);
    });
  }

  async _setCanvasButtonsListeners() {
    const loadButton = document.querySelector(".loader_container--load");
    const blackWhiteButton = document.querySelector(".loader_container--black_and_white");

    loadButton.addEventListener("click", this._loadClickHandler.bind(this));
    blackWhiteButton.addEventListener("click", this._blackAndWhiteClick.bind(this));
  }

  _calculateResizerStyles() {
    const input = document.querySelector("input[type=\"range\"]");
    const output = document.querySelector("output");
    const minValue = input.getAttribute("min");
    const maxValue = input.getAttribute("max");
    const percentForGradient = ((input.value - minValue) / (maxValue - minValue)) * 100;
    const strStyle = `-webkit-gradient(linear, left top, right top, color-stop(${ percentForGradient }%, #df7164), color-stop(${ percentForGradient }%, #F5D0CC))`;

    input.style.backgroundImage = strStyle;
    output.value = input.value;
    output.style.left = `${ ((maxValue * percentForGradient) / 100) - 20 }px`;

    return this;
  }

  _setSizerListeners() {
    const input = document.querySelector("input[type=\"range\"]");

    document.querySelector(".canvas_size_setter").addEventListener("mousedown", () => {
      document.querySelector(".canvas_size_setter").addEventListener("mousemove", this._calculateResizerStyles);
    });

    input.addEventListener("change", () => {
      this._canvas.changeCanvasSize(input.value);
      this._setInfoToLocalStorage();
    });
  }

  async _loadClickHandler() {
    const APIKey = "fd14d3909c79a1a61f2c35af27cad8b53209dcfea9f8e641908b102bc35dcdd9";
    const city = document.querySelector(".loader_container--city_filter").value || "Minsk";
    const url = `https://api.unsplash.com/photos/random?query=town,${ city }&client_id=${ APIKey }`;
    const imageLoader = new ImageLoader(url);
    const fetchedObject = await imageLoader.getData();

    this._canvas.draw(fetchedObject.urls.full);
  }

  _blackAndWhiteClick() {
    this._canvas.redrawInBlackAndWhite();
  }

  _getCoords() {
    const box = this._elements.canvas.getBoundingClientRect();
    const output = document.querySelector("output");
    const top = ((event.pageY - box.top - window.pageYOffset) * output.value) / box.height;
    const left = ((event.pageX - box.left - window.pageXOffset) * output.value) / box.width;

    return {
      top, left,
    };
  }

  _setDocumentListeners() {
    document.addEventListener("keydown", () => {
      if (!event.target.closest(".canvas_container")) {
        const actionsDependedOnKey = {
          KeyB: document.querySelector(".paint-bucket"),
          KeyP: document.querySelector(".pencil"),
          KeyC: document.querySelector(".choose-color"),
        };

        if (actionsDependedOnKey[event.code]) this._selectTool(actionsDependedOnKey[event.code]);
      }
    });
  }

  _activateTool(tool) {
    const actionsDependedOnTool = {
      "Paint bucket": "paint-bucket",
      "Choose color": "choose-color",
      Pencil: "pencil",
    };

    this._elements[actionsDependedOnTool[tool]].click();
  }

  _changeColor(newColor) {
    const { current, previous } = this._elements;
    if (this._currentColor !== newColor) {
      previous.style.backgroundColor = this._getComputedBackground(current);
      current.style.backgroundColor = newColor;
      this._state.color = this._initCurrentStateColor();
    }
  }

  _getComputedBackground(element) {
    return (this) ? window.getComputedStyle(element).getPropertyValue("background-color") : this;
  }
}
