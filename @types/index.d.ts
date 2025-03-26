/// <reference path="../src/drumee/core/socket/uploader.js" />

type service = {
  [key: string]: any;
  service: typeof SERVICE;
}

declare class BackboneModel extends CollectionView<model>{
  model: any | {
    attributes: NestedObject
  }
  mget(key: string): any;
  get(key: string): any;
  set(value: NestedObject | any): any;
  mset(key: string|NestedObject, value?: NestedObject): any;
}

declare class BaseLetcBox extends BackboneModel {
  [key: string]:any
  debug(...debug: any[]): CallableFunction;
  warn(...debug: any[]): void;
  declareHandlers(): void;
  triggerHandlers(params?:any): void;

  getPart(partName: string): any;
  getItemsByKind(kind: string): NestedObject;
  getBranch(sysPn: String): NestedObject;
  feed(template: any): void;
  onUiEvent(cmd: NestedObject, args: NestedObject): void;

  /** HTTP GET */
  fetchService(service: string, options:NestedObject): Promise;

  /** HTTP PUT */
  postService(service: string, options:NestedObject): Promise;

}


declare class LetcBox extends BaseLetcBox {
  constructor(...args: any);
  fig: { family: string; group: string; } | any
  parent: LetcBox | any | null;
  source: any;
  $el: JQuery<HTMLElement>;
  children: any;
  el: HTMLElement;
  _id: string | number;
  bindEvent(...eventName: string[]): void;
  onPartReady(child: any, pn: any): void;
  getPart(sys_pn: string): LetcBox;
  ensurePart(sys_pn: string): LetcBox;
  initialize(opt: {}): void;
  declareHandlers(): void;
  isDestroyed(): boolean | 0 | 1;
  destroy(): void;
}




interface CommonSklOptions {
  className?: string;
  debug?: string;
  sys_pn?: string;
  formItem?: string;
  state?: 0 | 1 | boolean;
  service?: string;
  uiHandler?: NestedObject | NestedObject[] | string;
  kidsOpt?: {
    active?: 0 | 1;
  };
  styleOpt?:{
    [key: string]:any
  }
  dataset?: object;
  value?: any;
  dataType?: 'object' | 'array';
  partHandler?: NestedObject;
  // [x: string]: any;
}

interface NoteOptions extends CommonSklOptions {
  content: string
}

interface BoxOptions extends CommonSklOptions {
  [key: string]:any
  kids?: Array<object>;
  radio?: string;
}



interface SkeletonType {
  Avatar: object;
  /**
   * To Create a Box
   * @see \`{@link https://letc.io/ }\`
   */
  Box: {
    /**
     * To Create horizontal Box
     * @param options Options for the Box
     * @see \`{@link https://letc.io/ }\`
     */
    X(options: BoxOptions): object;
    /**
     * To Create Vertical Box
     * @param options Options for the Box
     * @see \`{@link https://letc.io/ }\`
     */
    Y(options: BoxOptions): object;
    /**
     * To Create Grid Box
     * @param options Options for the Box
     * @see \`{@link https://letc.io/ }\`
     */
    G(options: BoxOptions): object;
  };
  Button: {
    Icon(options: object): object;
    Label(options: object): object;
    Svg(options: object): object;
  };
  Element(options: object): object;
  Factory(options: object): object;
  FileSelector(options: object): object;
  Entry(options: object): object;
  EntryBox(options: object): object;
  Image: {
    Smart(options: object): object;
    Svg(options: object): object;
  };
  List: {
    Scroll(options: object): object;
    Smart(options: object): object;
    Stream(options: object): object;
  };
  Messenger(options: object): object;
  /**
   * To Create a content or label or note 
   * @param options Options for the Note
   * @see \`{@link https://letc.io/ }\`
   */
  Note(options: NoteOptions): object;
  Progress(options: object): object;
  RichText(options: object): object;
  Stream(options: object): object;
  Switch(options: object): object;
  Switcher(options: object): object;
  Textarea(options: object): object;
  UserProfile(options: object): object;
  Wrapper: {
    X(options: object): object;
    Y(options: object): object;
  };
}


declare class window_manager extends LetcBox {
  isStream = 1 | string;
  isWindow = 1 | string;
  __content: LetcBox;
  _setSize(): void;
  setupInteract(): void;
  responsive(): void;
  updateInstance(instance: number | null): void;
};

/**
 * Collection of UI components
 * @see \`{@link https://letc.io/ }\`
 */
declare var Skeletons: SkeletonType;

/**
 * Collection of constant
 */
declare var _a: any;
declare var _e: any;
declare var SERVICE: NestedObject;
declare var _K: NestedObject;
declare var _t: NestedObject;

declare var Validator: NestedObject;
declare var Visitor: NestedObject;
declare var Organization: NestedObject;
declare var LOCALE: NestedObject;
declare var Wm: NestedObject;
declare var Utils: NestedObject;
declare var _c: any;
declare var RADIO_BROADCAST: any;
declare var _I: any;
declare var _ERR: any;
declare var _: Underscore;
declare var Preset: any;



declare namespace WPP {
  declare class Socket extends LetcBox {
    _url: string;
    _fire(eventName: string, e?: any, instance?: any): void;
  }

}
declare module "window/interact/singleton" {
  export =  window_manager
}

declare module "socket/uploader" {
  export =  __socket_uploader
}

declare module "libs/template/progress" {
  export =  any
}


interface String {
  underline(type: string): string;
}

interface File {
  isDirectory: boolean;
}

declare global {

}
