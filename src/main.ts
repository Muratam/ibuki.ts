import * as CSS from "./style";
import { Color, ColorScheme } from "./color";
import { Box, BoxOption, SeedWithOption, Ibuki, Scene } from "./dom";
import { Text, TextSequence, FixedSizeText } from "./widget/text";
import { Input } from "./widget/input"
import { FlexBox, Table } from "./widget/container"
import { Root } from "./root"
import { ProgressBar, MeterBar, IFrame, Image } from "./widget/media";
import { FAIcon } from "./widget/external"
// fun  : scene(destroy?::現在のstaticをシーンごとに生やすとdestroy可能) / effect / move
// ext  : vividjs / katex / markdown / live2d / graph(tree/chart) / svgjs / code
//      : tips / bootstrap / vue.js / react.js / jquery / niconicocomment
// bug  : media(image size bug(反映の形式を考慮))
//      : {scale / width / height } tree - flow
//      : colorScheme / table はみだし
// impl : webgl(?) / canvas / drag and drop / a-href
//      : colorSchemeLib
//      : isButtonを hover 時におこなう関数に変えたい. + click  +hover
//      : worldにて、width に自動で(scaleが)フィットしてheightが無限大(になりうる)モードがあるとゲーム以外にも使える？
//      : Scene<T extends DataStore> / input-assign
console.log(72)

