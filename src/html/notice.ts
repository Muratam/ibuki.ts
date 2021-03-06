import { Box, DOM, DOMOption, Text, FitWidthDOM, FitWidthDOMOption, TextSeed, TextOption, BoxOption } from "../core/dom";
import { MayStore } from "../core/store";

export type Modifier = "primary" | "secondary" | "success" | "danger" | "warning" | "info" | "light" | "dark"
export interface BadgeOption extends TextOption {
  label?: TextSeed
  pill?: boolean
  modifier?: Modifier
}
export class Badge extends Text {
  constructor(parent: DOM, text: MayStore<string>, option: BadgeOption = {}) {
    super(parent, text, option)
    this.$dom.classList.add("badge")
    if (option.modifier) this.$dom.classList.add(`badge-${option.modifier}`)
    if (option.pill) this.$dom.classList.add("badge-pill")
    if (option.label) {
      let label = this.bloom(option.label)
      label.$dom.classList.add("badge-light")
      label.$dom.classList.add("badge")
    }
  }
}
export interface AlertOption extends FitWidthDOMOption {
  modifier?: Modifier
  noDeleteButton?: boolean
}
export class Alert extends FitWidthDOM {
  constructor(parent: DOM, option: AlertOption = {}) {
    super(parent, option)
    this.$dom.classList.add("alert")
    let alertType: Modifier = "danger"
    if (option.modifier) alertType = option.modifier
    this.$dom.classList.add(`alert-${alertType}`)
    this.$scene.reserveExecuteNextFrame(() => {
      function addAlertLink(now: DOM) {
        for (let c of now.children) {
          if (c.$dom.hasAttribute("href")) c.$dom.classList.add("alert-link");
          addAlertLink(c)
        }
      }
      addAlertLink(this)
    })
    if (option.noDeleteButton) return;
    // WARN: DOMが隠れるのではなく削除される！Store系が変に参照してちょっと怖いかも
    new DOM(this, { tag: "button", class: "close" }).tree(p => {
      new Text(p, "×", {}).$dom.setAttribute("aria-hidden", "true")
    }).setAttributes({
      type: "button",
      "data-dismiss": "alert",
      "aria-label": "Close"
    })
  }
}
interface SpinnerOption extends DOMOption {
  type?: "border" | "grow"
}
export class Spinner extends DOM {
  constructor(parent: DOM, option: SpinnerOption = {}) {
    super(parent, option)
    this.$dom.classList.add(`spinner-${option.type === "grow" ? "grow" : "border"}`)
  }
}
export class HR extends DOM {
  constructor(parent: DOM) {
    super(parent, { tag: "hr" })
  }
}
export class BR extends DOM {
  constructor(parent: DOM) {
    super(parent, { tag: "br" })
  }
}
export class PopUpBox extends Box {
  constructor(parent: Box, option: BoxOption = {}) {
    super(parent, option)
  }
}
