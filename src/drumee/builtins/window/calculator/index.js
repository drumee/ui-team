const __window_interact_singleton = require('window/interact/singleton');
class __window_calculator extends __window_interact_singleton {
  constructor(...args) {
    super(...args);
    this.viewInstance = undefined;
  }

  // ===========================================================
  //
  // ===========================================================
  initialize(opt) {
    require('./skin');
    super.initialize(opt);
    this.sign = '';
    this.oldSign;
    this.calc;
    this.calcButtons = [
      [
        {
          "content": "0",
          "className": "__calc-actions-btn",
          "service": "calculate"
        },
        {
          "content": "1",
          "className": "__calc-actions-btn",
          "service": "calculate"
        },
        {
          "content": "+",
          "className": "__calc-actions-btn",
          "service": "calculate-sign"
        }

      ],
      [
        {
          "content": "2",
          "className": "__calc-actions-btn",
          "service": "calculate"
        },
        {
          "content": "3",
          "className": "__calc-actions-btn",
          "service": "calculate"
        },
        {
          "content": "-",
          "className": "__calc-actions-btn",
          "service": "calculate-sign"
        }
      ],
      [
        {
          "content": "4",
          "className": "__calc-actions-btn",
          "service": "calculate"
        },
        {
          "content": "5",
          "className": "__calc-actions-btn",
          "service": "calculate"
        },
        {
          "content": "*",
          "className": "__calc-actions-btn",
          "service": "calculate-sign"
        }
      ],
      [
        {
          "content": "6",
          "className": "__calc-actions-btn",
          "service": "calculate"
        },
        {
          "content": "7",
          "className": "__calc-actions-btn",
          "service": "calculate"
        },
        {
          "content": "/",
          "className": "__calc-actions-btn",
          "service": "calculate-sign"
        }
      ],
      [
        {
          "content": "8",
          "className": "__calc-actions-btn",
          "service": "calculate"
        },
        {
          "content": "9",
          "className": "__calc-actions-btn",
          "service": "calculate"
        },
        {
          "content": "C",
          "className": "__calc-actions-btn",
          "service": "calculate-sign"
        }
      ]
    ]
    this.skeleton = require('./skeleton').default(this);
  }

  /**
   * @param {any} child
   * @param {any} pn
   */
  onPartReady(child, pn) {
    this.raise();
    switch (pn) {
      case _a.none:
        this.debug("Created by kind builder", child);
        break;
      case _a.content:
        this.__content.feed(require("./skeleton/content").default(this));
        this.setupInteract();
        break;
      default:
        super.onPartReady(child, pn);
        this.debug("Created by kind builder");
    }
  }

  onUiEvent(cmd) {
    const service = cmd.get(_a.service);
    switch (service) {
      case "calculate-sign":
      case "calculate":
        const inputCurrentValue = cmd.getText();
        if (inputCurrentValue === "C") {
          return this.reset();
        }
        const isNotSign = ['+', '-', '*', '/'].indexOf(inputCurrentValue) === -1;
        let inputPevValue = this.getPart('calc-input');
        let inputTotal = this.getPart('calc-total');

        if (inputPevValue.el.innerText === "|" && isNotSign) {
          inputPevValue.$el.removeClass("blink");
          return inputPevValue.el.innerText = inputCurrentValue;
        }

        if (isNotSign) {
          inputPevValue.el.innerText += inputCurrentValue;
          return inputPevValue.$el.removeClass("blink");
        }

        if (inputPevValue.el.innerText !== "|") {
          if (this.calc && this.sign) {
            this.calc = this.calculate(this.sign, inputPevValue.el.innerText, this.calc);
          } else {
            this.calc = inputPevValue.el.innerText;
          }
          inputTotal.el.innerText = this.calc || '';
          inputPevValue.el.innerText = '|';
          inputPevValue.$el.addClass("blink");
          this.sign = inputCurrentValue;
        } else {
          inputTotal.el.innerText = this.calc || '';
          this.sign = inputCurrentValue;
        }

        if (this.oldSign) {
          this.oldSign.$el.removeClass("selected");
        }
        this.oldSign = cmd;
        cmd.$el.addClass("selected");
        break;
      default:
        super.onUiEvent(cmd);
    }
  }

  reset() {
    let inputPevValue = this.getPart('calc-input');
    let inputTotal = this.getPart('calc-total');
    inputTotal.el.innerText = '';
    inputPevValue.el.innerText = '|';
    inputPevValue.$el.addClass("blink");
    this.calc = "";
    this.sign = "";
  }

  calculate(sign, currentValue, prevValue) {
    switch (sign) {
      case "+":
        return parseInt(prevValue) + parseInt(currentValue);
      case "-":
        return parseInt(prevValue) - parseInt(currentValue);
      case "*":
        return parseInt(prevValue) * parseInt(currentValue);
      case "/":
        return parseInt(prevValue) / parseInt(currentValue);
      default:
        return 0;
    }
  }
}

__window_calculator.initClass();

module.exports = __window_calculator;

