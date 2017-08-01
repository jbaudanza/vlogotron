/* @flow */

export function findParentNode<N>(
  startEl: Node,
  nodeType: Function,
  testFn: N => boolean,
  stopEl: ?Node = null
): ?N {
  let iterEl = startEl;

  while (iterEl && iterEl !== stopEl) {
    if (iterEl instanceof nodeType && testFn(iterEl)) return iterEl;
    else iterEl = iterEl.parentNode;
  }

  return null;
}

export function findWrappingClass(
  element: Element,
  className: string,
  stopEl: ?Element = null
): ?Element {
  return findParentNode(
    element,
    Element,
    el => el.classList && el.classList.contains(className),
    stopEl
  );
}

export function findWrappingLink(element: Element): ?HTMLAnchorElement {
  return findParentNode(element, HTMLAnchorElement, e => true);
}
