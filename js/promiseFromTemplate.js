/* @noflow */
// TODO: I didn't get very far with these flow types.

type TemplateValue = Promise<any> | string | number | Array<any>;

type PromiseTemplate = { [string]: TemplateValue } | Array<TemplateValue>;

type ResolvedValue = string | number | Array<ResolvedValue> | {[string]: ResolvedValue};
type ResolvedTemplate = { [string]: ResolvedValue } | Array<ResolvedValue>;

// Prettier will remove the parens and break flow
// prettier-ignore
type ExtractReturnType = <V>(Promise<V>) => V;

export default function promiseFromTemplate<T: PromiseTemplate>(
  template: T
): Promise<ResolvedTemplate> {
  return new Promise(function(resolve, reject) {
    let result: ResolvedTemplate;

    if (Array.isArray(template)) {
      result = [];
    } else {
      result = {};
    }

    const keys = Object.keys(template);
    let count = 0;

    function callback(key, value) {
      result[key] = value;
      count--;
      if (count === 0) {
        resolve(result);
      }
    }

    keys.forEach(function(key) {
      const value = template[key];
      let promise;

      switch (typeof value) {
        case "string":
        case "number":
        case "undefined":
          result[key] = value;
          break;
        case "object":
          if (value == null) {
            result[key] = null;
          } else if (typeof value.then === "function") {
            promise = value;
          } else {
            promise = promiseFromTemplate(value);
          }

          promise.then(callback.bind(null, key), reject);
          count += 1;
      }
    });

    if (count === 0) {
      resolve(result);
    }
  });
}