function threeBoxScene(scene: Scene) {

  class ThreeLoopView extends Box {
    private count = 0
    private boxes: Box[] = []
    public readonly topThree: BoxOption[] = [{
      scale: 0.2,
      fit: { x: "right", y: "center" },
      zIndex: 1
    }, {
      scale: 0.5,
      fit: { x: "center", y: "center" },
      zIndex: 2
    }, {
      scale: 0.2,
      fit: { x: "left", y: "center" },
      zIndex: 1
    }, {
      scale: 0.1,
      fit: { x: "center", y: "center" },
      zIndex: 0
    },]
    constructor(p: Box, option: BoxOption = {}) { super(p, option) }
    add(seed: SeedWithOption<Box, BoxOption>) {
      let option = this.boxes.length < 3 ? this.topThree[this.boxes.length] : this.topThree[3]
      this.boxes.push(seed(this, option))
    }
    turn(n: number) {
      let pre = this.count;
      this.count = (this.count + n + this.boxes.length) % this.boxes.length;
      if (pre === this.count) return;
      for (let i = 0; i < this.boxes.length; i++) {
        let index = (i + this.count) % this.boxes.length
        let option = index < 3 ? this.topThree[index] : this.topThree[3]
        this.boxes[i].to(option)
      }
    }
  }

  function createElem1(p: Box, option: BoxOption): Box {
    return new FlexBox(p, {
      ...option,
      flexDirection: "column",
      alignItems: "flex-start",
      colorScheme: new ColorScheme("#fce", "#034"),
      isButton: true,
      fontSize: 100,
      isScrollable: true
    }).tree(p => {
      new Input(p, { type: "text", size: 10, label: p2 => new FixedSizeText(p2, "name : ", p.width * 0.5, 20) }).assign(p.store.inputted)
      new Input(p, { type: "select", options: ["C#", "C++", "js"], label: p2 => new FixedSizeText(p2, "language : ", p.width * 0.5, 20) })
      new Input(p, { type: "checkbox", label: p2 => new FixedSizeText(p2, p.store.inputted.to(t => t + "yade"), p.width * 0.5, 20) })
    });
  }
  function createElem2(p: Box, option: BoxOption): Box {
    return new Box(p, {
      // border: { width: 10 },
      ...option,
      colorScheme: new ColorScheme("#fce", "#876"),
      fontSize: 100,
      textAlign: "center",
      isScrollable: true,
      draggable: true,
    }).tree(p =>
      new TextSequence(p, [
        ["int main(){\n", { fontName: "Menlo" }],
        [p.store.sec.to(x => x + "\n"), "#0fb"],
        ["  return;\n", "#ff0"],
        p => new FAIcon(p, "faIgloo", { size: 100, color: Color.parse("#fab") }),
        [p.store.pressedKey, "#000"],
      ])
    )
  }
  function createElem3(p: Box, option: BoxOption): Box {
    return new Table(p, {
      ...option,
      colorScheme: new ColorScheme("#fce", "#034"),
      fontSize: 100,
      isScrollable: true,
    }, (x, y) => {
      if (y % 2 === 0) return { colorScheme: new ColorScheme("#fce", "#034") }
      return { colorScheme: new ColorScheme("#fce", "#034") }
    }).addContents([
      ["iikanji", p.store.inputted, "year"],
      ["iikanji", p => new FAIcon(p, "faIgloo", {}), "year"],
      ["iikanji", p => new FAIcon(p, "faIgloo", {}), "year"],
      ["iikanji", p => new FAIcon(p, "faIgloo", {}), "year"],
      ["iikanji", p => new FAIcon(p, "faIgloo", {}), "year"],
      ["iikanji", p => new FAIcon(p, "faIgloo", {}), "year"],
      ["iikanji", p.store.inputted, "year"],
    ])
  }
  function createElem4(p: Box, option: BoxOption): Box {
    let clickCount = 0;
    return new Box(p, {
      ...option,
      fit: { y: "bottom", x: "center" },
      height: p.height * 0.2,
      colorScheme: new ColorScheme("#fce", "#034"),
      isScrollable: true
    }).tree(p => {
      new ProgressBar(p, p.store.posX, {}, 100)
      new Text(p, p.store.posX.to(x => x + "%"))
      new MeterBar(p, p.store.posX, { min: 0, max: 100, low: 22, high: 66, optimum: 80 })
    }).on("click", function () {
      clickCount++;
      if (clickCount % 2 === 1)
        this
          .to({
            fit: { x: "right", y: "center" },
          }, 0.5)
          .next({ fit: { x: "right", y: "top" } }, 0.5)
          .next({
            colorScheme: "#000-#fff" // WARN:
          }, 1)
      if (clickCount % 2 === 0)
        this.to({ fit: { x: "right", y: "bottom" } }, 1)
    })
  }

  let loopView = new ThreeLoopView(scene, { height: scene.height * 0.7 })
  scene.store.sec = scene.$updater.perFrame(10);
  scene.store.pressedKey = new Root("");
  scene.store.posX = new Root(0);
  scene.store.inputted = new Root("");
  loopView.add(createElem3)
  loopView.add(createElem2)
  loopView.add(createElem1)
  loopView.add((p, o) => new Image(p, { src: "https://sagisawa.0am.jp/me.jpg", ...o }))
  loopView.add((p, o) => new Image(p, { src: "https://sagisawa.0am.jp/me.jpg", ...o }))
  loopView.add((p, o) => new Image(p, { src: "https://sagisawa.0am.jp/me.jpg", ...o }))
  loopView.add((p, o) => new IFrame(p, { src: "https://www.openstreetmap.org/export/embed.html", ...o, }))
  loopView.add((p, o) => new IFrame(p, {
    src: "https://www.openstreetmap.org/export/embed.html",
    width: p.width * 0.7,
    ...o,
  }))
  scene.on("keydownall", key => {
    scene.store.pressedKey.set(key)
    if (key === "ArrowRight") {
      scene.store.posX.set((x: number) => x + 1)
      loopView.turn(1)
    } else if (key === "ArrowLeft") {
      scene.store.posX.set((x: number) => x - 1)
      loopView.turn(-1)
    }
  })
  let bottom = createElem4(scene, {})
  //.repeat({ duration: 1 }, { width: p.width * 0.8 })) // TODO: BUG

}
let ibuki = new Ibuki().play(threeBoxScene)
