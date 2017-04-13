export function findParentNode(startEl, testFn, stopEl) {
  let iterEl = startEl;

  while (iterEl && iterEl !== stopEl) {
    if (testFn(iterEl)) return iterEl;
    else iterEl = iterEl.parentNode;
  }

  return null;
}

export function findWrappingClass(element, className, stopEl) {
  return findParentNode(
    element,
    el => el.classList && el.classList.contains(className),
    stopEl
  );
}

export function findWrappingLink(element) {
  return findParentNode(element, e => e instanceof HTMLAnchorElement);
}
