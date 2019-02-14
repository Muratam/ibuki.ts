class Updater {
  private static $instance = new Updater();
  private maxIndex = -1;
  private frame = 0;
  private updateList: (() => boolean)[] = [];
  constructor() {
    requestAnimationFrame(this.applyUpdateList.bind(this));
  }
  private applyUpdateList() {
    this.frame++;
    for (let i = 0; i < Math.min(this.maxIndex + 1, this.updateList.length); i++) {
      if (this.updateList[i]() !== false) continue;
      this.updateList[i] = this.updateList[this.maxIndex];
      this.maxIndex--;
      i--;
    }
    requestAnimationFrame(this.applyUpdateList.bind(this));
  }
  public regist(fun: () => boolean) {
    this.maxIndex++;
    if (this.maxIndex === this.updateList.length) this.updateList.push(fun);
    else this.updateList[this.maxIndex] = fun;
  }
}
class Style {
  private static $instance = new Style();
  private $dom: HTMLStyleElement;
  constructor() {
    this.$dom = document.createElement("style");
    this.$dom.type = "text/css";
    this.$dom.innerHTML = "";
    document.head.appendChild(this.$dom);
  }
  public regist(code: string) {
    this.$dom.innerHTML += code;
  }
  public static withPx(x: number): string {
    return `${Math.floor(x)}px`;
  }
  public static analyzeStyleObject(style: { [key: string]: string }, hookFunc: (key: string, val: string) => void) {
    for (let key in style) {
      let val = style[key];
      if (val.constructor.name !== "Object") {
        hookFunc(key, Style.withPx(val));
        continue;
      }
      for (let kk in val) hookFunc(key + "-" + kk, Style.withPx(val[kk]));
    }
  }
  public static getCSS(style: { [key: string]: string }): string {
    let result = "";
    Style.analyzeStyleObject(style, (key, val) => {
      result += `${key}:${val};\n`
    });
    return result;
  }
  public static apply(style: { [key: string]: string }, elem: { [key: string]: string }) {
    Style.analyzeStyleObject(style, (key, val) => {
      elem["style"][key] = val;
    });
  }
}

export class Class {
  static animation = {}
  static style = {}
  static get className() {
    return this.name.toLowerCase();
  }
  // 名前を付けてclassオブジェクトにする
  static $classList = {};
  static callAtOnce() { }
  static $regist() {
    if (this.className in Class.$classList) return;
    this.callAtOnce();
    // console.log(`regist : ${this.className}`);
    let styleObj = this.style || {};
    let animObj = this.animation || {};
    let nums = (() => {
      let result = [];
      for (let key in animObj) {
        if (!isNaN(key)) result.push(key);
      }
      return result;
    })();
    let css = "";
    if (nums.length > 0) {
      let animationName = this.className + "animation";
      let keyFrames = "";
      for (let key of nums) {
        keyFrames += `${key}% \{ ${Style.getCSS(animObj[key])}\}`;
        delete animObj[key];
      }
      css = ` @keyframes ${animationName} \{ ${keyFrames}\}\n`;
      styleObj["animation-name"] = animationName;
    }
    if ("iteration" in animObj) {
      animObj["iteration-count"] = animObj.iteration;
      delete animObj.iteration;
    }
    if ("timing" in animObj) {
      animObj["timing-function"] = animObj.timing;
      delete animObj.timing;
    }
    if ("duration" in animObj) {
      if (!isNaN(animObj.duration)) animObj.duration = Math.floor(animObj.duration * 1000) + "ms";
    }
    styleObj.animation = animObj;
    let style = Style.getCSS(styleObj);
    css += `.${this.className} \{\n${style}\} \n`;
    Style.$instance.regist(css);
    Class.$classList[this.className] = styleObj;
  }
}
// 普通の DOM オブジェクトを作るならこれでOK
export class DOM extends Class {
  static attribute = {
    tag: "div"
  }
  changeClass(c, op) {
    c.$regist();
    this.$dom.classList[op](c.className);
    return this;
  }
  addClass(c) {
    return this.changeClass(c, "add");
  }
  toggleClass(c) {
    return this.changeClass(c, "toggle");
  }
  removeClass(c) {
    return this.changeClass(c, "remove");
  }
  remove() {
    this.$dom.remove();
    // WARN: GC が勝手にやってくれるので余計な処理かもしれない
    // let keys = Reflect.ownKeys(this);
    // for (let key of keys) delete this[key];
    // this.__proto__ = null;
  }
  registUpdate(updateFun) {
    updateFun = updateFun.bind(this);
    Updater.$instance.regist(() => {
      if (!updateFun) return false;
      let ok = updateFun();
      if (ok === false) this.remove();
      return ok;
    });
    return this;
  }

