/*
Possible todos:
0. Add XSLT to JML-string stylesheet (or even vice versa)
0. IE problem: Add JsonML code to handle name attribute (during element creation)
0. Element-specific: IE object-param handling

Todos inspired by JsonML: https://github.com/mckamey/jsonml/blob/master/jsonml-html.js

0. duplicate attributes?
0. expand ATTR_MAP
0. equivalent of markup, to allow strings to be embedded within an object (e.g., {$value: '<div>id</div>'}); advantage over innerHTML in that it wouldn't need to work as the entire contents (nor destroy any existing content or handlers)
0. More validation?
0. JsonML DOM Level 0 listener
0. Whitespace trimming?

JsonML element-specific:
0. table appending
0. canHaveChildren necessary? (attempts to append to script and img)

Other Todos:
0. Note to self: Integrate research from other jml notes
0. Allow Jamilih to be seeded with an existing element, so as to be able to add/modify attributes and children
0. Allow array as single first argument
0. Settle on whether need to use null as last argument to return array (or fragment) or other way to allow appending? Options object at end instead to indicate whether returning array, fragment, first element, etc.?
0. Allow building of generic XML (pass configuration object)
0. Allow building content internally as a string (though allowing DOM methods, etc.?)
0. Support JsonML empty string element name to represent fragments?
0. Redo browser testing of jml (including ensuring IE7 can work even if test framework can't work)
*/

/**
 * @typedef {Window & {DocumentFragment: any}} HTMLWindow
 */

/**
 * @typedef {any} ArbitraryValue
 */

/**
 * @typedef {number} Integer
 */

/**
 * @typedef {{
 *   element: Document|HTMLElement|DocumentFragment,
 *   attribute: {name: string|null, value: JamilihAttValue},
 *   opts: JamilihOptions
 * }} PluginSettings
 */

/**
 * @typedef {object} JamilihPlugin
 * @property {string} name
 * @property {(opts: PluginSettings) => string|Promise<void>} set
 */

/**
 * @type {import('jsdom').DOMWindow|HTMLWindow|undefined}
 */
let win;

/* c8 ignore next 3 */
if (typeof window !== 'undefined' && window) {
  win = window;
}

/* c8 ignore next */
let doc = typeof document !== 'undefined' && document || win?.document;

// STATIC PROPERTIES

const possibleOptions = ['$plugins',
// '$mode', // Todo (SVG/XML)
// '$state', // Used internally
'$map' // Add any other options here
];

const NS_HTML = 'http://www.w3.org/1999/xhtml',
  hyphenForCamelCase = /-([a-z])/gu;
const ATTR_MAP = new Map([['maxlength', 'maxLength'], ['minlength', 'minLength'], ['readonly', 'readOnly']]);

// We define separately from ATTR_DOM for clarity (and parity with JsonML) but no current need
// We don't set attribute esp. for boolean atts as we want to allow setting of `undefined`
//   (e.g., from an empty variable) on templates to have no effect
const BOOL_ATTS = ['checked', 'defaultChecked', 'defaultSelected', 'disabled', 'indeterminate', 'open',
// Dialog elements
'readOnly', 'selected'];

// From JsonML
const ATTR_DOM = [...BOOL_ATTS, 'accessKey',
// HTMLElement
'async', 'autocapitalize',
// HTMLElement
'autofocus', 'contentEditable',
// HTMLElement through ElementContentEditable
'defaultValue', 'defer', 'draggable',
// HTMLElement
'formnovalidate', 'hidden',
// HTMLElement
'innerText',
// HTMLElement
'inputMode',
// HTMLElement through ElementContentEditable
'ismap', 'multiple', 'novalidate', 'pattern', 'required', 'spellcheck',
// HTMLElement
'translate',
// HTMLElement
'value', 'willvalidate'];
// Todo: Add more to this as useful for templating
//   to avoid setting through nullish value
const NULLABLES = ['autocomplete', 'dir',
// HTMLElement
'integrity',
// script, link
'lang',
// HTMLElement
'max', 'min', 'minLength', 'maxLength', 'title' // HTMLElement
];

/**
 * @param {string} sel
 * @returns {HTMLElement|null}
 */
const $ = sel => {
  if (!doc) {
    throw new Error('No document object');
  }
  return doc.querySelector(sel);
};

/**
 * @param {string} sel
 * @returns {HTMLElement[]}
 */
const $$ = sel => {
  if (!doc) {
    throw new Error('No document object');
  }
  return [... /** @type {NodeListOf<HTMLElement>} */doc.querySelectorAll(sel)];
};

/**
* Retrieve the (lower-cased) HTML name of a node.
* @static
* @param {Node} node The HTML node
* @returns {string} The lower-cased node name
*/
function _getHTMLNodeName(node) {
  return node.nodeName && node.nodeName.toLowerCase();
}

/**
 * @private
 * @static
 * @param {Document|DocumentFragment|HTMLElement} parent The parent to which to append the element
 * @param {Node|string} child The element or other node to append to the parent
 * @throws {Error} Rethrow if problem with `append` and unhandled
 * @returns {void}
 */
function _appendNode(parent, child) {
  const parentName = _getHTMLNodeName(parent);
  if (parentName === 'template') {
    /** @type {HTMLTemplateElement} */parent.content.append(child);
    return;
  }
  parent.append(child); // IE9 is now ok with this
}

/**
 * Attach event in a cross-browser fashion.
 * @static
 * @param {HTMLElement} el DOM element to which to attach the event
 * @param {string} type The DOM event (without 'on') to attach to the element
 * @param {(evt: Event & {target: HTMLElement}) => void} handler The event handler to attach to the element
 * @param {boolean} [capturing] Whether or not the event should be
 *   capturing (W3C-browsers only); default is false; NOT IN USE
 * @returns {void}
 */
function _addEvent(el, type, handler, capturing) {
  // @ts-expect-error It's ok
  el.addEventListener(type, handler, Boolean(capturing));
}

/**
* Creates a text node of the result of resolving an entity or character reference.
* @param {'entity'|'decimal'|'hexadecimal'} type Type of reference
* @param {string} prefix Text to prefix immediately after the "&"
* @param {string} arg The body of the reference
* @throws {TypeError}
* @returns {Text} The text node of the resolved reference
*/
function _createSafeReference(type, prefix, arg) {
  /* c8 ignore next 3 */
  if (!doc) {
    throw new Error('No document defined');
  }
  // For security reasons related to innerHTML, we ensure this string only
  //  contains potential entity characters
  if (!/^\w+$/u.test(arg)) {
    throw new TypeError(`Bad ${type} reference; with prefix "${prefix}" and arg "${arg}"`);
  }
  const elContainer = doc.createElement('div');
  // Todo: No workaround for XML?
  // eslint-disable-next-line no-unsanitized/property
  elContainer.textContent = '&' + prefix + arg + ';';
  return doc.createTextNode(elContainer.textContent);
}

/**
* @param {string} n0 Whole expression match (including "-")
* @param {string} n1 Lower-case letter match
* @returns {string} Uppercased letter
*/
function _upperCase(n0, n1) {
  return n1.toUpperCase();
}

// Todo: Make as public utility
/**
 * @param {ArbitraryValue} o
 * @returns {boolean}
 */
function _isNullish(o) {
  return o === null || o === undefined;
}

// Todo: Make as public utility, but also return types for undefined, boolean, number, document, etc.
/**
* @private
* @static
* @param {string|JamilihAttributes|JamilihArray|JamilihChildren|
*   JamilihDocumentFragment|JamilihAttributeNode|
*   JamilihOptions|HTMLElement|Document|DocumentFragment|null|undefined} item
* @returns {"string"|"null"|"array"|"element"|"fragment"|"object"|
*   "symbol"|"bigint"|"function"|"number"|"boolean"|"undefined"|
*   "document"|"non-container node"}
*/
function _getType(item) {
  const type = typeof item;

  // Appease TS
  if (typeof item === 'string' || typeof item === 'undefined') {
    return 'string';
  }
  switch (type) {
    case 'object':
      if (item === null) {
        return 'null';
      }
      if (Array.isArray(item)) {
        return 'array';
      }
      if ('nodeType' in item) {
        switch (item.nodeType) {
          case 1:
            return 'element';
          case 9:
            return 'document';
          case 11:
            return 'fragment';
          default:
            return 'non-container node';
        }
      }
    // Fallthrough
    default:
      return type;
  }
}

/**
* @private
* @static
* @param {DocumentFragment} frag
* @param {Node} node
* @returns {DocumentFragment}
*/
function _fragReducer(frag, node) {
  frag.append(node);
  return frag;
}

/**
* @private
* @static
* @param {Object<string, string>} xmlnsObj
* @returns {(...n: string[]) => string}
*/
function _replaceDefiner(xmlnsObj) {
  /**
   * @param {string[]} n
   * @returns {string}
   */
  return function (...n) {
    const n0 = n[0];
    let retStr = xmlnsObj[''] ? ' xmlns="' + xmlnsObj[''] + '"' : n0; // Preserve XHTML
    for (const [ns, xmlnsVal] of Object.entries(xmlnsObj)) {
      if (ns !== '') {
        retStr += ' xmlns:' + ns + '="' + xmlnsVal + '"';
      }
    }
    return retStr;
  };
}

