/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
class Avatar {
  constructor(str, cn, name) {
    this.str = str;
    this.cn = cn;
    this.name = name;
  }

  color(s, l) {

    if (s == null) { s = 40; }
    if (l == null) { l = 60; }
    let hash = 0;
    let i = 0;
    while (i < this.name.length) {
      hash = (this.name.charCodeAt(i) + (hash << 5)) - hash;
      i++;
    }
    const h = hash % 360;

    return {
      kind     : KIND.note,
      className: this.cn || "",
      styleOpt : {
        backgroundColor: 'hsl(' + h + ', ' + s + '%, ' + l + '%)'
      }
    };
  }

  render() {
    return {
      kind     : KIND.note,
      className: this.cn || "",
      styleOpt : {
        backgroundImage: `url(${this.str})`
      }
    };
  }
}

module.exports = Avatar;