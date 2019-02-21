import { Color, Colors, ColorScheme } from "./color";
import * as CSS from "./style";
import { Store, MayStore, HasValue, toStore } from "./store";
import { Updater, KeyBoard, GlobalCSS, KeysType } from "./static"
import "bootstrap";
import 'bootstrap/dist/css/bootstrap.min.css';
import * as jQuery from "jquery";
import { Placement } from "bootstrap";
import * as PIXI from 'pixi.js'

// types and interfaces
export type BorderStyle = "none" | "hidden" | "solid" | "double" | "groove" | "ridge" | "inset" | "outset" | "dashed" | "dotted"
export interface BorderContentType {
  color?: Color,
  width?: number,
  radius?: number,
  style: BorderStyle
}
export interface Border {
  top?: BorderContentType
  bottom?: BorderContentType
  left?: BorderContentType
  right?: BorderContentType
}
export type Event =
  "focus" | "blur" | "select" | "change" | "load" | "dragdrop" | "click" | "dblclick" |
  "keyup" | "keydown" | "keypress" | "keyupall" | "keydownall" | "keypressall" |
  "mouseout" | "mouseover" | "mouseup" | "mousemove" | "mousedown" | "mouseup"
export interface Vec2 { x: number, y: number }
export interface Rect {
  top?: number,
  bottom?: number
  left?: number
  right?: number
}
export type TextAlignType = "left" | "right" | "center" | "justify" | "justify-all" | "match-parent"
export type FitType = { x?: "left" | "center" | "right", y?: "top" | "center" | "bottom" }
export type TextSeed = MayStore<string> | ((p: DOM) => DOM) // そのtextで作成するか関数適応
export type TimingFunction = "ease" | "linear" | "ease-in" | "ease-out" | "ease-in-out"
export interface DOMOption {
  // そのコンテナ内部でfloatするときの位置(後続のDOMに影響を与えたい場合はnull)
  tag?: string
  class?: string[] | string// WARN: classによるアニメーションは意図したものではないので,construct時のみしか適用されない
  colorScheme?: Colors
  margin?: Rect | number
  padding?: Rect | number
  opacity?: number
  border?: Border | BorderContentType
  fontSize?: number
  fontFamily?: string
  borderRadius?: number
  textAlign?: TextAlignType
  filter?: CSS.Filter
  zIndex?: number | "auto"
  isScrollable?: boolean
}
export interface TextOption extends DOMOption {
  color?: Color | string
  isBold?: boolean
  href?: MayStore<string>,
  tag?: "span" | "code" | "pre" | "marquee" | "div"
  edge?: { color: Color, width: number }
}
export interface FitWidthDOMOption extends DOMOption { dontFitWidth?: boolean }
export interface BoxOption extends DOMOption {
  x?: number
  y?: number
  fit?: FitType
  isDraggable?: boolean // ドラッグできるか？
  width?: number  // null なら親と同じ
  height?: number // null なら親と同じ
  rotate?: number
  scale?: number  // | Vec2
}
// implements
// 一番の基本要素,各々がちょうど一つのdomに対応する.
export class DOM {
  public readonly $dom: HTMLElement = null;
  public readonly $DOMId: number;
  $scene: Scene;
  protected $createdFrame: number
  public get frame(): number { return this.$scene.$createdFrame - this.$createdFrame; }
  public readonly $parent: DOM = null; // 移ることがある？
  private $children: DOM[] = [];
  public get children() { return this.$children; }
  private static DOMMaxId: number = 0;
  public get id(): string { return this.$dom.id }
  constructor(parent: DOM, option: string | DOMOption = "") {
    this.$dom = document.createElement(
      (typeof option === "string" ? option : option.tag) || "div");
    this.$DOMId = DOM.DOMMaxId++
    this.$dom.id = `ibuki-box-${this.$DOMId}`
    if (parent !== null) {
      parent.$dom.appendChild(this.$dom);
      this.$parent = parent;
      parent.$children.push(this)
      if (parent.$scene) {
        this.$scene = parent.$scene;
        this.$createdFrame = this.$scene.$createdFrame;
      }
    }
    if (typeof option !== "string") {
      if (option.class) {
        if (typeof option.class === "string") this.$dom.classList.add(option.class)
        else for (let c of option.class) if (c) this.$dom.classList.add(c)
      }
      this.applyStyle(this.parseDOMOption(option))
    }
  }
  public update(fun: (this: this, i: number) => boolean | void | number) {
    let f = fun.bind(this);
    let i = 0;
    this.$scene.$updater.regist(() => {
      let result = f(i);
      i++;
      if (typeof result === "boolean") return result;
      if (typeof result === "number") {
        i = result
        return true
      }
      return true
    })
    return this
  }
  public perFrame(step: number = 1, n: number = Infinity): Store<number> {
    return this.$scene.$updater.perFrame(step, n)
  }