/**
 * @callback ChildrenToJMLCallback
 * @param {JamilihArray|JamilihChildType|string} childNodeJML
 * @param {Integer} i
 * @returns {void}
 */

/**
 * @private
 * @static
 * @param {Node} node
 * @returns {ChildrenToJMLCallback}
 */
function _childrenToJML(node) {
  return function (childNodeJML, i) {
    const cn = node.childNodes[i];
    const j = Array.isArray(childNodeJML) ? jml(... /** @type {JamilihArray} */childNodeJML) : jml(childNodeJML);
    cn.replaceWith(j);
  };
}

/**
 * Keep this in sync with `JamilihArray`'s first argument (minus `Document`).
 * @typedef {JamilihDoc|JamilihDoctype|JamilihTextNode|
*   JamilihAttributeNode|JamilihOptions|ElementName|HTMLElement|
*   JamilihDocumentFragment
* } JamilihFirstArg
*/

/**
* @callback JamilihAppender
* @param {JamilihArray|JamilihFirstArg|Node|TextNodeString} childJML
* @returns {void}
*/

/**
* @private
* @static
* @param {ParentNode} node
* @returns {JamilihAppender}
*/
function _appendJML(node) {
  return function (childJML) {
    if (typeof childJML === 'string' || typeof childJML === 'number') {
      throw new TypeError('Unexpected text string/number in the head');
    }
    if (Array.isArray(childJML)) {
      node.append(jml(...childJML));
    } else if (typeof childJML === 'object' && 'nodeType' in childJML) {
      node.append(childJML);
    } else {
      node.append(jml(childJML));
    }
  };
}

/**
* @callback appender
* @param {JamilihArray|JamilihFirstArg|Node|TextNodeString} childJML
* @returns {void}
*/

/**
* @private
* @static
* @param {ParentNode} node
* @returns {appender}
*/
function _appendJMLOrText(node) {
  return function (childJML) {
    if (typeof childJML === 'string' || typeof childJML === 'number') {
      node.append(String(childJML));
    } else if (Array.isArray(childJML)) {
      node.append(jml(...childJML));
    } else if (typeof childJML === 'object' && 'nodeType' in childJML) {
      node.append(childJML);
    } else {
      node.append(jml(childJML));
    }
  };
}

/**
* @private
* @static
*/
/*
function _DOMfromJMLOrString (childNodeJML) {
  if (typeof childNodeJML === 'string') {
    return doc.createTextNode(childNodeJML);
  }
  return jml(...childNodeJML);
}
*/

/**
* @typedef {HTMLElement|DocumentFragment|Comment|Attr|
*    Text|Document|DocumentType|ProcessingInstruction|CDATASection} JamilihReturn
*/
// 'string|JamilihOptions|JamilihDocumentFragment|JamilihAttributes|(string|JamilihArray)[]

/**
 * Can either be an array of:
 * 1. JamilihAttributes followed by an array of JamilihArrays or Elements.
 *     (Cannot be multiple single JamilihArrays despite TS type).
 * 2. Any number of JamilihArrays.
 * @typedef {[(JamilihAttributes|JamilihArray|JamilihArray[]|HTMLElement), ...(JamilihArray|JamilihArray[]|HTMLElement)[]]} TemplateJamilihArray
 */

/**
 * @typedef {(JamilihArray|HTMLElement)[]} ShadowRootJamilihArrayContainer
 */

/**
 * @typedef {{
*   open?: boolean|ShadowRootJamilihArrayContainer,
*   closed?: boolean|ShadowRootJamilihArrayContainer,
*   template?: string|HTMLTemplateElement|TemplateJamilihArray,
*   content?: ShadowRootJamilihArrayContainer|DocumentFragment
* }} JamilihShadowRootObject
 */

/**
 * @typedef {{[key: string]: string}} XmlnsAttributeObject
 */

/**
 * @typedef {null|XmlnsAttributeObject} XmlnsAttributeValue
 */

/**
 * @typedef {{
 *   [key: string]: string|number|null|undefined|DatasetAttributeObject
 * }} DatasetAttributeObject
 */

/**
 * @typedef {string|undefined|{[key: string]: string|null}} StyleAttributeValue
 */

/**
 * @typedef {(this: HTMLElement, event: Event & {target: HTMLElement}) => void} EventHandler
 */

/**
 * @typedef {{
 *   [key: string]: EventHandler|[EventHandler, boolean]
 * }} OnAttributeObject
 */

/**
 * @typedef {{
 *   $on?: OnAttributeObject|null
 * }} OnAttribute
 */

/**
 * @typedef {boolean} BooleanAttribute
 */

/**
 * @typedef {((this: HTMLElement, event?: Event) => void)} HandlerAttributeValue
 */

/* eslint-disable jsdoc/valid-types -- jsdoc-type-pratt-parser Bug */
/**
 * @typedef {{
 *   [key: string]: HandlerAttributeValue
 * }} OnHandlerObject
 */

/**
 * @typedef {number} StringifiableNumber
 */

/**
 * @typedef {{
 *   name: string,
 *   systemId?: string,
 *   publicId?: string
 * }} JamilihDocumentType
 */

/**
 * @typedef {string|{extends?: string}} DefineOptions
 */

/**
 * @typedef {{[key: string]: string|number|boolean|((this: DefineMixin, ...args: any[]) => any)}} DefineMixin
 */

/**
 * @typedef {{
 *   new (): HTMLElement;
 *   prototype: HTMLElement & {[key: string]: any}
 * }} DefineConstructor
 */
/* eslint-enable jsdoc/valid-types -- https://github.com/jsdoc-type-pratt-parser/jsdoc-type-pratt-parser/issues/131 */

/**
 * @typedef {(this: HTMLElement) => void} DefineUserConstructor
 */

/**
 * @typedef {[DefineConstructor|DefineUserConstructor|DefineMixin, DefineOptions?]|[DefineConstructor|DefineUserConstructor, DefineMixin?, DefineOptions?]} DefineObjectArray
 */

/**
 * @typedef {DefineObjectArray|DefineConstructor|DefineMixin|DefineUserConstructor} DefineObject
 */

/**
 * @typedef {{elem?: HTMLElement, [key: string]: any}} SymbolObject
 */

/**
 * @typedef {[symbol|string, ((this: HTMLElement, ...args: any[]) => any)|SymbolObject]} SymbolArray
 */

/**
 * @typedef {null|undefined} NullableAttributeValue
 */

/**
 * @typedef {[string, object]|string|{[key: string]: any}} PluginValue
 */

/**
 * @typedef {(string|NullableAttributeValue|BooleanAttribute|
 *   JamilihArray|JamilihShadowRootObject|StringifiableNumber|
 *   JamilihDocumentType|JamilihDocument|XmlnsAttributeValue|
 *   OnAttributeObject|
 *   HandlerAttributeValue|DefineObject|SymbolArray|PluginReference|
 *   PluginValue
 * )} JamilihAttValue
 */

/**
 * @typedef {{
*   [key: string]: string|number|((this: HTMLElement, ...args: any[]) => any)
* }} DataAttributeObject
*/

/**
 * @typedef {{
 *   $data?: true|string[]|Map<any, any>|WeakMap<any, any>|DataAttributeObject|
 *     [undefined, DataAttributeObject]|
 *     [Map<any, any>|WeakMap<any, any>|undefined, DataAttributeObject]
 * }} DataAttribute
 */

/**
 * @typedef {{
 *   dataset?: DatasetAttributeObject
 * }} DatasetAttribute
 */

/**
 * @typedef {{
 *   style?: StyleAttributeValue
 * }} StyleAttribute
 */

/**
 * @typedef {{
 *   $shadow?: JamilihShadowRootObject
 * }} JamilihShadowRootAttribute
 */

/* eslint-disable jsdoc/valid-types -- jsdoc-type-pratt-parser Bug */
/**
 * @typedef {{
 *   is?: string|null,
 *   $define?: DefineObject
 * }} DefineAttribute
 */
/* eslint-enable jsdoc/valid-types -- jsdoc-type-pratt-parser Bug */

/**
 * @typedef {{
 *   $custom?: {[key: string]: any}
 * }} CustomAttribute
 */

/**
 * @typedef {{
 *   $symbol?: SymbolArray
 * }} SymbolAttribute
 */

/**
 * @typedef {{
 *   xmlns?: string|null|XmlnsAttributeObject
 * }} XmlnsAttribute
 */

/**
 * `OnHandlerObject &` wasn't working, so added `HandlerAttributeValue`.
 * @typedef {DataAttribute & StyleAttribute & JamilihShadowRootAttribute &
 * DefineAttribute & DatasetAttribute & CustomAttribute & SymbolAttribute &
 * OnAttribute & XmlnsAttribute &
 * Partial<JamilihAttributeNode> & Partial<JamilihTextNode> &
 * Partial<JamilihDoc> & Partial<JamilihDoctype> & {
 *   [key: string]: JamilihAttValue|HandlerAttributeValue,
 * }} JamilihAttributes
 */

/**
 * @typedef {{
 *   title?: string,
 *   childNodes?: JamilihChildType[],
 *   $DOCTYPE?: JamilihDocumentType,
 *   head?: JamilihChildren
 *   body?: JamilihChildren
 * }} JamilihDocument
 */

