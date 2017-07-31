/* @flow */

export function findParentNode(
  startEl: Node,
  testFn: Node => boolean,
  stopEl: ?Element = null
): ?Node {
  let iterEl = startEl;

  while (iterEl && iterEl !== stopEl) {
    if (testFn(iterEl)) return iterEl;
    else iterEl = iterEl.parentNode;
  }

  return null;
}

export function findWrappingClass(
  element: Element,
  className: string,
  stopEl: ?Element = null
): ?Element {
  const e = findParentNode(
    element,
    el =>
      el instanceof Element && el.classList && el.classList.contains(className),
    stopEl
  );

  // TODO: This is to make flow happy and isn't necessary
  if (e instanceof Element) return e;
  else return null;
}

export function findWrappingLink(element: Element): ?HTMLAnchorElement {
  const e = findParentNode(element, e => e instanceof HTMLAnchorElement);

  // TODO: This is to make flow happy and isn't necessary
  if (e instanceof HTMLAnchorElement) return e;
  else return null;
}