  bloom(seed: TextSeed): DOM {
    if (typeof seed === "string") return new Text(this, seed)
    if (seed instanceof Store) return new Text(this, seed)
    return seed(this)
  }

  on(name: Event, callback: (this: this, key?: KeysType) => void, bind = true) {
    let c = bind ? callback.bind(this) : callback
    if (name === "keydownall") this.$scene.$keyboard.onKeyDown(c)
    else if (name === "keyupall") this.$scene.$keyboard.onKeyUp(c)
    else if (name === "keypressall") this.$scene.$keyboard.onKeyPress(c)
    else this.$dom.addEventListener(name, e => {
      // WARN: ↑と違って毎フレームに一回呼ばれるわけではない(し、メインスレッドでもない)！同時に押されてもダメかも.
      if (!e.key) return c()
      let key = {}
      key[e.key] = true
      c(key)
    })
    return this;
  }
  applyStyle(style: { [key: string]: any }) {
    let normalized = CSS.parse(style);
    for (let key in normalized) this.$dom.style[key] = normalized[key];
    return this;
  }
  tree(func: (parent: this) => any) { func(this); return this; }
  setAttributes(attrs: { [key: string]: any }) {
    for (let key in attrs) {
      let val = attrs[key]
      if (typeof val === "boolean") {
        if (val) this.$dom.setAttribute(key, "")
        else this.$dom.removeAttribute(key)
      } else if (val instanceof Array) {
        this.$dom.setAttribute(key, val.join(" , "))
      } else if (typeof val === "string") {
        this.$dom.setAttribute(key, `${val}`)
        if (val === "color") console.warn("↑↑↑↑this is input[type=color] warning...fuck!!!")
      }
    }
    return this
  }
  parseDOMOption(option: DOMOption): CSS.Style<any> {
    let style: CSS.Style<any> = { ...option };
    if (style.colorScheme) {
      let colorScheme = new ColorScheme(option.colorScheme)
      style.backgroundColor = colorScheme.baseColor
      style.color = colorScheme.mainColor
      style.borderColor = colorScheme.accentColor
      delete style.colorScheme
    }
    if (style.isScrollable) {
      style.overflow = "scroll"
      delete style.isScrollable
    } else if (style.isScrollable === false) {
      style.overflow = "hidden"
      delete style.isScrollable
    }
    delete style.class
    delete style.tag
    return style
  }
  tooltip(text: string, placement: Placement = "top") {
    this.$dom.setAttribute("data-toggle", "tooltip")
    this.$dom.setAttribute("data-placement", placement)
    this.$dom.setAttribute("title", text)
    return this
  }
  popover(title: string, content: string, placement: Placement = "top", trigger: "hover" | "focus" | "click" = "hover") {
    this.$dom.setAttribute("data-toggle", "popover")
    this.$dom.setAttribute("data-trigger", trigger)
    this.$dom.setAttribute("data-placement", placement)
    this.$dom.setAttribute("title", title)
    this.$dom.setAttribute("data-content", content)
    return this
  }
}
export class Text extends DOM implements HasValue<string> {
  private $text: string;
  get value(): string { return this.$text; }
  set value(val: string) {
    this.$text = val.replace(" ", '\u00a0');
    this.$dom.innerText = this.$text;
  }
  constructor(parent: DOM, text: MayStore<string>, option: TextOption = {}) {
    super(parent, { ...option, tag: option.href ? "a" : "span" })
    Store.regist(text, t => this.value = t)
    if (option.href) Store.regist(option.href, t => this.$dom.setAttribute("href", t))
    this.applyStyle({
      color: typeof option.color === "string" ? Color.parse(option.color) : option.color,
      font: { weight: option.isBold && "bold" },
      ...(!option.edge ? {} : { "-webkit-text-stroke": option.edge })
    })
  }
  static assign(parent: DOM, may: TextSeed, func: ((t: string) => any)) {
    if (typeof may === "function") may(parent)
    else Store.regist(may, func)
  }
}
// 文字が右向きに流れるせいでWidthにのみFitするDOMという概念ができる.
export class FitWidthDOM extends DOM {
  fitWidth() { if (this.$parent instanceof Box) this.$dom.style.width = this.$parent.contentWidth + "px" }
  constructor(parent: DOM, option: FitWidthDOMOption = {}) {
    super(parent, option)
    if (!option.dontFitWidth) this.fitWidth()
  }
}
// 固定のwidth / height を持つもの
// 指定しなければ親と同じになる
// PIXI.js と座標系を同じにしたい.
export class Box extends DOM {
  // 全てローカル値. transform:
  width: number = undefined;
  height: number = undefined;
  x: number = undefined;
  y: number = undefined;
  scale: number = 1;
  rotate: number = 0;
  static pickNum(s: string): number {
    let result: number = null
    for (let c of s) {
      if ("0" <= c && c <= "9") result = (result || 0) * 10 + (+c)
    }
    return result
  }
  public get contentWidth(): number {
    return this.width
      - (Box.pickNum(this.$dom.style.borderRightWidth) || 0) * 2
      - (Box.pickNum(this.$dom.style.paddingRight) || 0) * 2
  }
  public get contentHeight(): number {
    return this.height
      - (Box.pickNum(this.$dom.style.borderBottomWidth) || 0) * 2
      - (Box.pickNum(this.$dom.style.paddingBottom) || 0) * 2
  }
  public readonly $parent: Box;
  constructor(parent: Box, option: BoxOption = {}) {
    super(parent, option)
    // super(parent, Box.copyDeletedTransformValues(option))
    // 全ての transform 値を number に保証
    if (parent !== null) {
      this.width = parent.contentWidth
      this.height = parent.contentHeight
    } else {
      this.width = option.width
      this.height = option.height
      console.assert(typeof this.width === "number" && typeof this.height === "number", "illegal initial World")
    }
    this.applyOptionOnCurrentState(option)
  }