/**
 * @typedef {{
 *   $document: JamilihDocument
 * }} JamilihDoc
 */

/**
 * @typedef {{$DOCTYPE: JamilihDocumentType}} JamilihDoctype
 */

/**
 * @typedef {JamilihArray|TextNodeString|HTMLElement} JamilihDocumentFragmentContent
 */

/**
 * @typedef {{'#': JamilihDocumentFragmentContent[]}} JamilihDocumentFragment
 */

/**
 * @typedef {string} ElementName
 */

/**
 * @typedef {string|number} TextNodeString
 */

/**
 * @typedef {{[key: string]: string}} PluginReference
 */

/**
 * @typedef {(
 *   JamilihArray|TextNodeString|HTMLElement|Comment|ProcessingInstruction|
 *   Text|DocumentFragment|JamilihProcessingInstruction|JamilihDocumentFragment|
 *   PluginReference
 * )[]} JamilihChildren
 */

// Todo: DocumentType, Comment, ProcessingInstruction, Text
// Todo: JamilihCDATANode, JamilihComment, JamilihProcessingInstruction
/**
 * @typedef {Document|ElementName|HTMLElement|DocumentFragment|
 *   JamilihDocumentFragment|JamilihDoc|JamilihDoctype|JamilihTextNode|
 *   JamilihAttributeNode} JamilihFirstArgument
 */

/**
 * This would be clearer with overrides, but using as typedef.
 *
 * The optional 0th argument is an Jamilih options object or fragment.
 *
 * The first argument is the element to create (by lower-case name) or DOM element.
 *
 * The second optional argument are attributes to add with the key as the
 *   attribute name and value as the attribute value.
 * The third optional argument are an array of children for this element
 *   (but raw DOM elements are required to be specified within arrays since
 *   could not otherwise be distinguished from siblings being added).
 * The fourth optional argument are a sequence of sibling Elements, represented
 *   as DOM elements, or string/attributes/children sequences.
 * The fifth optional argument is the parent to which to attach the element
 *   (always the last unless followed by null, in which case it is the
 *   second-to-last).
 * The sixth last optional argument is null, used to indicate an array of elements
 *   should be returned.
 * @typedef {[
 *   JamilihOptions|JamilihFirstArgument,
 *   (JamilihFirstArgument|
 *     JamilihAttributes|
 *     JamilihChildren|
 *     HTMLElement|ShadowRoot|
 *     null)?,
 *   (JamilihAttributes|
 *     JamilihChildren|
 *     HTMLElement|ShadowRoot|
 *     ElementName|null)?,
 *   ...(JamilihAttributes|
 *     JamilihChildren|
 *     HTMLElement|ShadowRoot|
 *     ElementName|null)[]
 * ]} JamilihArray
 */

/**
 * @typedef {[
 *   (string|HTMLElement|ShadowRoot), (JamilihArray[]|JamilihAttributes|HTMLElement|ShadowRoot|null)?, ...(JamilihArray[]|HTMLElement|JamilihAttributes|ShadowRoot|null)[]
 * ]} JamilihArrayPostOptions
 */

/**
 * @typedef {{
 *   root: [Map<HTMLElement,any>|WeakMap<HTMLElement,any>, any],
 *   [key: string]: [Map<HTMLElement,any>|WeakMap<HTMLElement,any>, any]
 * }} MapWithRoot
 */

/**
 * @typedef {"root"|"attributeValue"|"element"|"fragment"|"children"|"fragmentChildren"} TraversalState
 */

/**
 * @typedef {object} JamilihOptions
 * @property {TraversalState} [$state]
 * @property {JamilihPlugin[]} [$plugins]
 * @property {MapWithRoot|[Map<HTMLElement,any>|WeakMap<HTMLElement,any>, any]} [$map]
 */

/**
 * @param {Document|HTMLElement|DocumentFragment} elem
 * @param {string|null} att
 * @param {JamilihAttValue} attVal
 * @param {JamilihOptions} opts
 * @param {TraversalState} [state]
 * @returns {Promise<void>|string|null}
 */
function checkPluginValue(elem, att, attVal, opts, state) {
  opts.$state = state ?? 'attributeValue';
  if (attVal && typeof attVal === 'object') {
    const matchingPlugin = getMatchingPlugin(opts, Object.keys(attVal)[0]);
    if (matchingPlugin) {
      return matchingPlugin.set({
        opts,
        element: elem,
        attribute: {
          name: att,
          value: attVal
        }
      });
    }
  }
  return (/** @type {string} */attVal
  );
}

/**
 * @param {JamilihOptions} opts
 * @param {string} pluginName
 * @returns {JamilihPlugin|undefined}
 */
function getMatchingPlugin(opts, pluginName) {
  return opts.$plugins && opts.$plugins.find(p => {
    return p.name === pluginName;
  });
}

/* eslint-disable jsdoc/valid-types -- pratt parser bug  */
/**
 * @template T
 * @typedef {T[keyof T]} ValueOf
 */
/* eslint-enable jsdoc/valid-types -- pratt parser bug  */

/* eslint-disable jsdoc/valid-types -- pratt parser bug  */
/**
 * Creates an XHTML or HTML element (XHTML is preferred, but only in browsers
 * that support); any element after element can be omitted, and any subsequent
 * type or types added afterwards.
 * @template {JamilihArray} T
 * @param {T} args
 * @returns {T extends [keyof HTMLElementTagNameMap, any?, any?, any?]
 *   ? HTMLElementTagNameMap[T[0]] : JamilihReturn}
 * The newly created (and possibly already appended)
 *   element or array of elements
 */