  set style(val) {
    Style.apply(val, this.$dom);
  }
  get text() {
    return this.$dom.innerText || "";
  }
  set text(val) {
    this.$dom.innerText = val;
  }
  get frame() { // インスタンス化してからの経過フレーム
    return Updater.$instance.frame - this.$startFrame;
  }
  constructor(parent = document.body) {
    super().constructor.$regist();
    let attrs = this.constructor.attribute;
    this.$dom = document.createElement(attrs.tag || "div");
    if (parent.$dom) parent.$dom.appendChild(this.$dom);
    else parent.appendChild(this.$dom)
    for (let key in attrs) this.$dom[key] = attrs[key];
    this.$dom.className = this.constructor.className;
    if (this.update) this.registUpdate(this.update);
    this.$startFrame = Updater.$instance.frame;
    let methods = Reflect.ownKeys(this.constructor.prototype);
    for (let method of methods) {
      if (method.startsWith("on")) {
        let name = method.toLowerCase().replace(/^on/, "");
        let func = this[method].bind(this);
        if (name === "resize") {
          window.addEventListener("resize", func);
        } else {
          this.$dom.addEventListener(name, func);
        }
      }
    }
  }
}
export class Color {
  constructor(r, g, b, a = 255) {
    this.r = this.clamp(r, 0, 255);
    this.g = this.clamp(g, 0, 255);
    this.b = this.clamp(b, 0, 255);
    this.a = this.clamp(a, 0, 255);
  }
  toString() {
    let str = x => (Math.floor(x) < 16 ? "0" : "") + Math.floor(x).toString(16);
    return `#${str(this.r)}${str(this.g)}${str(this.b)}${this.a == 255 ? "" : str(this.a)}`;
  }
  clamp(val, min, max) {
    return Math.min(max, Math.max(min, Math.floor(val)));
  }
  mul(val) {
    if (val.constructor.name === this.constructor.name) {
      return new this.constructor(val.r * this.r, val.g * this.g, val.b * this.b, val.a * this.a);
    } else {
      return new this.constructor(val * this.r, val * this.g, val * this.b);
    }
  }
}
// Ibukiエンジンをつかう場合のRootオブジェクト
export class World extends DOM {
  static style = {
    overflow: "hidden",
    position: "relative",
  }
  static callAtOnce() {
    Style.$instance.regist(`
    body { margin:0px;padding 0px; }
     *   { box-sizing: border-box; }
    `);
  }
  get innerWidth() {
    return this.width;
  }
  get innerHeight() {
    return this.height;
  }
  adjust() {
    let pWidth = this.parent.innerWidth || this.parent.width;
    let wRatio = pWidth / this.width;
    let pHeight = this.parent.innerHeight || this.parent.height;
    let hRatio = pHeight / this.height;
    let ratio = Math.min(wRatio, hRatio);
    this.style = {
      top: Math.max(0, (pHeight - this.height * ratio) / 2),
      left: Math.max(0, (pWidth - this.width * ratio) / 2),
      width: this.width,
      height: this.height,
      "transform-origin": `0px 0px`,
      transform: `scale(${ratio})`
    };
  }
  constructor(width = 960, height = 640, parent = window) {
    super();
    this.parent = parent;
    this.width = width;
    this.height = height;
    this.world = this;
    this.adjust();
  }
  onResize() {
    this.adjust();
  }
}
// Ibukiエコシステムをつかう場合の各DOMオブジェクト
// x y (相対位置), width height を持ち,parentに依存する
// ワールドの中身は,兄弟位置に依存してほしくない.
export class Block extends DOM {
  set x(val) {
    val = Math.floor(val);
    if (this.$x === val) return;
    this.$x = val;
    this.$dom.style.left = Style.withUnit(this.$x || 0);
  }
  set y(val) {
    val = Math.floor(val);
    if (this.$y === val) return;
    this.$y = val;
    this.$dom.style.top = Style.withUnit(this.$y || 0);
  }
  get x() {
    return this.$x || 0;
  }
  get y() {
    return this.$y || 0;
  }
  get margin() {
    // WARN: margin-left などの指定が効かないし,うまく動作しないかもしれない
    return (this.$dom.style.margin || this.constructor.style.margin || 0);
  }

  get width() {
    return this.$dom.offsetWidth;
  }
  get height() {
    return this.$dom.offsetHeight;
  }
  get innerWidth() {
    return this.$dom.scrollWidth;
  }
  get innerHeight() {
    return this.$dom.scrollHeight;
  }
  get left() {
    return this.x - this.margin;
  }
  get right() {
    return this.x + this.width + this.margin;
  }
  get top() {
    return this.y - this.margin;
  }
  get bottom() {
    return this.y + this.height + this.margin;
  }
  set top(val) {
    this.y = val;
  }
  set left(val) {
    this.x = val;
  }
  set bottom(val) {
    this.$dom.style.height = Style.withUnit(val - this.y);
  }
  set right(val) {
    this.$dom.style.width = Style.withUnit(val - this.x);
  }
  set height(val) {
    this.$dom.style.height = Style.withUnit(val);
  }
  set width(val) {
    this.$dom.style.width = Style.withUnit(val);
  }
  constructor(parent) {
    super(parent);
    this.world = parent.world;
    this.top = this.constructor.style.top || 0;
    this.left = this.constructor.style.left || 0;
    this.width = this.constructor.style.width || parent.innerWidth;
    this.height = this.constructor.style.height || parent.innerHeight;
    this.$dom.style.position = "absolute";
    this.$dom.style.contain = "layout paint";
  }
}
// transformでの位置の場合は x,y = 0 のまま

export class TextBlock extends Block {
  static style = {
    display: "flex",
    "justify-content": "center",
    "align-items": "center",
    overflow: "auto"
  }
  constructor(parent) {
    super(parent);
    this.style = TextBlock.style;
  }
}