  get currentTransform(): BoxOption {
    return {
      width: this.width,
      height: this.height,
      scale: this.scale,
      x: this.x,
      y: this.y,
    }
  }
  // private percentages: CSS.NumberStyle = {}
  // private realStyles: CSS.NumberStyle = {} // width / height / scale / x / y の他

  applyOptionOnCurrentState(option: BoxOption): CSS.Style<any> {
    // option を読み込み,自身に(上書きができれば)適応
    let style = this.parseBoxOptionOnCurrentTransform(option)
    this.applyTransformValues(style)

    // this.percentages を style にだけ適応する
    // for (let k in { ...style, ...this.percentages }) {
    //   if (typeof style[k] !== "number" && typeof this.percentages[k] !== "number") continue
    //   // WARN: color の乗算 階層オブジェクト(border:{})には未対応
    //   // transform 系は既にapplyTransfromValuesで適応されている
    //   if (k == "x") {
    //     style.transform.x = (this.percentages[k] || 0) * this.width + this[k]
    //   } else if (k === "y") {
    //     style.transform.y = (this.percentages[k] || 0) * this.height + this[k]
    //   } else if (k === "scale") {
    //     style.transform[k] = (this.percentages[k] || 1) * this[k]
    //   } else if (k === "rotate") {
    //     style.transform[k] = (this.percentages[k] || 0) + (style[k] || 0)
    //   } else if (k === "width" || k == "height") {
    //     style[k] = (this.percentages[k] || 1) * this[k]
    //   } else {
    //     this.realStyles[k] = style[k] || 0
    //     style[k] = (this.percentages[k] || 1) * (style[k] || 0)
    //   }
    // }
    Box.deleteTransformValues(style) // transform にて変換したので(二重になるし)削除

    this.applyStyle(style)
    // if (option.isDraggable) this.applyDraggable()
    return style

  }

