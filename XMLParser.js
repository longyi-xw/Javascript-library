"use strict"
export default class XMLParser extends DOMParser {

  /**
   *
   * @param {string | XMLDocument} xml
   */
  constructor(xml) {
    super()

    if(typeof xml === 'string') {
      this.dom = this.parseFromString(xml, 'text/xml')
      if(this.dom.documentElement.tagName === 'html') {
        throw new Error(this.dom.documentElement.innerText)
      }
    }
    this.dom = xml
  }

  /**
   * xml 转换成json
   * @return {{}|*}
   */
  parseJson() {
    const root = this.dom.documentElement;

    function parseNode(node) {
      const obj = {};
      for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i];
        if(child.children.length === 0) {
          // 如果没有子元素，将其作为属性键和文本内容添加到对象
          try {
            obj[child.tagName] = JSON.parse(child.textContent);
          } catch (e) {
            obj[child.tagName] = child.textContent;
          }
        } else {
          // 如果有子元素，继续递归
          if(obj[child.tagName] instanceof Array) {
            obj[child.tagName].push(parseNode(child));
          } else if(obj[child.tagName]) {
            obj[child.tagName] = [obj[child.tagName], parseNode(child)];
          } else {
            obj[child.tagName] = parseNode(child);
          }
        }
      }
      return obj;
    }

    return root.children.length ? parseNode(root) : root.textContent
  }

  /**
   * 获取所有平铺元素
   * @param {Element} dom
   * @return {Array<Element>}
   */
  getNodes(dom) {
    dom = dom ?? this.dom
    const childNodes = []
    let children = Array.from(dom.children)
    let index = 0
    while (children && index < children.length) {
      const child = children[index]
      if(child.children && child.children.length) {
        children.push(...Array.from(child.children))
      } else {
        childNodes.push(child)
      }
      index++
    }
    return childNodes
  }
}