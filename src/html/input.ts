import { FitWidthDOM, FitWidthDOMOption, DOM, Text, TextSeed } from "../core/dom";
import { Store, HasStoreValue } from "../core/store"
import { ColorScheme, Color } from "../core/color";
export type InputType =
  "password" | "search" | "text" | "textarea" | "select" |
  "date" | "email" | "tel" | "time" | "url" | "checkbox" | "radio" |
  "number" | "file" | "range" | "color" | "hidden"
export interface InputOption {
  type?: InputType
  name?: string // checkbox / radio では同じ名前にすると共有
  size?: number
  maxlength?: number
  placeholder?: string
  pattern?: string
  max?: number
  min?: number
  step?: number
  value?: string
  autocomplete?: boolean | "on" | "off"
  required?: boolean
  readonly?: boolean
  disabled?: boolean
  autofocus?: boolean
  multiple?: boolean
  checked?: boolean
  // file
  accept?: "audio/*" | "video/*" | "image/*" | "text/*" | "application/*" | string[]
  // textarea
  rows?: number
  cols?: number
  wrap?: "soft" | "hard"
  // select
  options?: string[] | { [key: string]: string[] }
  // custom
  list?: string[] | string // string[] の時は datalist が生えるし,そうでない時はlistにidをいれるとそれを参照できる
  label?: TextSeed// 間にlabelを生やす
  prependLabel?: TextSeed
  valid?: Store<boolean>
}
export class Input extends FitWidthDOM<HTMLInputElement> implements HasStoreValue<string> {
  value: Store<string>
  constructor(parent: DOM, inputAttributeOption: InputOption = {}, domOption: FitWidthDOMOption = {}) {
    let isSmallInputType = ["checkbox", "radio"].some(x => x === inputAttributeOption.type)
    let formGroup = new FitWidthDOM(parent, {
      class: ["form-group", isSmallInputType ? "form-check" : ""],
      dontFitWidth: domOption.dontFitWidth
    })
    let label: DOM | null;
    let createLabel = () => {
      if (!inputAttributeOption.label) return;
      label = new DOM(formGroup, "label")
      label.bloom(inputAttributeOption.label)
      if (this.$dom) label.$dom.setAttribute("for", this.$dom.id)
    }
    if (!isSmallInputType) createLabel()
    if (inputAttributeOption.prependLabel) {
      formGroup = new FitWidthDOM(formGroup, {
        class: "input-group",
        dontFitWidth: domOption.dontFitWidth
      })
      let prependLabel = new DOM(formGroup, { class: "input-group-prepend" })
      let labelContent = prependLabel.bloom(inputAttributeOption.prependLabel)
      labelContent.$dom.classList.add("input-group-text")
      let c = new ColorScheme(domOption.colorScheme).addColor(Color.sub("#080808"))
      labelContent.applyStyle(labelContent.parseDOMOption({ colorScheme: c }))
    }
    let option = {
      tag: "input",
      class: isSmallInputType ? "form-check-input" :
        inputAttributeOption.type === "range" ? "custom-range" :
          // inputAttributeOption.type === "file" ? "custom-file-input" :
          "form-control",
      type: "text",
      ...domOption
    }
    if (inputAttributeOption.type === "textarea") {
      option.tag = "textarea"
      super(formGroup, option);
    } else if (inputAttributeOption.type === "select") {
      option.tag = "select"
      super(formGroup, option);
      if (inputAttributeOption.options instanceof Array) {
        for (let option of inputAttributeOption.options)
          new DOM(this, "option").$dom.innerText = option
      } else {
        let options = inputAttributeOption.options
        if (options) {
          for (let optionKey in options) {
            let optgroup = new DOM(this, "optgroup").setAttributes({ label: optionKey })
            for (let option of options[optionKey])
              new DOM(optgroup, "option").$dom.innerText = option
          }
        }
      }
    } else super(formGroup, option);
    if (isSmallInputType) createLabel()
    if (inputAttributeOption.valid) {
      inputAttributeOption.valid.regist(x => {
        let now = "is-valid"
        let not = "is-invalid"
        if (!x) [now, not] = [not, now]
        this.$dom.classList.add(now);
        this.$dom.classList.remove(not);
      })
    }
    this.value = new Store(inputAttributeOption.value || "")
    this.value.regist(r => this.$dom.setAttribute("value", r))
    this.$$dom.addEventListener("change", () => {
      if (this.$$dom.type === "checkbox") this.value.set(this.$$dom.checked + "")
      else this.value.set(this.$$dom.value)
    })
    let keyEvent = (e: KeyboardEvent) => {
      this.value.set(this.$$dom.value)
      this.$scene.$keyboard.eventCanceled = true;
    };
    this.$$dom.addEventListener("keyup", keyEvent)
    this.$$dom.addEventListener("keydown", keyEvent)
    this.applyInputOption(inputAttributeOption)
  }
  public assign(dst: Store<string>): this {
    this.value.set(dst.notLinkCreatedRawValue)
    this.value.assign(dst)
    return this
  }
  private applyInputOption(option: InputOption) {
    option = { ...option }
    if (typeof option.autocomplete === "boolean")
      option.autocomplete = option.autocomplete ? "on" : "off"
    if (option.list && typeof option.list !== "string") {
      let datalist = new DOM(this.$parent, "datalist")
      option.list.map((x: string) => new DOM(datalist, "option").setAttributes({ value: x }))
      option.list = datalist.id
    }
    delete option.label
    delete option.options
    this.setAttributes(option);
  }
}