  parseBoxOptionOnCurrentTransform(option: BoxOption): CSS.Style<any> {
    let transform = this.currentTransform;
    let result: CSS.Style<any> = { ...transform, ...option }
    result.position = "absolute" // 無いと後続の要素の位置がバグる
    result["transform-origin"] = `center center` // これができると rotation / scaleがいい感じになる
    if (this.$parent) {
      if (option.fit) {
        // 中心は `center center` である
        // 倍率が1倍のときにジャストフィットするような位置
        if (option.fit.x === "right") {
          result.x = this.$parent.contentWidth / 2 - result.width / 2
        } else if (option.fit.x === "left") {
          result.x = -(this.$parent.contentWidth / 2 - result.width / 2);
        } else {
          result.x = 0
        }
        if (option.fit.y === "bottom") {
          result.y = this.$parent.contentHeight / 2 - result.height / 2
        } else if (option.fit.y === "top") {
          result.y = -(this.$parent.contentHeight / 2 - result.height / 2);
        } else {
          result.y = 0
        }
        delete result.fit
      }
      if (option.fit || typeof option.x === "number")
        result.x = (result.x || 0) + this.$parent.contentWidth / 2 - result.width / 2
      if (option.fit || typeof option.y === "number")
        result.y = (result.y || 0) + this.$parent.contentHeight / 2 - result.height / 2
    }
    result.transform = new CSS.Transfrom(result.x, result.y, result.scale, result.rotate)
    return this.parseDOMOption(result);
  }

  applyTransformValues(style: CSS.Style<any>) {
    let parse = (key: string, init: number): number =>
      typeof style[key] === "number" ? style[key] : this[key] || init
    let apply = (key: string, init: number) => this[key] = parse(key, init)
    if (this.$parent !== null) {
      apply("width", this.$parent.width)
      apply("height", this.$parent.height)
    }
    apply("scale", 1.0)
    apply("y", 0)
    apply("x", 0)
  }
  static copyDeletedTransformValues(option: BoxOption): BoxOption {
    let result = { ...option }
    Box.deleteTransformValues(result)
    return result
  }
  static deleteTransformValues(style: CSS.Style<any>) {
    delete style.x
    delete style.y
    delete style.scale
  }
}