const jml = function jml(...args) {
  /* eslint-enable jsdoc/valid-types -- pratt parser bug  */
  if (!win) {
    throw new Error('No window object');
  }
  if (!doc) {
    throw new Error('No document object');
  }

  /** @type {(Document|DocumentFragment|HTMLElement) & {[key: string]: any}} */
  let elem = doc.createDocumentFragment();
  /**
   *
   * @param {JamilihAttributes} atts
   * @throws {TypeError}
   * @returns {void}
   */
  function _checkAtts(atts) {
    /* c8 ignore next 3 */
    if (!doc) {
      throw new Error('No document object');
    }
    for (let [att, attVal] of Object.entries(atts)) {
      att = ATTR_MAP.get(att) ?? att;

      /**
       * @typedef {any} ElementExpando
       */

      if (NULLABLES.includes(att)) {
        attVal = checkPluginValue(elem, att, /** @type {string|JamilihArray} */attVal, opts);
        if (!_isNullish(attVal)) {
          /** @type {ElementExpando} */elem[att] = attVal;
        }
        continue;
      } else if (ATTR_DOM.includes(att)) {
        attVal = checkPluginValue(elem, att, /** @type {string|JamilihArray} */attVal, opts);
        /** @type {ElementExpando} */
        elem[att] = attVal;
        continue;
      }
      switch (att) {
        /*
        Todos:
        0. JSON mode to prevent event addition
         0. {$xmlDocument: []} // doc.implementation.createDocument
         0. Accept array for any attribute with first item as prefix and second as value?
        0. {$: ['xhtml', 'div']} for prefixed elements
          case '$': // Element with prefix?
            nodes[nodes.length] = elem = doc.createElementNS(attVal[0], attVal[1]);
            break;
        */
        case '#':
          {
            // Document fragment
            opts.$state = 'fragmentChildren';
            nodes[nodes.length] = jml(opts, /** @type {JamilihArray[]} */attVal);
            break;
          }
        case '$shadow':
          {
            const {
              open,
              closed
            } = /** @type {JamilihShadowRootObject} */attVal;
            let {
              content,
              template
            } = /** @type {JamilihShadowRootObject} */attVal;
            const shadowRoot = /** @type {HTMLElement} */elem.attachShadow({
              mode: closed || open === false ? 'closed' : 'open'
            });
            if (template) {
              if (Array.isArray(template)) {
                template = /** @type {HTMLTemplateElement} */
                _getType(template[0]) === 'object' ? jml('template', ...
                /**
                 * @type {[
                 *   JamilihAttributes, ...(JamilihArray[]|HTMLElement)[]
                 * ]}
                 */
                template, doc.body) : jml('template',
                /**
                 * @type {JamilihArray[]|HTMLElement}
                 */
                template, doc.body);
              } else if (typeof template === 'string') {
                template = /** @type {HTMLTemplateElement} */$(template);
              }
              jml( /** @type {HTMLTemplateElement} */
              /** @type {HTMLTemplateElement} */template.content.cloneNode(true), shadowRoot);
            } else {
              if (!content) {
                if (open !== true) {
                  content = open || typeof closed === 'boolean' ? content : closed;
                }
              }
              if (content && typeof content !== 'boolean') {
                if (Array.isArray(content)) {
                  jml({
                    '#': content
                  }, shadowRoot);
                } else {
                  jml(content, shadowRoot);
                }
              }
            }
            break;
          }
        case '$state':
          {
            // Handled internally
            break;
          }
        case 'is':
          {
            // Currently only in Chrome
            // Handled during element creation
            break;
          }
        case '$custom':
          {
            Object.assign(elem, attVal);
            break;
          }
        case '$define':
          {
            if (!('localName' in elem)) {
              throw new Error('Element expected for `$define`');
            }
            const localName = elem.localName.toLowerCase();
            // Note: customized built-ins sadly not working yet
            const customizedBuiltIn = !localName.includes('-');

            // We check attribute in case this is a preexisting DOM element
            // const {is} = atts;
            let is;
            if (customizedBuiltIn) {
              is = elem.getAttribute('is');
              if (!is) {
                if (!Object.hasOwn(atts, 'is')) {
                  throw new TypeError(`Expected \`is\` with \`$define\` on built-in; args: ${JSON.stringify(args)}`);
                }
                atts.is = /** @type {string} */checkPluginValue(elem, 'is', atts.is, opts);
                elem.setAttribute('is', atts.is);
                ({
                  is
                } = atts);
              }
            }
            const def = customizedBuiltIn ? /** @type {string} */is : localName;
            if (window.customElements.get(def)) {
              break;
            }

            /**
             * @param {DefineUserConstructor} [cnstrct]
             * @returns {DefineConstructor}
             */
            const getConstructor = cnstrct => {
              /* c8 ignore next 3 */
              if (!doc) {
                throw new Error('No document object');
              }
              const baseClass = typeof options === 'object' && typeof options.extends === 'string' ? /** @type {typeof HTMLElement} */doc.createElement(options.extends).constructor : customizedBuiltIn ? /** @type {typeof HTMLElement} */doc.createElement(localName).constructor : window.HTMLElement;

              /**
               * Class wrapping base class.
               */
              return cnstrct ? class extends baseClass {
                /**
                 * Calls user constructor.
                 */
                constructor() {
                  super();
                  /** @type {DefineUserConstructor} */
                  cnstrct.call(this);
                }
              } : class extends baseClass {};
            };

            /** @type {DefineConstructor|DefineUserConstructor|DefineMixin} */
            let cnstrctr;

            /**
             * @type {DefineOptions|undefined}
             */
            let options;
            let mixin;
            const defineObj = /** @type {DefineObject} */attVal;
            if (Array.isArray(defineObj)) {
              if (defineObj.length <= 2) {
                [cnstrctr, options] = defineObj;
                if (typeof options === 'string') {
                  // Todo: Allow creating a definition without using it;
                  //  that may be the only reason to have a string here which
                  //  differs from the `localName` anyways
                  options = {
                    extends: options
                  };
                } else if (options && !Object.hasOwn(options, 'extends')) {
                  mixin = options;
                }
                if (typeof cnstrctr === 'object') {
                  mixin = cnstrctr;
                  cnstrctr = getConstructor();
                }
              } else {
                [cnstrctr, mixin, options] = defineObj;
                if (typeof options === 'string') {
                  options = {
                    extends: options
                  };
                }
              }
            } else if (typeof defineObj === 'function') {
              cnstrctr = /** @type {DefineConstructor} */defineObj;
            } else {
              mixin = defineObj;
              cnstrctr = getConstructor();
            }
            if (!cnstrctr.toString().startsWith('class')) {
              cnstrctr = getConstructor( /** @type {DefineUserConstructor} */cnstrctr);
            }
            if (!options && customizedBuiltIn) {
              options = {
                extends: localName
              };
            }
            if (mixin) {
              Object.entries(mixin).forEach(([methodName, method]) => {
                /** @type {DefineConstructor} */cnstrctr.prototype[methodName] = method;
              });
            }
            // console.log('def', def, '::', typeof options === 'object' ? options : undefined);
            window.customElements.define(def, /** @type {DefineConstructor} */cnstrctr, typeof options === 'object' ? options : undefined);
            break;
          }
        case '$symbol':
          {
            const [symbol, func] = /** @type {SymbolArray} */attVal;
            if (typeof func === 'function') {
              const funcBound = func.bind( /** @type {HTMLElement} */elem);
              if (typeof symbol === 'string') {
                // @ts-expect-error
                elem[Symbol.for(symbol)] = funcBound;
              } else {
                // @ts-expect-error
                elem[symbol] = funcBound;
              }
            } else {
              const obj = func;
              obj.elem = /** @type {HTMLElement} */elem;
              if (typeof symbol === 'string') {
                // @ts-expect-error
                elem[Symbol.for(symbol)] = obj;
              } else {
                // @ts-expect-error
                elem[symbol] = obj;
              }
            }
            break;
          }
        case '$data':
          {
            setMap( /** @type {true|string[]|Map<any, any>|WeakMap<any, any>|DataAttributeObject} */
            attVal);
            break;
          }
        case '$attribute':
          {
            // Attribute node
            const attr = /** @type {JamilihAttributeNodeValue} */attVal;
            const node = attr.length === 3 ? doc.createAttributeNS(attr[0], attr[1]) : doc.createAttribute( /** @type {string} */attr[0]);
            node.value = /** @type {string} */attr[attr.length - 1];
            nodes[nodes.length] = node;
            break;
          }
        case '$text':
          {
            // Todo: Also allow as jml(['a text node']) (or should that become a fragment)?
            const node = doc.createTextNode( /** @type {string} */attVal);
            nodes[nodes.length] = node;
            break;
          }
        case '$document':
          {
            // Todo: Conditionally create XML document
            const docNode = doc.implementation.createHTMLDocument();
            if (!attVal) {
              throw new Error('Bad attribute value');
            }
            const jamlihDoc = /** @type {JamilihDocument} */attVal;
            if (jamlihDoc.childNodes) {
              // Remove any extra nodes created by createHTMLDocument().
              const j = jamlihDoc.childNodes.length;
              while (docNode.childNodes[j]) {
                const cn = docNode.childNodes[j];
                cn.remove();
                // `j` should stay the same as removing will cause node to be present
              }

              jamlihDoc.childNodes.forEach(_childrenToJML(docNode));
            } else {
              if (jamlihDoc.$DOCTYPE) {
                const dt = {
                  $DOCTYPE: jamlihDoc.$DOCTYPE
                };
                const doctype = jml(dt);
                docNode.firstChild?.replaceWith(doctype);
              }
              const html = docNode.querySelector('html');
              const head = html?.querySelector('head');
              const body = html?.querySelector('body');
              if (jamlihDoc.title || jamlihDoc.head) {
                const meta = doc.createElement('meta');
                // eslint-disable-next-line unicorn/text-encoding-identifier-case -- HTML
                meta.setAttribute('charset', 'utf-8');
                head?.append(meta);
                if (jamlihDoc.title) {
                  docNode.title = jamlihDoc.title; // Appends after meta
                }

                if (jamlihDoc.head && head) {
                  // each child of `head` is:
                  //  (JamilihArray|TextNodeString|HTMLElement|Comment|ProcessingInstruction|
                  //  Text|DocumentFragment|JamilihProcessingInstruction|JamilihDocumentFragment)

                  //   * @typedef {JamilihDoc|JamilihDoctype|JamilihTextNode|
                  //  *   JamilihAttributeNode|JamilihOptions|ElementName|HTMLElement|
                  //  *   JamilihDocumentFragment
                  //  * } JamilihFirstArg
                  // appender childJML param is: JamilihArray|JamilihFirstArg

                  jamlihDoc.head.forEach(_appendJML(head));
                }
              }
              if (jamlihDoc.body && body) {
                jamlihDoc.body.forEach(_appendJMLOrText(body));
              }
            }
            nodes[nodes.length] = docNode;
            break;
          }
        case '$DOCTYPE':
          {
            const doctype = /** @type {JamilihDocumentType} */attVal;
            const node = doc.implementation.createDocumentType(doctype.name, doctype.publicId || '', doctype.systemId || '');
            nodes[nodes.length] = node;
            break;
          }
        case '$on':
          {
            // Events
            // Allow for no-op by defaulting to `{}`
            for (let [p2, val] of Object.entries( /** @type {OnAttributeObject} */attVal || {})) {
              if (typeof val === 'function') {
                val = [val, false];
              }
              if (typeof val[0] !== 'function') {
                throw new TypeError(`Expect a function for \`$on\`; args: ${JSON.stringify(args)}`);
              }
              _addEvent( /** @type {HTMLElement} */elem, p2, val[0], val[1]); // element, event name, handler, capturing
            }

            break;
          }
        case 'className':
        case 'class':
          attVal = checkPluginValue(elem, att, /** @type {string} */attVal, opts);
          if (!_isNullish(attVal)) {
            elem.className = attVal;
          }
          break;
        case 'dataset':
          {
            // Map can be keyed with hyphenated or camel-cased properties
            /**
             * @param {DatasetAttributeObject} atVal
             * @param {string} startProp
             * @returns {void}
             */
            const recurse = (atVal, startProp) => {
              let prop = '';
              const pastInitialProp = startProp !== '';
              Object.keys(atVal).forEach(key => {
                const value = atVal[key];
                prop = pastInitialProp ? startProp + key.replace(hyphenForCamelCase, _upperCase).replace(/^([a-z])/u, _upperCase) : startProp + key.replace(hyphenForCamelCase, _upperCase);
                if (value === null || typeof value !== 'object') {
                  if (!_isNullish(value)) {
                    elem.dataset[prop] = value;
                  }
                  prop = startProp;
                  return;
                }
                recurse(value, prop);
              });
            };
            recurse( /** @type {DatasetAttributeObject} */attVal, '');
            break;
            // Todo: Disable this by default unless configuration explicitly allows (for security)
          }

        case 'htmlFor':
        case 'for':
          if (elStr === 'label') {
            attVal = checkPluginValue(elem, att, /** @type {string} */attVal, opts);
            if (!_isNullish(attVal)) {
              elem.htmlFor = attVal;
            }
            break;
          }
          attVal = checkPluginValue(elem, att, /** @type {string} */attVal, opts);
          elem.setAttribute(att, attVal);
          break;
        case 'xmlns':
          // Already handled
          break;
        default:
          {
            if (att.startsWith('on')) {
              attVal = checkPluginValue(elem, att, /** @type {HandlerAttributeValue} */attVal, opts);
              elem[att] = attVal;
              // _addEvent(elem, att.slice(2), attVal, false); // This worked, but perhaps the user wishes only one event
              break;
            }
            if (att === 'style') {
              attVal = /** @type {string} */
              checkPluginValue(elem, att, /** @type {StyleAttributeValue} */attVal, opts);
              if (_isNullish(attVal)) {
                break;
              }
              if (typeof attVal === 'object') {
                for (const [p2, styleVal] of Object.entries(attVal)) {
                  if (!_isNullish(styleVal)) {
                    // Todo: Handle aggregate properties like "border"
                    if (p2 === 'float') {
                      elem.style.cssFloat = styleVal;
                      elem.style.styleFloat = styleVal; // Harmless though we could make conditional on older IE instead
                    } else {
                      elem.style[p2.replace(hyphenForCamelCase, _upperCase)] = styleVal;
                    }
                  }
                }
                break;
              }

              // setAttribute unfortunately erases any existing styles
              elem.setAttribute(att, attVal);
              /*
              // The following reorders which is troublesome for serialization, e.g., as used in our testing
              if (elem.style.cssText !== undefined) {
                elem.style.cssText += attVal;
              } else { // Opera
                elem.style += attVal;
              }
              */
              break;
            }
            const pluginName = att;
            const matchingPlugin = getMatchingPlugin(opts, pluginName);
            if (matchingPlugin) {
              matchingPlugin.set({
                opts,
                element: /** @type {HTMLElement} */nodes[0],
                attribute: {
                  name: pluginName,
                  value: /** @type {PluginReference} */attVal
                }
              });
              break;
            }
            attVal = checkPluginValue(elem, att, /** @type {string} */attVal, opts);
            elem.setAttribute(att, attVal);
            break;
          }
      }
    }
  }

  /**
   * @type {JamilihReturn[]}
   */
  const nodes = [];

  /** @type {string} */
  let elStr;

  /** @type {JamilihOptions} */
  let opts;
  let isRoot = false;
  let argStart = 0;
  if (_getType(args[0]) === 'object' && Object.keys(args[0]).some(key => possibleOptions.includes(key))) {
    opts = /** @type {JamilihOptions} */args[0];
    if (opts.$state === undefined) {
      isRoot = true;
      opts.$state = 'root';
    }
    if (Array.isArray(opts.$map)) {
      opts.$map = {
        root: opts.$map
      };
    }
    if ('$plugins' in opts) {
      if (!Array.isArray(opts.$plugins)) {
        throw new TypeError(`\`$plugins\` must be an array; args: ${JSON.stringify(args)}`);
      }
      opts.$plugins.forEach(pluginObj => {
        if (!pluginObj || typeof pluginObj !== 'object') {
          throw new TypeError(`Plugin must be an object; args: ${JSON.stringify(args)}`);
        }
        if (!pluginObj.name || !pluginObj.name.startsWith('$_')) {
          throw new TypeError(`Plugin object name must be present and begin with \`$_\`; args: ${JSON.stringify(args)}`);
        }
        if (typeof pluginObj.set !== 'function') {
          throw new TypeError(`Plugin object must have a \`set\` method; args: ${JSON.stringify(args)}`);
        }
      });
    }
    argStart = 1;
  } else {
    opts = {
      $state: undefined
    };
  }
  const argc = args.length;
  const defaultMap = opts.$map && /** @type {MapWithRoot} */opts.$map.root;

  /**
   * @param {true|string[]|Map<any, any>|WeakMap<any, any>|DataAttributeObject} dataVal
   * @returns {void}
   */
  const setMap = dataVal => {
    let map, obj;
    const defMap = /** @type {[Map<HTMLElement, any> | WeakMap<HTMLElement, any>, any]} */defaultMap;
    // Boolean indicating use of default map and object
    if (dataVal === true) {
      [map, obj] = defMap;
    } else if (Array.isArray(dataVal)) {
      // Array of strings mapping to default
      if (typeof dataVal[0] === 'string') {
        dataVal.forEach(dVal => {
          setMap( /** @type {MapWithRoot} */opts.$map[dVal]);
        });
        return;
        // Array of Map and non-map data object
      }

      map = dataVal[0] || defMap[0];
      obj = dataVal[1] || defMap[1];
      // Map
    } else if (/^\[object (?:Weak)?Map\]$/u.test([].toString.call(dataVal))) {
      map = dataVal;
      obj = defMap[1];
      // Non-map data object
    } else {
      map = defMap[0];
      obj = dataVal;
    }
    /** @type {Map<HTMLElement, any> | WeakMap<HTMLElement, any>} */
    map.set( /** @type {HTMLElement} */
    elem, obj);
  };
  for (let i = argStart; i < argc; i++) {
    let arg = args[i];
    const type = _getType(arg);
    switch (type) {
      case 'null':
        // null always indicates a place-holder (only needed for last argument if want array returned)
        if (i === argc - 1) {
          // Casting needing unless changing `jml()` signature with overloads
          return (/** @type {ArbitraryValue} */nodes.length <= 1 ? nodes[0]
            // eslint-disable-next-line unicorn/no-array-callback-reference
            : nodes.reduce(_fragReducer, doc.createDocumentFragment())
          ); // nodes;
        }

        throw new TypeError(`\`null\` values not allowed except as final Jamilih argument; index ${i} on args: ${JSON.stringify(args)}`);
      case 'string':
        // Strings normally indicate elements
        switch (arg) {
          case '!':
            nodes[nodes.length] = doc.createComment( /** @type {string} */args[++i]);
            break;
          case '?':
            {
              arg = /** @type {string} */args[++i];
              let procValue = /** @type {string} */args[++i];
              const val = procValue;
              if (val && typeof val === 'object') {
                const procValues = [];
                for (const [p, procInstVal] of Object.entries(val)) {
                  procValues.push(p + '=' + '"' +
                  // https://www.w3.org/TR/xml-stylesheet/#NT-PseudoAttValue
                  procInstVal.replace(/"/gu, '&quot;') + '"');
                }
                procValue = procValues.join(' ');
              }
              // Firefox allows instructions with ">" in this method, but not if placed directly!
              try {
                nodes[nodes.length] = doc.createProcessingInstruction(arg, procValue);
              } catch (e) {
                // Getting NotSupportedError in IE, so we try to imitate a processing instruction with a comment
                // innerHTML didn't work
                // var elContainer = doc.createElement('div');
                // elContainer.textContent = '<?' + doc.createTextNode(arg + ' ' + procValue).nodeValue + '?>';
                // nodes[nodes.length] = elContainer.textContent;
                // Todo: any other way to resolve? Just use XML?
                nodes[nodes.length] = doc.createComment('?' + arg + ' ' + procValue + '?');
              }
              break;
              // Browsers don't support doc.createEntityReference, so we just use this as a convenience
            }
          case '&':
            nodes[nodes.length] = _createSafeReference('entity', '', /** @type {string} */
            args[++i]);
            break;
          case '#':
            // // Decimal character reference - ['#', '01234'] // &#01234; // probably easier to use JavaScript Unicode escapes
            nodes[nodes.length] = _createSafeReference('decimal', arg, String(args[++i]));
            break;
          case '#x':
            // Hex character reference - ['#x', '123a'] // &#x123a; // probably easier to use JavaScript Unicode escapes
            nodes[nodes.length] = _createSafeReference('hexadecimal', arg, /** @type {string} */
            args[++i]);
            break;
          case '![':
            // '![', ['escaped <&> text'] // <![CDATA[escaped <&> text]]>
            // CDATA valid in XML only, so we'll just treat as text for mutual compatibility
            // Todo: config (or detection via some kind of doc.documentType property?) of whether in XML
            try {
              nodes[nodes.length] = doc.createCDATASection( /** @type {string} */args[++i]);
            } catch (e2) {
              nodes[nodes.length] = doc.createTextNode( /** @type {string} */
              args[i]); // i already incremented
            }

            break;
          case '':
            nodes[nodes.length] = elem = doc.createDocumentFragment();
            // Todo: Report to plugins
            opts.$state = 'fragment';
            break;
          default:
            {
              // An element
              elStr = /** @type {string} */arg;
              const atts = args[i + 1];
              if (atts && _getType(atts) === 'object' && /** @type {JamilihAttributes} */atts.is) {
                const {
                  is
                } = /** @type {JamilihAttributes} */atts;
                /* c8 ignore next 4 */
                elem = doc.createElementNS
                // Should create separate file for this
                /* eslint-disable object-shorthand -- Casting */ ? /** @type {HTMLElement} */doc.createElementNS(NS_HTML, elStr, {
                  is: /** @type {string} */is
                })
                /* c8 ignore next 1 */ : doc.createElement(elStr, {
                  is: /** @type {string} */is
                });
                /* eslint-enable object-shorthand -- Casting */
              } else /* c8 ignore next */if (doc.createElementNS) {
                  elem = doc.createElementNS(NS_HTML, elStr);
                  /* c8 ignore next 3 */
                } else {
                  elem = doc.createElement(elStr);
                }
              // Todo: Report to plugins
              opts.$state = 'element';
              nodes[nodes.length] = elem; // Add to parent
              break;
            }
        }
        break;
      case 'object':
        {
          // Non-DOM-element objects indicate attribute-value pairs
          /* c8 ignore next 3 */
          if (!arg || typeof arg !== 'object') {
            throw new Error('Null should not reach here');
          }
          const atts = arg;
          if ('xmlns' in atts) {
            // We handle this here, as otherwise may lose events, etc.
            // As namespace of element already set as XHTML, we need to change the namespace
            // elem.setAttribute('xmlns', atts.xmlns); // Doesn't work
            // Can't set namespaceURI dynamically, renameNode() is not supported, and setAttribute() doesn't work to change the namespace, so we resort to this hack
            const xmlnsObj = /** @type {XmlnsAttributeObject} */atts;
            const replacer = xmlnsObj.xmlns && typeof xmlnsObj.xmlns === 'object' ? _replaceDefiner(xmlnsObj.xmlns) : ' xmlns="' + xmlnsObj.xmlns + '"';
            // try {
            // Also fix DOMParser to work with text/html
            elem = nodes[nodes.length - 1] =
            // Why doesn't `HTMLWindow` have `DOMParser`?
            new /** @type {import('jsdom').DOMWindow} */win.DOMParser().parseFromString(new /** @type {import('jsdom').DOMWindow} */win.XMLSerializer().serializeToString(elem)
            // Mozilla adds XHTML namespace
            .replace(' xmlns="' + NS_HTML + '"',
            // Needed to cast here, despite either overload working
            /** @type {string} */
            replacer), 'application/xml').documentElement;
            // Todo: Report to plugins
            opts.$state = 'element';
            // }catch(e) {alert(elem.outerHTML);throw e;}
          }

          _checkAtts( /** @type {JamilihAttributes} */atts);
          break;
        }
      case 'document':
      case 'fragment':
      case 'element':
        /*
        1) Last element always the parent (put null if don't want parent and want to return array) unless only atts and children (no other elements)
        2) Individual elements (DOM elements or sequences of string[/object/array]) get added to parent first-in, first-added
        */
        if (i === 0) {
          // Allow wrapping of element, fragment, or document
          elem = /** @type {Document|DocumentFragment|HTMLElement} */arg;
          // Todo: Report to plugins and change for document/fragment
          opts.$state = 'element';
        }
        if (i === argc - 1 || i === argc - 2 && args[i + 1] === null) {
          // parent
          const elsl = nodes.length;
          for (let k = 0; k < elsl; k++) {
            _appendNode( /** @type {Document|DocumentFragment|HTMLElement} */arg, nodes[k]);
          }
        } else {
          nodes[nodes.length] = /** @type {Document|DocumentFragment|HTMLElement} */arg;
        }
        break;
      case 'array':
        {
          // Arrays or arrays of arrays indicate child nodes
          const child = /** @type {JamilihChildren} */arg;
          const cl = child.length;
          for (let j = 0; j < cl; j++) {
            // Go through children array container to handle elements
            const childContent = child[j];
            const childContentType = typeof childContent;
            if (childContent === null || _isNullish(childContent)) {
              throw new TypeError(`Bad children (parent array: ${JSON.stringify(args)}; index ${j} of child: ${JSON.stringify(child)})`);
            }
            switch (childContentType) {
              // Todo: determine whether null or function should have special handling or be converted to text
              case 'string':
              case 'number':
              case 'boolean':
                _appendNode(elem, doc.createTextNode(String(childContent)));
                break;
              default:
                // bigint, symbol, function
                if (typeof childContent !== 'object') {
                  throw new TypeError(`Bad children (parent array: ${JSON.stringify(args)}; index ${j} of child: ${JSON.stringify(child)})`);
                }
                if (Array.isArray(childContent)) {
                  // Arrays representing child elements
                  opts.$state = 'children';
                  _appendNode(elem, jml(opts, ...childContent));
                } else if ('#' in childContent) {
                  // Fragment
                  opts.$state = 'fragmentChildren';
                  _appendNode(elem, jml(opts, childContent['#']));
                } else {
                  // Single DOM element children or plugin
                  let newChildContent;
                  if (!('nodeType' in childContent)) {
                    newChildContent = /** @type {string} */
                    checkPluginValue(elem, null, childContent, opts, 'children');
                  }
                  _appendNode(elem, /** @type {string|HTMLElement|DocumentFragment|Comment} */
                  newChildContent || childContent);
                }
                break;
            }
          }
          break;
        }
      default:
        throw new TypeError(`Unexpected type: ${type}; arg: ${arg}; index ${i} on args: ${JSON.stringify(args)}`);
    }
  }
  const ret = nodes[0] || elem;
  if (isRoot && opts.$map && /** @type {MapWithRoot} */opts.$map.root) {
    setMap(true);
  }

  // Casting needing unless changing `jml()` signature with overloads
  return (/** @type {ArbitraryValue} */ret
  );
};

/**
 * Configuration object.
 * @typedef {object} ToJmlConfig
 * @property {boolean} [stringOutput=false] Whether to output the Jamilih object as a string.
 * @property {boolean} [reportInvalidState=true] If true (the default), will report invalid state errors
 * @property {boolean} [stripWhitespace=false] Strip whitespace for text nodes
 */

/**
 * @typedef {[namespace: string|null, name: string, value?: string]} JamilihAttributeNodeValue
 */

/**
 * @typedef {{
 *   $attribute: JamilihAttributeNodeValue
 * }} JamilihAttributeNode
 */

/**
 * @typedef {{
 *   $text: string
 * }} JamilihTextNode
 */

/**
 * @typedef {['![', string]} JamilihCDATANode
 */

/**
 * @typedef {['&', string]} JamilihEntityReference
 */

/**
 * @typedef {[code: '?', target: string, value: string]} JamilihProcessingInstruction
 */

/**
 * @typedef {[code: '!', value: string]} JamilihComment
 */

/**
 * @typedef {{
 *   nodeType: number,
 *   nodeName: string
 * }} Entity
 */

/* eslint-disable no-shadow, unicorn/custom-error-definition */
/**
 * Polyfill for `DOMException`.
 */
class DOMException extends Error {
  /* eslint-enable no-shadow, unicorn/custom-error-definition */
  /**
   * @param {string} message
   * @param {string} name
   */
  constructor(message, name) {
    super(message);
    this.code = 0;
    // eslint-disable-next-line unicorn/custom-error-definition
    this.name = name;
  }
}

/**
 * @typedef {JamilihArray|JamilihDoctype|
*    JamilihCDATANode|JamilihEntityReference|JamilihProcessingInstruction|
*    JamilihComment|JamilihDocumentFragment} JamilihChildType
 */

/**
 * @typedef {JamilihDoc|JamilihAttributeNode|JamilihChildType} JamilihType
 */

/**
* Converts a DOM object or a string of HTML into a Jamilih object (or string).
* @param {string|HTMLElement|Node|Entity} nde If a string, will parse as document
* @param {ToJmlConfig} [config] Configuration object
* @throws {TypeError}
* @returns {JamilihType|string} Array containing the elements which represent
* a Jamilih object, or, if `stringOutput` is true, it will be the stringified
* version of such an object
*/
jml.toJML = function (nde, {
  stringOutput = false,
  reportInvalidState = true,
  stripWhitespace = false
} = {}) {
  if (!win) {
    throw new Error('No window object set');
  }
  if (typeof nde === 'string') {
    nde = new /** @type {import('jsdom').DOMWindow} */win.DOMParser().parseFromString(nde, 'text/html'); // todo: Give option for XML once implemented and change JSDoc to allow for Element
  }

  const dom = /** @type {HTMLElement|Node|Entity} */nde;

  /**
   * @todo Find more specific type than `any`
   * @typedef {{[key: (number|string)]: any}} IndexableObject
   */

  const ret = /** @type {IndexableObject} */[];
  let parent = ret;
  let parentIdx = 0;

  /**
   * @param {string} msg
   * @throws {DOMException}
   * @returns {void}
   */
  function invalidStateError(msg) {
    // These are probably only necessary if working with text/html
    if (reportInvalidState) {
      // INVALID_STATE_ERR per section 9.3 XHTML 5: http://www.w3.org/TR/html5/the-xhtml-syntax.html
      const e = new DOMException(msg, 'INVALID_STATE_ERR');
      e.code = 11;
      throw e;
    }
  }

  /**
   *
   * @param {JamilihDocumentType} obj
   * @param {DocumentType} node
   * @returns {void}
   */
  function addExternalID(obj, node) {
    if (node.systemId.includes('"') && node.systemId.includes("'")) {
      invalidStateError('systemId cannot have both single and double quotes.');
    }
    const {
      publicId,
      systemId
    } = node;
    if (systemId) {
      obj.systemId = systemId;
    }
    if (publicId) {
      obj.publicId = publicId;
    }
  }

  /**
   *
   * @param {ArbitraryValue} val
   * @returns {void}
   */
  function set(val) {
    parent[parentIdx] = val;
    parentIdx++;
  }

  /**
   * @returns {void}
   */
  function setChildren() {
    set([]);
    parent = parent[parentIdx - 1];
    parentIdx = 0;
  }

  /**
   *
   * @param {string} prop1
   * @param {string} [prop2]
   * @returns {void}
   */
  function setObj(prop1, prop2) {
    parent = parent[parentIdx - 1][prop1];
    parentIdx = 0;
    if (prop2) {
      parent = parent[prop2];
    }
  }

  /**
   *
   * @param {Node|Entity} nodeOrEntity
   * @param {Object<string, string|null>} namespaces
   * @throws {TypeError}
   * @returns {void}
   */
  function parseDOM(nodeOrEntity, namespaces) {
    // namespaces = clone(namespaces) || {}; // Ensure we're working with a copy, so different levels in the hierarchy can treat it differently

    /*
    if ((nodeOrEntity.prefix && nodeOrEntity.prefix.includes(':')) || (nodeOrEntity.localName && nodeOrEntity.localName.includes(':'))) {
      invalidStateError('Prefix cannot have a colon');
    }
    */

    const type = 'nodeType' in nodeOrEntity ? nodeOrEntity.nodeType : null;
    if (!type) {
      throw new TypeError('Not an XML type');
    }
    if (type === 5) {
      // ENTITY REFERENCE (though not in browsers (was already resolved
      //  anyways), ok to keep for parity with our "entity" shorthand)
      set(['&', nodeOrEntity.nodeName]);
      return;
    }
    namespaces = {
      ...namespaces
    };
    const xmlChars = /^([\u0009\u000A\u000D\u0020-\uD7FF\uE000-\uFFFD]|[\uD800-\uDBFF][\uDC00-\uDFFF])*$/u; // eslint-disable-line no-control-regex
    if ([2, 3, 4, 7, 8].includes(type) && /** @type {Node} */nodeOrEntity.nodeValue && !xmlChars.test( /** @type {Node} */nodeOrEntity.nodeValue)) {
      invalidStateError('Node has bad XML character value');
    }

    /**
     * @type {IndexableObject}
     */
    let tmpParent;

    /**
     * @type {Integer}
     */
    let tmpParentIdx;

    /**
     * @returns {void}
     */
    function setTemp() {
      tmpParent = parent;
      tmpParentIdx = parentIdx;
    }
    /**
     * @returns {void}
     */
    function resetTemp() {
      parent = tmpParent;
      parentIdx = tmpParentIdx;
      parentIdx++; // Increment index in parent container of this element
    }

    switch (type) {
      case 1:
        {
          // ELEMENT
          const node = /** @type {HTMLElement} */nodeOrEntity;
          setTemp();
          const nodeName = node.nodeName.toLowerCase(); // Todo: for XML, should not lower-case

          setChildren(); // Build child array since elements are, except at the top level, encapsulated in arrays
          set(nodeName);

          /**
           * @type {{[key: string]: string|null} & {xmlns?: string|null}}
           */
          const start = {};
          let hasNamespaceDeclaration = false;
          if (namespaces[node.prefix || ''] !== node.namespaceURI) {
            namespaces[node.prefix || ''] = node.namespaceURI;
            if (node.prefix) {
              start['xmlns:' + node.prefix] = node.namespaceURI;
            } else if (node.namespaceURI) {
              start.xmlns = node.namespaceURI;
            } else {
              start.xmlns = null;
            }
            hasNamespaceDeclaration = true;
          }
          if (node.attributes.length) {
            set([...node.attributes].reduce(function (obj, att) {
              obj[att.name] = att.value; // Attr.nodeName and Attr.nodeValue are deprecated as of DOM4 as Attr no longer inherits from Node, so we can safely use name and value
              return obj;
            }, start));
          } else if (hasNamespaceDeclaration) {
            set(start);
          }
          const {
            childNodes
          } = node;
          if (childNodes.length) {
            setChildren(); // Element children array container
            [...childNodes].forEach(function (childNode) {
              parseDOM(childNode, namespaces);
            });
          }
          resetTemp();
          break;
        }
      case 2:
        {
          // ATTRIBUTE (should only get here if passing in an attribute node)
          const node = /** @type {Attr} */nodeOrEntity;
          set({
            $attribute: [node.namespaceURI, node.name, node.value]
          });
          break;
        }
      case 3:
        {
          // TEXT
          const node = /** @type {Text} */nodeOrEntity;
          /* c8 ignore next 3 */
          if (!node.nodeValue) {
            throw new Error('Unexpected null comment value');
          }
          if (stripWhitespace && /^\s+$/u.test(node.nodeValue)) {
            set('');
            return;
          }
          set(node.nodeValue);
          break;
        }
      case 4:
        {
          // CDATA
          const node = /** @type {CDATASection} */nodeOrEntity;
          if (node.nodeValue?.includes(']]' + '>')) {
            invalidStateError('CDATA cannot end with closing ]]>');
          }
          set(['![', node.nodeValue]);
          break;
        }
      // case 5:
      // Handled earlier
      case 7:
        {
          // PROCESSING INSTRUCTION
          const node = /** @type {ProcessingInstruction} */nodeOrEntity;
          if (/^xml$/iu.test(node.target)) {
            invalidStateError('Processing instructions cannot be "xml".');
          }
          if (node.target.includes('?>')) {
            invalidStateError('Processing instruction targets cannot include ?>');
          }
          if (node.target.includes(':')) {
            invalidStateError('The processing instruction target cannot include ":"');
          }
          if (node.data.includes('?>')) {
            invalidStateError('Processing instruction data cannot include ?>');
          }
          set(['?', node.target, node.data]); // Todo: Could give option to attempt to convert value back into object if has pseudo-attributes
          break;
        }
      case 8:
        {
          // COMMENT
          const node = /** @type {Comment} */nodeOrEntity;
          /* c8 ignore next 3 */
          if (!node.nodeValue) {
            throw new Error('Unexpected null comment value');
          }
          if (node.nodeValue.includes('--') || node.nodeValue.length && node.nodeValue.lastIndexOf('-') === node.nodeValue.length - 1) {
            invalidStateError('Comments cannot include --');
          }
          set(['!', node.nodeValue]);
          break;
        }
      case 9:
        {
          // DOCUMENT
          const node = /** @type {Document} */nodeOrEntity;
          setTemp();
          const docObj = {
            $document: {
              childNodes: []
            }
          };
          set(docObj); // doc.implementation.createHTMLDocument

          // Set position to fragment's array children
          setObj('$document', 'childNodes');
          const {
            childNodes
          } = node;
          if (!childNodes.length) {
            invalidStateError('Documents must have a child node');
          }
          // set({$xmlDocument: []}); // doc.implementation.createDocument // Todo: use this conditionally

          [...childNodes].forEach(function (childNode) {
            // Can't just do documentElement as there may be doctype, comments, etc.
            // No need for setChildren, as we have already built the container array
            parseDOM(childNode, namespaces);
          });
          resetTemp();
          break;
        }
      case 10:
        {
          // DOCUMENT TYPE
          const node = /** @type {DocumentType} */nodeOrEntity;
          setTemp();

          // Can create directly by doc.implementation.createDocumentType
          const start = {
            $DOCTYPE: {
              name: /** @type {DocumentType} */node.name
            }
          };
          const pubIdChar = /^(\u0020|\u000D|\u000A|[a-zA-Z0-9]|[-'()+,./:=?;!*#@$_%])*$/u; // eslint-disable-line no-control-regex
          if (!pubIdChar.test( /** @type {DocumentType} */node.publicId)) {
            invalidStateError('A publicId must have valid characters.');
          }
          addExternalID(start.$DOCTYPE, node);
          // Fit in internal subset along with entities?: probably don't need as these would only differ if from DTD, and we're not rebuilding the DTD
          set(start); // Auto-generate the internalSubset instead?

          resetTemp();
          break;
        }
      case 11:
        {
          // DOCUMENT FRAGMENT
          const node = /** @type {DocumentFragment} */nodeOrEntity;
          setTemp();
          set({
            '#': []
          });

          // Set position to fragment's array children
          setObj('#');
          const {
            childNodes
          } = node;
          [...childNodes].forEach(function (childNode) {
            // No need for setChildren, as we have already built the container array
            parseDOM(childNode, namespaces);
          });
          resetTemp();
          break;
        }
      default:
        throw new TypeError('Not an XML type');
    }
  }
  parseDOM(dom, {});
  if (stringOutput) {
    return JSON.stringify(ret[0]);
  }
  return ret[0];
};

/**
 * @param {string|HTMLElement} dom
 * @param {ToJmlConfig} [config]
 * @returns {string}
 */
jml.toJMLString = function (dom, config) {
  return (/** @type {string} */
    jml.toJML(dom, Object.assign(config || {}, {
      stringOutput: true
    }))
  );
};

/**
 *
 * @param {JamilihArray} args
 * @returns {JamilihReturn}
 */
jml.toDOM = function (...args) {
  // Alias for jml()
  return jml(...args);
};

/**
 *
 * @param {JamilihArray} args
 * @returns {string}
 */
jml.toHTML = function (...args) {
  // Todo: Replace this with version of jml() that directly builds a string
  const ret = jml(...args);
  switch (ret.nodeType) {
    case 1:
      {
        // Element
        // Todo: deal with serialization of properties like 'selected',
        //  'checked', 'value', 'defaultValue', 'for', 'dataset', 'on*',
        //  'style'! (i.e., need to build a string ourselves)
        return (/** @type {HTMLElement} */ret.outerHTML
        );
      }
    case 2:
      {
        // ATTR
        return `${
        /** @type {Attr} */ret.name}="${
        /** @type {Attr} */ret.value.replace(/"/gu, '&quot;')}"`;
      }
    case 3:
      {
        // TEXT
        // Fallthrough
        // } case 4: { // CDATA
        /* c8 ignore next 3 */
        if (!ret.nodeValue) {
          throw new TypeError('Unexpected null Text node');
        }
        return (/** @type {Text|CDATASection} */ret.nodeValue
        );
        // case 5: // Entity Reference Node
        //  No 6: Entity Node
        //  No 12: Notation Node
        // } case 7: { // PROCESSING INSTRUCTION
        //   const node = /** @type {ProcessingInstruction} */ (ret);
        //   return `<?${node.target} ${node.data}?>`;
        // } case 8: { // Comment
        //   return `<!--${ret.nodeValue}-->`;
      }
    case 9:
    case 11:
      {
        // DOCUMENT FRAGMENT
        const node = /** @type {DocumentFragment} */ret;
        return [...node.childNodes].map(childNode => {
          return jml.toHTML( /** @type {JamilihFirstArgument} */childNode);
        }).join('');
      }
    case 10:
      {
        // DOCUMENT TYPE
        const node = /** @type {DocumentType} */ret;
        return `<!DOCTYPE ${node.name}${node.publicId ? ` PUBLIC "${node.publicId}" "${node.systemId}"` : node.systemId ? ` SYSTEM "${node.systemId}"` : ``}>`;
        /* c8 ignore next 3 */
      }
    default:
      throw new Error('Unexpected node type');
  }
};

/**
 *
 * @param {JamilihArray} args
 * @returns {string}
 */
jml.toDOMString = function (...args) {
  // Alias for jml.toHTML for parity with jml.toJMLString
  return jml.toHTML(...args);
};

/**
 *
 * @param {JamilihArray} args
 * @returns {string}
 */
jml.toXML = function (...args) {
  if (!win) {
    throw new Error('No window object set');
  }
  const ret = jml(...args);
  return new /** @type {import('jsdom').DOMWindow} */win.XMLSerializer().serializeToString(ret);
};

/**
 *
 * @param {JamilihArray} args
 * @returns {string}
 */
jml.toXMLDOMString = function (...args) {
  // Alias for jml.toXML for parity with jml.toJMLString
  return jml.toXML(...args);
};

/**
 * Element-aware wrapper for `Map`.
 */
class JamilihMap extends Map {
  /**
   * @param {?(string|HTMLElement)} element
   * @returns {ArbitraryValue}
   */
  get(element) {
    const elem = typeof element === 'string' ? $(element) : element;
    return super.get.call(this, elem);
  }
  /**
   * @param {string|HTMLElement} element
   * @param {ArbitraryValue} value
   * @returns {ArbitraryValue}
   */
  set(element, value) {
    const elem = typeof element === 'string' ? $(element) : element;
    return super.set.call(this, elem, value);
  }
  /**
   * @param {string|HTMLElement} element
   * @param {string} methodName
   * @param {...ArbitraryValue} args
   * @returns {ArbitraryValue}
   */
  invoke(element, methodName, ...args) {
    const elem = typeof element === 'string' ? $(element) : element;
    return this.get(elem)[methodName](elem, ...args);
  }
}

/**
 * Element-aware wrapper for `WeakMap`.
 * @extends {WeakMap<any>}
 */
class JamilihWeakMap extends WeakMap {
  /**
   * @param {HTMLElement} element
   * @returns {ArbitraryValue}
   */
  get(element) {
    const elem = typeof element === 'string' ? $(element) : element;
    if (!elem) {
      throw new Error("Can't find the element");
    }
    return super.get.call(this, elem);
  }
  /**
   * @param {HTMLElement} element
   * @param {ArbitraryValue} value
   * @returns {ArbitraryValue}
   */
  set(element, value) {
    const elem = typeof element === 'string' ? $(element) : element;
    if (!elem) {
      throw new Error("Can't find the element");
    }
    return super.set.call(this, elem, value);
  }
  /**
   * @param {string|HTMLElement} element
   * @param {string} methodName
   * @param {...ArbitraryValue} args
   * @returns {ArbitraryValue}
   */
  invoke(element, methodName, ...args) {
    const elem = typeof element === 'string' ? $(element) : element;
    if (!elem) {
      throw new Error("Can't find the element");
    }
    return this.get(elem)[methodName](elem, ...args);
  }
}
jml.Map = JamilihMap;
jml.WeakMap = JamilihWeakMap;

/**
 * @typedef {[JamilihWeakMap|JamilihMap, HTMLElement]} MapAndElementArray
 */

/**
 * @param {{[key: string]: any}} obj
 * @param {JamilihArrayPostOptions} args
 * @returns {MapAndElementArray}
 */
jml.weak = function (obj, ...args) {
  const map = new JamilihWeakMap();
  const elem = jml({
    $map: [map, obj]
  }, ...args);
  return [map, /** @type {HTMLElement} */elem];
};

/**
 * @param {ArbitraryValue} obj
 * @param {JamilihArrayPostOptions} args
 * @returns {MapAndElementArray}
 */
jml.strong = function (obj, ...args) {
  const map = new JamilihMap();
  const elem = jml({
    $map: [map, obj]
  }, ...args);
  return [map, /** @type {HTMLElement} */elem];
};

/**
 * @param {string|HTMLElement} element If a string, will be interpreted as a selector
 * @param {symbol|string} sym If a string, will be used with `Symbol.for`
 * @returns {ArbitraryValue} The value associated with the symbol
 */
jml.symbol = jml.sym = jml.for = function (element, sym) {
  const elem = typeof element === 'string' ? $(element) : element;

  // @ts-expect-error Should be ok
  return elem[typeof sym === 'symbol' ? sym : Symbol.for(sym)];
};

/**
 * @typedef {((elem: HTMLElement, ...args: any[]) => void)|{[key: string]: (elem: HTMLElement, ...args: any[]) => void}} MapCommand
 */

/**
 * @param {?(string|HTMLElement)} elem If a string, will be interpreted as a selector
 * @param {symbol|string|Map<HTMLElement, MapCommand>|WeakMap<HTMLElement, MapCommand>} symOrMap If a string, will be used with `Symbol.for`
 * @param {string|any} methodName Can be `any` if the symbol or map directly
 *   points to a function (it is then used as the first argument).
 * @param {ArbitraryValue[]} args
 * @returns {ArbitraryValue}
 */
jml.command = function (elem, symOrMap, methodName, ...args) {
  elem = typeof elem === 'string' ? $(elem) : elem;
  if (!elem) {
    throw new Error('No element found');
  }
  let func;
  if (['symbol', 'string'].includes(typeof symOrMap)) {
    func = jml.sym(elem, /** @type {symbol|string} */symOrMap);
    if (typeof func === 'function') {
      return func(methodName, ...args); // Already has `this` bound to `elem`
    }

    return func[methodName](...args);
  }
  func = /** @type {Map<HTMLElement, MapCommand>|WeakMap<HTMLElement, MapCommand>} */symOrMap.get(elem);
  if (!func) {
    throw new Error('No map found');
  }
  if (typeof func === 'function') {
    return func.call(elem, methodName, ...args);
  }
  return func[methodName](elem, ...args);
  // return func[methodName].call(elem, ...args);
};

/**
 * Expects properties `document`, `XMLSerializer`, and `DOMParser`.
 * Also updates `body` with `document.body`.
 * @param {import('jsdom').DOMWindow|HTMLWindow|undefined} wind
 * @returns {void}
 */
jml.setWindow = wind => {
  win = wind;
  doc = win?.document;
  if (doc && doc.body) {
    // eslint-disable-next-line prefer-destructuring -- Needed for typing
    body = /** @type {HTMLBodyElement} */doc.body;
  }
};

/**
 * @returns {import('jsdom').DOMWindow|HTMLWindow}
 */
jml.getWindow = () => {
  if (!win) {
    throw new Error('No window object set');
  }
  return win;
};

/**
 * Does not run Jamilih so can be further processed.
 * @param {ArbitraryValue[]} array
 * @param {ArbitraryValue} glu
 * @returns {ArbitraryValue[]}
 */
function glue(array, glu) {
  return [...array].reduce((arr, item) => {
    arr.push(item, glu);
    return arr;
  }, []).slice(0, -1);
}

/**
 * @type {HTMLBodyElement}
 */
let body; // eslint-disable-line import/no-mutable-exports

/* c8 ignore next 4 */
if (doc && doc.body) {
  // eslint-disable-next-line prefer-destructuring -- Needed for type
  body = /** @type {HTMLBodyElement} */doc.body;
}
const nbsp = '\u00A0'; // Very commonly needed in templates

export { $, $$, DOMException, body, jml as default, glue, jml, nbsp };