export class Scene extends Box {
  public readonly $updater: Updater;
  public readonly $keyboard: KeyBoard;
  public readonly $css: GlobalCSS;
  public readonly $parent: World
  private $mouseX: number = 0
  public get mouseX(): number { return this.$mouseX }
  private $mouseY: number = 0
  public get mouseY(): number { return this.$mouseY }
  private reservedExecuteNextFrames: (() => any)[] = []
  reserveExecuteNextFrame(fun: () => any) {
    this.reservedExecuteNextFrames.push(fun)
  }
  trackMouse(e: MouseEvent) {
    this.$mouseX = e.pageX * this.width / window.innerWidth;
    this.$mouseY = e.pageY * this.height / window.innerHeight;
  }
  constructor(parent: World) {
    super(parent, { zIndex: 50 })
    this.$updater = new Updater();
    this.$keyboard = new KeyBoard(this.$updater)
    this.$css = new GlobalCSS();
    this.$scene = this
    this.$mouseX = 0
    this.$createdFrame = 0;
    this.$updater.regist(() => {
      this.$createdFrame++;
      for (let r of this.reservedExecuteNextFrames) r()
      this.reservedExecuteNextFrames = []
      return true;
    })
    document.body.addEventListener("mousemove", this.trackMouse.bind(this))
    document.body.addEventListener("touchmove", this.trackMouse.bind(this))
    jQuery(() => { jQuery('[data-toggle="tooltip"]').tooltip(); });
    jQuery(() => { jQuery('[data-toggle="popover"]').popover(); });
  }
  destroy() {
    this.$dom.remove();
    this.$updater.destroy();
    this.$css.destroy();
    this.$keyboard.destroy();
    document.body.removeEventListener("mousemove", this.trackMouse, false)
    document.body.removeEventListener("touchmove", this.trackMouse, false)
  }
  gotoNextScene(seed: (scene: Scene) => any) {
    this.destroy()
    this.$parent.play(seed)
  }
}
// DOMの裏側に描画される.
class PIXIBox extends Box {
  app: PIXI.Application
  $dom: HTMLCanvasElement
  constructor(parent: Box, option: BoxOption = {}) {
    super(parent, { tag: "canvas" })
    this.app = new PIXI.Application({
      width: this.width, height: this.height,
      antialias: true,
      resolution: 1,
      view: this.$dom
    })
  }
}
// 画面に自動でフィットするDOM/Sceneの全ての祖
export class World extends Box {
  pixi: PIXIBox
  constructor(width: number = 1280, height: number = 720) {
    // null　なので 必要最低限が全て有るように設定
    super(null, {
      x: 0, y: 0, scale: 1, width: width, height: height,
      isScrollable: false,
    })
    document.body.appendChild(this.$dom)
    this.pixi = new PIXIBox(this)
    PIXI.Loader.shared.add('bunny', 'me.jpg').load((loader, resources) => {
      {
        const bunny = new PIXI.Sprite(resources.bunny.texture);
        bunny.x = this.width * 0.4;
        bunny.y = this.height / 2;
        bunny.anchor.x = 0.5;
        bunny.anchor.y = 0.5;
        this.pixi.app.stage.addChild(bunny);
        this.pixi.app.ticker.add(() => {
          bunny.x += 1
          bunny.rotation += 0.01;
        });
      }
    });
    this.initializeWorld()
    this.adjustWindow()
  }
  private initializeWorld() {
    let inheritFontSize = { fontFamily: "inherit", fontSize: "100%" }
    new GlobalCSS().regist({
      body: {
        margin: 0, padding: 0, overflow: "hidden", background: "#000",
        "overflow-wrap": "break-word"
      },
      "*": {
        "box-sizing": "border-box",
        // contain: "content",
      },
      textarea: inheritFontSize,
      input: inheritFontSize,
      select: inheritFontSize,
      button: inheritFontSize,
    });
    window.addEventListener("resize", () => this.adjustWindow())
  }
  private adjustWindow() {
    let pWidth = window.innerWidth;
    let wRatio = pWidth / this.width;
    let pHeight = window.innerHeight;
    let hRatio = pHeight / this.height;
    let ratio = Math.min(wRatio, hRatio);
    this.applyStyle({
      position: "relative",
      background: "#000",
      top: Math.max(0, (pHeight - this.height * ratio) / 2),
      left: Math.max(0, (pWidth - this.width * ratio) / 2),
      width: this.width,
      height: this.height,
      transformOrigin: "0px 0px",
      transform: `scale(${ratio})`
    });
  }
  play(seed: (scene: Scene) => any) {
    let scene = new Scene(this)
    seed(scene)
  }
}

